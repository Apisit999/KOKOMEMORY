/** Public release metadata. A release becomes downloadable only after production checks are complete. */
export type StudioRelease = { version: string; publishedAt: string; notes: string[]; windowsInstallerUrl: string; windowsSha256: string; macOSInstallerUrl?: string; checks: { checksumVerified: boolean; productionApiVerified: boolean; publicKeyVerified: boolean; installerLifecycleVerified: boolean; approved: boolean }; };
export function isDownloadableRelease(release: StudioRelease | null): release is StudioRelease {
  if (!release || !/^\d+\.\d+\.\d+$/.test(release.version) || !Number.isFinite(Date.parse(release.publishedAt)) || !/^[a-f0-9]{64}$/i.test(release.windowsSha256)) return false;
  try { const url = new URL(release.windowsInstallerUrl); if (url.protocol !== "https:" || url.username || url.password) return false; } catch { return false; }
  const checks = release.checks;
  return Boolean(checks?.checksumVerified && checks.productionApiVerified && checks.publicKeyVerified && checks.installerLifecycleVerified && checks.approved);
}
export const kokoStudioRelease: StudioRelease | null = null;
export const kokoStudioReleaseStatus = isDownloadableRelease(kokoStudioRelease) ? "available" : "not-ready";
