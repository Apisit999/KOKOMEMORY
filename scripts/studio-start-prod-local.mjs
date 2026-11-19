// Production build + start of the LOCAL demo stack, with X-Real-IP trusted like behind the real nginx (so each caller has its own rate-limit bucket).
// Usage: node scripts/studio-start-prod-local.mjs build   then   node scripts/studio-start-prod-local.mjs
import dotenv from "dotenv";
import { spawnSync, spawn } from "node:child_process";
const config = dotenv.config({ path: ".env.studio.local", quiet: true }).parsed;
if (config?.GCLOUD_PROJECT !== "demo-kokomemory-local" || config.STUDIO_ENV !== "local") throw new Error("Demo local environment required");
// Same as staging behind nginx: the client address comes from X-Real-IP, so each caller gets its own rate-limit bucket.
const env = { ...process.env, ...config, STUDIO_ISOLATED_BUILD: "true", STUDIO_TRUSTED_CLIENT_IP_HEADER: "x-real-ip" };
if (process.argv[2] === "build") { const r = spawnSync(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env, stdio: "inherit" }); process.exit(r.status ?? 1); }
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3040", "--hostname", "127.0.0.1"], { env, stdio: "inherit" });
child.on("exit", code => process.exit(code ?? 1));
