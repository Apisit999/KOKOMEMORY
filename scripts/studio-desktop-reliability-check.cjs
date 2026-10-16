// Run with Node 24+: node studio-desktop-reliability-check.cjs <desktop-root> [report.json]
// Uses only newly created temporary stores and kills only its own child processes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { fork, execFileSync } = require('node:child_process');
const { once } = require('node:events');

const fixtureBytes = Buffer.from('KOKO synthetic storage fixture; not a camera/decoder test');

async function child(desktopRoot, directory, boundary) {
  if (boundary === 'print-submission-interrupted') {
    const { PrintQueueStore } = require(path.join(desktopRoot, 'src/main/services/print-queue.ts'));
    const queue = new PrintQueueStore(directory);
    const job = queue.enqueue(Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]), {
      printerName: 'NONEXISTENT_TEST_PRINTER', paper: '4x6', landscape: true, copies: 1,
    });
    queue.update(job.id, 'printing');
    process.send({ jobId: job.id });
  } else if (boundary.startsWith('after-video-')) {
    const { VideoStore } = require(path.join(desktopRoot, 'src/main/services/video-store.ts'));
    const { CaptureSessionStore } = require(path.join(desktopRoot, 'src/main/services/capture-session-store.ts'));
    const videos = new VideoStore(path.join(directory, 'media')); videos.configure();
    const sessions = new CaptureSessionStore(path.join(directory, 'app-data'));
    const session = sessions.start(null, null);
    const bytes = Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]);
    const video = await videos.saveWebm(bytes, 640, 480, 5000, null, session.id);
    if (boundary !== 'after-video-before-session') sessions.addVideo(session.id, video.id);
    process.send({ sessionId: session.id, videoId: video.id });
  } else {
    const { PhotoStore } = require(path.join(desktopRoot, 'src/main/services/photo-store.ts'));
    const { CaptureSessionStore } = require(path.join(desktopRoot, 'src/main/services/capture-session-store.ts'));
    const photos = new PhotoStore(path.join(directory, 'media'));
    photos.configure();
    const sessions = new CaptureSessionStore(path.join(directory, 'app-data'));
    const session = sessions.start(null, null);
    const photo = await photos.saveJpeg(fixtureBytes, 1, 1, null, { sessionId: session.id, kind: 'photo' });
    if (boundary !== 'after-photo-before-session') sessions.addPhoto(session.id, photo.id);
    if (boundary === 'after-session-review') sessions.finish(session.id, 'review');
    process.send({ sessionId: session.id, photoId: photo.id });
  }
  // The parent waits for this exact boundary and then terminates this process.
  setInterval(() => {}, 1000);
}

async function stopAtBoundary(desktopRoot, directory, boundary) {
  const worker = fork(__filename, ['--child', desktopRoot, directory, boundary], {
    execPath: process.execPath, stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
  });
  let diagnostic = '';
  worker.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk).slice(-3000); });
  const exited = once(worker, 'exit');
  let timer;
  try {
    const checkpoint = await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Timed out before ' + boundary)), 15000);
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', () => reject(new Error('Child exited before checkpoint: ' + diagnostic)));
    });
    clearTimeout(timer);
    assert.equal(worker.kill('SIGKILL'), true, 'Could not terminate fixture worker');
    await exited;
    return checkpoint;
  } finally {
    clearTimeout(timer);
    if (worker.exitCode === null && worker.signalCode === null) {
      worker.kill('SIGKILL');
      await exited;
    }
  }
}

function removeFixture(directory) {
  const resolved = path.resolve(directory);
  const expectedParent = path.resolve(os.tmpdir());
  if (path.dirname(resolved) !== expectedParent || !path.basename(resolved).startsWith('koko-reliability-check-')) {
    throw new Error('Refusing cleanup outside the generated fixture directory');
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

async function main() {
  if (!process.argv[2]) throw new Error('Usage: node studio-desktop-reliability-check.cjs <desktop-root> [report.json]');
  const desktopRoot = path.resolve(process.argv[2]);
  const { PhotoStore } = require(path.join(desktopRoot, 'src/main/services/photo-store.ts'));
  const { CaptureSessionStore } = require(path.join(desktopRoot, 'src/main/services/capture-session-store.ts'));
  const { PrintQueueStore } = require(path.join(desktopRoot, 'src/main/services/print-queue.ts'));
  const { VideoStore } = require(path.join(desktopRoot, 'src/main/services/video-store.ts'));
  const results = [];
  for (const boundary of ['after-photo-before-session', 'after-session-link', 'after-session-review', 'after-video-before-session', 'after-video-session-link', 'print-submission-interrupted']) {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'koko-reliability-check-'));
    try {
      const checkpoint = await stopAtBoundary(desktopRoot, directory, boundary);
      if (boundary === 'print-submission-interrupted') {
        const job = new PrintQueueStore(directory).get(checkpoint.jobId);
        assert.ok(job, 'Print record must survive restart');
        const eligibleForAutomaticDrain = job.status === 'pending';
        results.push({ boundary, recoveredStatus: job.status, eligibleForAutomaticDrain,
          passed: !eligibleForAutomaticDrain,
          requirement: 'An uncertain submission must require review, not become eligible for automatic replay.' });
      } else if (boundary.startsWith('after-video-')) {
        const videos = new VideoStore(path.join(directory, 'media'));
        const sessions = new CaptureSessionStore(path.join(directory, 'app-data'));
        const recovery = sessions.recoverCaptureVideos(videos.captureAssociations());
        const saved = videos.read(checkpoint.videoId);
        const session = sessions.get(checkpoint.sessionId);
        const bytesPreserved = saved.bytes[0] === 0x1a && saved.bytes[1] === 0x45 && saved.bytes[2] === 0xdf && saved.bytes[3] === 0xa3;
        const linkedToSession = (session?.videoIds ?? []).includes(checkpoint.videoId);
        results.push({ boundary, bytesPreserved, linkedToSession, recoveredStatus: session?.status, recovery,
          passed: bytesPreserved && linkedToSession,
          requirement: 'Committed WebM media must remain readable and recover its original session association.' });
      } else {
        const photos = new PhotoStore(path.join(directory, 'media'));
        const sessions = new CaptureSessionStore(path.join(directory, 'app-data'));
        const recovery = sessions.recoverCapturePhotos(photos.captureAssociations());
        const saved = photos.readPhoto(checkpoint.photoId);
        const session = sessions.get(checkpoint.sessionId);
        assert.ok(session, 'Session record must survive restart');
        const bytesPreserved = Buffer.from(saved.bytes).equals(fixtureBytes);
        const linkedToSession = session.photoIds.includes(checkpoint.photoId);
        results.push({ boundary, bytesPreserved, linkedToSession, recoveredStatus: session.status, recovery,
          passed: bytesPreserved && linkedToSession,
          requirement: 'Committed media must remain readable and recover its original session association.' });
      }
    } finally { removeFixture(directory); }
  }
  const report = {
    checkedAt: new Date().toISOString(),
    desktopVersion: JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8')).version,
    desktopRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: desktopRoot, encoding: 'utf8' }).trim(),
    workingTreeDirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: desktopRoot, encoding: 'utf8' }).trim()),
    scope: 'Storage service processes with synthetic media. Not an installed Electron, real camera, power-loss, or real printer test. No print submission is performed.',
    acceptanceFailures: results.filter(result => !result.passed).length,
    results,
  };
  const reportPath = path.resolve(process.argv[3] ?? 'output/desktop-reliability-baseline.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  console.log('Report: ' + reportPath);
  process.exitCode = report.acceptanceFailures ? 2 : 0;
}

(process.argv[2] === '--child' ? child(...process.argv.slice(3)) : main()).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
