// Phone testing over the home Wi-Fi. Demo data only: Firebase emulators and the S3 mock stay on this PC.
// Needs .env.studio.lan (copy of .env.studio.local with this PC's private IP as origin) and the S3 mock started with S3_MOCK_HOST=0.0.0.0.
import dotenv from "dotenv";
import { spawn } from "node:child_process";
const config = dotenv.config({ path: ".env.studio.lan", quiet: true }).parsed;
if (!config || config.STUDIO_ENV !== "local" || config.GCLOUD_PROJECT !== "demo-kokomemory-local") throw new Error("Demo local configuration required");
const host = config.STUDIO_LAN_HOST ?? "";
if (!/^(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})$/.test(host)) throw new Error("STUDIO_LAN_HOST must be a private network address");
if (config.STUDIO_WEB_ORIGIN !== `http://${host}:3040`) throw new Error("STUDIO_WEB_ORIGIN must match the LAN address");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbopack", "-p", "3040", "--hostname", "0.0.0.0"], { env: { ...process.env, ...config, STUDIO_ISOLATED_BUILD: "true" }, stdio: "inherit" });
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", code => { process.exitCode = code ?? 1; });
