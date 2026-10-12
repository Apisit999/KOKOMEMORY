import { generateKeyPairSync } from "node:crypto";
import { writeFile, access } from "node:fs/promises";
const file = ".env.studio.local";
try { await access(file); throw new Error("Local config already exists; preserve it instead of overwriting"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = keys.privateKey.export({ type: "pkcs8", format: "pem" }).toString().replaceAll("\n", "\\n");
const publicPem = keys.publicKey.export({ type: "spki", format: "pem" }).toString();
const values = {
  STUDIO_ENV: "local", STUDIO_LICENSE_ENABLED: "true", STUDIO_WEB_ORIGIN: "http://127.0.0.1:3040", STUDIO_FIREBASE_PROJECT_ID: "demo-kokomemory-local", STUDIO_SIGNING_KEY_ID: "local-only-key", STUDIO_SIGNING_PRIVATE_KEY: pem, STUDIO_TRUSTED_PUBLIC_KEYS_JSON: JSON.stringify({ "local-only-key": publicPem }),
  GCLOUD_PROJECT: "demo-kokomemory-local", FIREBASE_PROJECT_ID: "demo-kokomemory-local", NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-kokomemory-local", NEXT_PUBLIC_FIREBASE_API_KEY: "demo-local-api-key", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "demo-kokomemory-local.firebaseapp.com", NEXT_PUBLIC_FIREBASE_APP_ID: "demo-local-app", NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-kokomemory-local.appspot.com", NEXT_PUBLIC_FIREBASE_USE_EMULATORS: "true", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099", FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
};
await writeFile(file, Object.entries(values).map(([key, value]) => `${key}='${value}'`).join("\n") + "\n", { flag: "wx", mode: 0o600 });
console.log("Created ignored demo-only local config. Private key contents are not printed.");
