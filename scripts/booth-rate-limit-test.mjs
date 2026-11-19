// Real-stack check of the booth rate limits (per device 60/min/path, per address 600/min/path), against the LOCAL demo stack
// started with scripts/studio-start-prod-local.mjs (X-Real-IP trusted). Usage: node scripts/booth-rate-limit-test.mjs
import { call, createBooth, createEvent, ORIGIN, PRODUCT, samplePhoto, uploadSession } from "./loadtest-lib.mjs";

const wait = ms => new Promise(r => setTimeout(r, ms));
// Counters reset each minute, so every scenario starts right after a minute boundary.
const nextMinute = async () => { const s = new Date().getSeconds(); await wait(((60 - s) % 60 || 60) * 1000 + 300); };
const results = []; const check = (name, ok, detail) => { results.push({ name, ok, detail }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };

console.log("Creating 12 booths…");
// Linking a booth to an account is limited to 10 a minute per account, so creation waits a minute when it hits that.
const booths = []; while (booths.length < 12) { try { booths.push(await createBooth()); } catch (e) { if (!/429/.test(e.message)) throw e; console.log("  account-link limit, waiting for next minute…"); await nextMinute(); } }
const eventId = await createEvent(booths[0], "Rate limit test");
const photo = await samplePhoto();
const init = (booth, ip) => call("POST", `${ORIGIN}/v1/desktop/cloud/photos/init`, { body: { eventId, photoId: [...crypto.getRandomValues(new Uint8Array(16))].map(b => b.toString(16).padStart(2, "0")).join(""), size: 10, sha256: "0".repeat(64), deviceId: booth.deviceId, productId: PRODUCT, entitlement: booth.entitlement }, ip });

// 1. Real event: 5 booths on ONE venue address, each 10 rounds x 3 photos inside one minute (old limit: 30 photo starts/min for the whole address).
await nextMinute();
{
  const started = Date.now();
  const runs = await Promise.all(booths.slice(0, 5).map(async booth => { const out = []; for (let s = 0; s < 10; s++) out.push(await uploadSession(booth, { eventId, photo, photos: 3, ip: "10.50.0.1" })); return out; }));
  const all = runs.flat(); const failures = all.flatMap(r => r.failures);
  const photos = all.filter(r => r.done).length * 3;
  check("5 booths behind one address, 150 photos in one minute", failures.length === 0 && photos === 150, `${photos}/150 photos, ${failures.length} failures ${JSON.stringify(failures.slice(0, 3))}, ${((Date.now() - started) / 1000).toFixed(1)} s`);
}

// 2. One device cannot exceed 60 photo starts a minute; another booth on the same address is unaffected.
await nextMinute();
{
  const statuses = []; for (let i = 0; i < 70; i++) statuses.push((await init(booths[5], "10.50.0.2")).status);
  const refused = statuses.filter(s => s === 429).length, firstRefused = statuses.indexOf(429) + 1;
  check("one device: call 61 onward refused", refused === 10 && firstRefused === 61, `refused ${refused}, first refused call #${firstRefused}, other statuses ${[...new Set(statuses.filter(s => s !== 429))]}`);
  const other = (await init(booths[6], "10.50.0.2")).status;
  check("other booth on same address still served", other === 200, `status ${other}`);
}

// 3. All booths on one address together stop at 600 a minute (12 booths x 55 = 660 calls).
await nextMinute();
{
  const statuses = (await Promise.all(booths.map(async booth => { const out = []; for (let i = 0; i < 55; i++) out.push((await init(booth, "10.50.0.3")).status); return out; }))).flat();
  const refused = statuses.filter(s => s === 429).length;
  check("one address: 600 a minute in total", refused === 60, `${statuses.length} calls, refused ${refused}, ok ${statuses.filter(s => s === 200).length}`);
}

// 4. Retry-After header is sent on 429.
{
  const r = await fetch(`${ORIGIN}/v1/desktop/cloud/photos/init`, { method: "POST", headers: { "content-type": "application/json", "x-real-ip": "10.50.0.3" }, body: JSON.stringify({ deviceId: booths[0].deviceId }) });
  check("429 carries Retry-After", r.status === 429 && r.headers.get("retry-after") === "60", `status ${r.status}, Retry-After ${r.headers.get("retry-after")}`);
}
console.log(`\n${results.filter(r => r.ok).length}/${results.length} passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
