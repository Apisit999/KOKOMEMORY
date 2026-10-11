import dotenv from "dotenv";
import { spawn } from "node:child_process";
const config = dotenv.config({ path: ".env.studio.local", quiet: true }).parsed;
if (!config || config.STUDIO_ENV !== "local" || config.GCLOUD_PROJECT !== "demo-kokomemory-local") throw new Error("Generate the isolated demo local configuration first");
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--turbopack", "-p", "3040", "--hostname", "127.0.0.1"], { env: { ...process.env, ...config, STUDIO_ISOLATED_BUILD: "true" }, stdio: "inherit" });
process.on("SIGINT", () => child.kill("SIGINT"));
child.on("exit", code => { process.exitCode = code ?? 1; });
