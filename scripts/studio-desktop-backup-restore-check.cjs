// Run with Node 24+: node studio-desktop-backup-restore-check.cjs <desktop-root> [report.json]
// Exercises a synthetic, closed-store backup and restore without touching user data.
const assert = require('node:assert/strict');
const { createHash, randomUUID } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

function sha256(bytes) { return createHash('sha256').update(bytes).digest('hex'); }

function filesUnder(root) {
  const result = {};
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const file = path.join(root, entry.name);
    if (entry.isDirectory()) Object.assign(result, filesUnder(file));
    else if (entry.isFile()) result[path.relative(root, file).replaceAll(path.sep, '/')] = sha256(fs.readFileSync(file));
    else throw new Error('Unexpected non-file in backup fixture: ' + file);
  }
  return result;
}

async function main() {
  if (!process.argv[2]) throw new Error('Usage: node studio-desktop-backup-restore-check.cjs <desktop-root> [report.json]');
  const desktopRoot = path.resolve(process.argv[2]);
  const { PhotoStore } = require(path.join(desktopRoot, 'src/main/services/photo-store.ts'));
  const { VideoStore } = require(path.join(desktopRoot, 'src/main/services/video-store.ts'));
  const { CaptureSessionStore, validateCaptureTemplate } = require(path.join(desktopRoot, 'src/main/services/capture-session-store.ts'));
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'koko-backup-restore-check-'));
  try {
    const source = path.join(fixture, 'source');
    const media = path.join(source, 'media');
    const appData = path.join(source, 'app-data');
    fs.mkdirSync(media, { recursive: true }); fs.mkdirSync(appData, { recursive: true });
    const photos = new PhotoStore(media); photos.configure();
    const videos = new VideoStore(media); videos.configure();
    const sessions = new CaptureSessionStore(appData);
    const eventId = randomUUID();
    const template = validateCaptureTemplate({ id: 'backup-fixture', name: 'Backup fixture', count: 1, title: 'KOKO', footer: 'Test', background: '#101010', frame: '#ffffff', showDate: false });
    const session = sessions.start(eventId, template);
    const sourcePhoto = await photos.saveJpeg(Buffer.from('synthetic source photo'), 640, 480, eventId, { sessionId: session.id, kind: 'photo' });
    sessions.addPhoto(session.id, sourcePhoto.id);
    const composition = await photos.saveJpeg(Buffer.from('synthetic composed photo'), 640, 480, eventId, { sessionId: session.id, kind: 'composition' });
    const sourceVideo = await videos.saveWebm(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 1, 2, 3, 4]), 640, 480, 5_000, eventId, session.id);
    sessions.addVideo(session.id, sourceVideo.id);
    sessions.finish(session.id, 'review');
    sessions.attachComposition(session.id, composition.id);
    const settings = { schemaVersion: 1, theme: 'classic', captureMode: 'photo-video' };
    fs.writeFileSync(path.join(appData, 'backup-fixture-settings.json'), JSON.stringify(settings));

    const backup = path.join(fixture, 'backup'); fs.mkdirSync(backup);
    fs.cpSync(media, path.join(backup, 'media'), { recursive: true, errorOnExist: true });
    fs.cpSync(appData, path.join(backup, 'app-data'), { recursive: true, errorOnExist: true });
    const sourceHashes = { media: filesUnder(media), appData: filesUnder(appData) };
    const restored = path.join(fixture, 'restored'); fs.mkdirSync(restored);
    fs.cpSync(path.join(backup, 'media'), path.join(restored, 'media'), { recursive: true });
    fs.cpSync(path.join(backup, 'app-data'), path.join(restored, 'app-data'), { recursive: true });
    const restoredHashes = { media: filesUnder(path.join(restored, 'media')), appData: filesUnder(path.join(restored, 'app-data')) };
    assert.deepEqual(restoredHashes, sourceHashes, 'All backed up bytes must match after restore');

    const restoredPhotos = new PhotoStore(path.join(restored, 'media'));
    const restoredVideos = new VideoStore(path.join(restored, 'media'));
    const restoredSessions = new CaptureSessionStore(path.join(restored, 'app-data'));
    const recoveredSession = restoredSessions.get(session.id);
    assert.ok(recoveredSession, 'Capture session must survive restore');
    assert.equal(recoveredSession.status, 'review');
    assert.equal(recoveredSession.eventId, eventId);
    assert.deepEqual(recoveredSession.photoIds, [sourcePhoto.id]);
    assert.equal(recoveredSession.compositionPhotoId, composition.id);
    assert.deepEqual(recoveredSession.videoIds, [sourceVideo.id]);
    assert.deepEqual(recoveredSession.template, template);
    assert.equal(restoredPhotos.readPhoto(sourcePhoto.id).photo.sha256, sourcePhoto.sha256);
    assert.equal(restoredPhotos.readPhoto(composition.id).photo.sha256, composition.sha256);
    assert.equal(restoredVideos.read(sourceVideo.id).video.sha256, sourceVideo.sha256);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(restored, 'app-data', 'backup-fixture-settings.json'), 'utf8')), settings);

    const incomplete = path.join(fixture, 'incomplete'); fs.mkdirSync(incomplete);
    fs.cpSync(path.join(backup, 'media'), path.join(incomplete, 'media'), { recursive: true });
    const incompleteDetected = !fs.existsSync(path.join(incomplete, 'app-data'));
    assert.equal(incompleteDetected, true, 'A media-only backup must be distinguishable from the paired backup');

    const report = {
      checkedAt: new Date().toISOString(),
      desktopVersion: JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8')).version,
      scope: 'Synthetic media and app-data fixture copied as a closed pair; no user files or installed app were accessed.',
      filesVerified: Object.values(sourceHashes).reduce((count, group) => count + Object.keys(group).length, 0),
      hashesMatch: true,
      sessionAndMediaRelationshipsMatch: true,
      templateAndSettingsMatch: true,
      incompleteMediaOnlySetDetected: incompleteDetected,
      passed: true,
    };
    const reportPath = path.resolve(process.argv[3] ?? 'output/desktop-backup-restore-current.json');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2)); console.log('Report: ' + reportPath);
  } finally {
    const resolved = path.resolve(fixture);
    if (path.dirname(resolved) !== path.resolve(os.tmpdir()) || !path.basename(resolved).startsWith('koko-backup-restore-check-')) throw new Error('Refusing cleanup outside generated fixture');
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
