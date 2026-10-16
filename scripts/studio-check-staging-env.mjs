import { createPrivateKey, createPublicKey } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

const file = resolve(process.argv[2] ?? ".env.staging");
const errors = [];
let source;
let mode;

try {
  source = readFileSync(file, "utf8");
  mode = statSync(file).mode;
} catch {
  console.error("Cannot read the staging environment file.");
  process.exit(1);
}

if (process.platform !== "win32" && (mode & 0o077) !== 0) {
  errors.push("File permissions must be owner-only (chmod 600).");
}

const seen = new Set();
for (const [index, line] of source.split(/\r?\n/).entries()) {
  if (!line.trim() || /^\s*#/.test(line)) continue;
  const match = line.match(/^([A-Z][A-Z0-9_]*)\s*=/);
  if (!match) {
    errors.push(`Invalid assignment on line ${index + 1}.`);
    continue;
  }
  if (seen.has(match[1])) errors.push(`Duplicate variable: ${match[1]}.`);
  seen.add(match[1]);
}

let env = {};
try {
  env = parseEnv(source);
} catch {
  errors.push("The environment file cannot be parsed.");
}

const required = [
  "STUDIO_ENV",
  "STUDIO_LICENSE_ENABLED",
  "STUDIO_WEB_ORIGIN",
  "STUDIO_FIREBASE_PROJECT_ID",
  "STUDIO_SIGNING_KEY_ID",
  "STUDIO_SIGNING_PRIVATE_KEY",
  "STUDIO_TRUSTED_PUBLIC_KEYS_JSON",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_R2_PUBLIC_URL",
  "GCLOUD_PROJECT",
  "FIREBASE_PROJECT_ID",
  "FIREBASE_CLIENT_EMAIL",
  "FIREBASE_PRIVATE_KEY",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_PRIVATE_BUCKET_NAME",
  "R2_PUBLIC_URL",
];

for (const name of required) {
  if (!env[name]?.trim()) errors.push(`Missing value: ${name}.`);
}

if (env.STUDIO_ENV && env.STUDIO_ENV !== "staging") errors.push("STUDIO_ENV must be staging.");
if (env.NEXT_PUBLIC_FIREBASE_USE_EMULATORS !== "false") {
  errors.push("NEXT_PUBLIC_FIREBASE_USE_EMULATORS must be false.");
}
if (env.STUDIO_LICENSE_ENABLED && !["true", "false"].includes(env.STUDIO_LICENSE_ENABLED)) {
  errors.push("STUDIO_LICENSE_ENABLED must be true or false.");
}

function checkUrl(name, originOnly = false) {
  if (!env[name]) return;
  try {
    const url = new URL(env[name]);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
        (originOnly && url.origin !== env[name])) throw new Error("invalid");
  } catch {
    errors.push(`${name} must be a clean HTTPS URL.`);
  }
}

for (const name of ["STUDIO_WEB_ORIGIN", "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_SITE_URL"]) {
  checkUrl(name, true);
}
for (const name of ["NEXT_PUBLIC_R2_PUBLIC_URL", "R2_PUBLIC_URL"]) checkUrl(name);

if (env.STUDIO_WEB_ORIGIN &&
    (env.STUDIO_WEB_ORIGIN !== env.NEXT_PUBLIC_APP_URL ||
     env.STUDIO_WEB_ORIGIN !== env.NEXT_PUBLIC_SITE_URL)) {
  errors.push("The Studio and public site origins must match.");
}
if (env.STUDIO_FIREBASE_PROJECT_ID &&
    [env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, env.FIREBASE_PROJECT_ID, env.GCLOUD_PROJECT]
      .some(value => value !== env.STUDIO_FIREBASE_PROJECT_ID)) {
  errors.push("The Firebase project IDs must match.");
}

for (const name of ["R2_BUCKET_NAME", "R2_PRIVATE_BUCKET_NAME"]) {
  if (env[name] && !/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(env[name])) {
    errors.push(`${name} is not a valid bucket name.`);
  }
}

function pem(name) {
  if (!env[name]) return null;
  try {
    return createPrivateKey(env[name].replaceAll("\\n", "\n"));
  } catch {
    errors.push(`${name} is not a valid private key.`);
    return null;
  }
}

const signingKey = pem("STUDIO_SIGNING_PRIVATE_KEY");
pem("FIREBASE_PRIVATE_KEY");
if (env.STUDIO_TRUSTED_PUBLIC_KEYS_JSON) {
  try {
    const keys = JSON.parse(env.STUDIO_TRUSTED_PUBLIC_KEYS_JSON);
    const publicPem = keys?.[env.STUDIO_SIGNING_KEY_ID];
    if (typeof publicPem !== "string") throw new Error("missing key");
    const trusted = createPublicKey(publicPem.replaceAll("\\n", "\n"))
      .export({ type: "spki", format: "der" });
    if (signingKey) {
      const expected = createPublicKey(signingKey).export({ type: "spki", format: "der" });
      if (!trusted.equals(expected)) errors.push("The signing key does not match the trusted public key.");
    }
  } catch {
    errors.push("STUDIO_TRUSTED_PUBLIC_KEYS_JSON is invalid or lacks the active key ID.");
  }
}

if (errors.length) {
  for (const error of errors) console.error(error);
  process.exitCode = 1;
} else {
  console.log("Staging environment structure is valid. Remote credentials were not verified.");
}

