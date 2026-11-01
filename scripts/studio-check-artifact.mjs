import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const directory = path.resolve(process.argv[2] ?? "");
if (!process.argv[2]) throw new Error("Usage: node scripts/studio-check-artifact.mjs <release-directory>");
const manifest = await readFile(path.join(directory, "SHA256SUMS.txt"), "utf8");
const results = [];
for (const line of manifest.split(/\r?\n/).filter(line => line.trim())) {
  const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
  if (!match || path.basename(match[2]) !== match[2]) throw new Error("Invalid checksum manifest");
  const file = path.join(directory, match[2]); const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const sha256 = hash.digest("hex"); const info = await stat(file);
  results.push({ fileName: match[2], bytes: info.size, sha256, matches: sha256 === match[1].toLowerCase() });
}
console.log(JSON.stringify({ artifacts: results, approvedForPublication: false }, null, 2));
if (!results.length || results.some(result => !result.matches)) process.exitCode = 1;
