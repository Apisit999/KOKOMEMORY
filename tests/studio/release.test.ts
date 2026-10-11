import test from "node:test";
import assert from "node:assert/strict";
import { isDownloadableRelease, kokoStudioRelease, type StudioRelease } from "../../src/data/koko-studio-release.ts";
test("download gate rejects unpublished, incomplete, insecure or unverified releases", () => {
  assert.equal(isDownloadableRelease(kokoStudioRelease), false);
  const checked: StudioRelease = { version: "0.1.28", publishedAt: "2026-10-11T00:00:00Z", notes: ["Test fixture only"], windowsInstallerUrl: "https://downloads.example.invalid/setup.exe", windowsSha256: "a".repeat(64), checks: { checksumVerified: true, productionApiVerified: true, publicKeyVerified: true, installerLifecycleVerified: true, approved: true } };
  assert.equal(isDownloadableRelease(checked), true);
  for (const field of Object.keys(checked.checks) as (keyof StudioRelease["checks"])[]) assert.equal(isDownloadableRelease({ ...checked, checks: { ...checked.checks, [field]: false } }), false);
  assert.equal(isDownloadableRelease({ ...checked, windowsInstallerUrl: "http://downloads.example.invalid/setup.exe" }), false);
  assert.equal(isDownloadableRelease({ ...checked, windowsSha256: "wrong" }), false);
});
