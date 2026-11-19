// Rehearsal of the monitoring on the LOCAL demo stack: make parts of the system hang (not crash: the worst case for a watcher),
// run scripts/monitor.mjs the way cron would, and check that the right alerts arrive, once, and that recovery is announced.
// Needs the demo stack (Auth + Firestore emulators, S3 mock, Studio site started WITH STUDIO_MONITOR_TOKEN set).
// Usage: STUDIO_MONITOR_TOKEN=<same value> node scripts/monitor-drill.mjs
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import sharp from "sharp";
import { createBooth, createEvent, ORIGIN, uploadSession } from "./loadtest-lib.mjs";

const token = process.env.STUDIO_MONITOR_TOKEN;
if (!token || token.length < 32) { console.error("Set STUDIO_MONITOR_TOKEN to the value the site was started with."); process.exit(2); }

// A canary: a real guest link with one photo, like the one an operator would keep for the watcher.
const booth = await createBooth();
const eventId = await createEvent(booth, "Monitoring canary");
const photo = await sharp({ create: { width: 800, height: 600, channels: 3, noise: { type: "gaussian", mean: 128, sigma: 40 } } }).jpeg().toBuffer();
const round = await uploadSession(booth, { eventId, photo, photos: 1, ip: "10.99.0.1" });
if (!round.done) throw new Error("could not create the canary round");
const canaryUrl = `${ORIGIN}/s/${round.token}`;

// Where alerts are delivered (stands in for Discord / Slack / LINE bridge).
const received = [];
let webhookUp = true;
const hook = createServer((req, res) => { let body = ""; req.on("data", c => body += c); req.on("end", () => { if (!webhookUp) { res.writeHead(503); return res.end(); } received.push(JSON.parse(body)); res.writeHead(200); res.end("ok"); }); });
await new Promise(r => hook.listen(0, "127.0.0.1", r));

const stateFile = path.join(mkdtempSync(path.join(tmpdir(), "koko-monitor-")), "state.json");
const monitorEnv = { ...process.env, MONITOR_SITE_URL: ORIGIN, MONITOR_TOKEN: token, MONITOR_CANARY_URL: canaryUrl, MONITOR_WEBHOOK_URL: `http://127.0.0.1:${hook.address().port}/alert`, MONITOR_STATE_FILE: stateFile, MONITOR_TIMEOUT_MS: "6000" };
// Asynchronous on purpose: this process also hosts the fake alert receiver, which must keep answering while the watcher runs.
const round1 = () => new Promise(resolve => {
  const t = performance.now(); const child = spawn(process.execPath, ["scripts/monitor.mjs"], { env: monitorEnv }); let out = "";
  child.stdout.on("data", d => out += d); child.stderr.on("data", d => out += d);
  child.on("close", code => resolve({ code, seconds: ((performance.now() - t) / 1000).toFixed(1), lines: out.split("\n").filter(l => l && !/MetadataLookup|trace-warnings|Reparsing|eliminate this warning|MODULE_TYPELESS/.test(l)) }));
});

// Pausing a process (instead of killing it) keeps its data and makes it "hang": no answer and no error.
const ps = script => spawnSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8" });
const pidOf = pattern => { const r = ps(`(Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match '${pattern}' -and $_.Name -match 'node|java' } | Select-Object -First 1).ProcessId`); return Number(r.stdout.trim()); };
const NT = `Add-Type -Namespace W -Name N -MemberDefinition '[DllImport("ntdll.dll")] public static extern int NtSuspendProcess(System.IntPtr h); [DllImport("ntdll.dll")] public static extern int NtResumeProcess(System.IntPtr h);'`;
const pause = (pid, on) => ps(`${NT}; $p = [System.Diagnostics.Process]::GetProcessById(${pid}); if (${on ? "$true" : "$false"}) { [W.N]::NtSuspendProcess($p.Handle) | Out-Null } else { [W.N]::NtResumeProcess($p.Handle) | Out-Null }`);
const targets = { "photo storage": pidOf("local-s3-mock"), "database": pidOf("cloud-firestore-emulator"), "the website": Number(ps("(Get-NetTCPConnection -LocalPort 3040 -State Listen | Select-Object -First 1).OwningProcess").stdout.trim()) };
console.log("processes found:", JSON.stringify(targets));
if (Object.values(targets).some(p => !p)) throw new Error("could not find all processes to pause");

const steps = []; let step = 0;
const check = (name, ok, detail = "") => { steps.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  — " + detail : ""}`); };
const titles = list => list.map(n => `${n.kind}:${n.id}`).join(", ") || "(none)";
// "The site is slow" legitimately lingers for the 5-minute window after a freeze; it is not what these steps are about.
const take = () => received.splice(0, received.length).filter(n => n.id !== "slow-responses");
const quiet = () => received.filter(n => n.id !== "slow-responses").length === 0;
async function rounds(count) { for (let i = 0; i < count; i++) { const r = await round1(); console.log(`   round ${++step} (${r.seconds} s, exit ${r.code}): ${r.lines[r.lines.length - 1]?.slice(0, 160)}`); } }

// 1. Healthy: nothing to say.
await rounds(3);
check("healthy site: three rounds, no alert at all", quiet(), titles(received));

// 2. Each part hangs in turn.
for (const [part, expectedId, minimumKinds] of [["photo storage", "check-storage", ["check-storage", "guest-page"]], ["database", "check-database", ["check-database"]], ["the website", "site-down", ["site-down"]]]) {
  console.log(`\n== ${part} stops answering`);
  pause(targets[part], true);
  await rounds(1);
  check(`one bad round is not an alert yet`, quiet(), titles(received));
  await rounds(3);
  const firing = take();
  check(`${part}: the right alert opened (${minimumKinds.join(" + ")}), once each`, minimumKinds.every(id => firing.filter(n => n.id === id && n.kind === "firing").length === 1), titles(firing));
  check(`${part}: no repeated messages while it stays broken`, firing.filter(n => n.kind === "firing").length === new Set(firing.map(n => n.id)).size);
  pause(targets[part], false);
  await new Promise(r => setTimeout(r, 2500));
  await rounds(1);
  check(`${part}: back up, but one good round is not yet "fixed"`, quiet(), titles(received));
  await rounds(2);
  const fixed = take();
  check(`${part}: recovery announced`, fixed.some(n => n.kind === "resolved" && n.id === expectedId), titles(fixed));
  await rounds(1);
  check(`${part}: quiet again afterwards`, quiet(), titles(received));
}

// 3. A dead delivery channel must not break the watcher or hide the alert.
console.log("\n== alert channel down while the storage is stuck");
pause(targets["photo storage"], true); webhookUp = false;
await rounds(2);
const lines = await round1();
check("watcher keeps running and logs the alert even though the webhook answers 503", lines.lines.some(l => /ALERT|WARNING/.test(l) || /could not deliver/.test(l)) || lines.code === 1, lines.lines.slice(-3).join(" | ").slice(0, 200));
webhookUp = true; pause(targets["photo storage"], false); await new Promise(r => setTimeout(r, 2500));
await rounds(2);

console.log(`\n${steps.every(Boolean) ? "All" : steps.filter(Boolean).length + " of"} ${steps.length} checks passed.`);
hook.close();
process.exit(steps.every(Boolean) ? 0 : 1);
