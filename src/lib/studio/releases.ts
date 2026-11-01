import { randomUUID } from "node:crypto";
import { hash } from "./crypto.ts";
import { emptyStats, freeLicenseId, type Input } from "./service.ts";
import { isDownloadableRelease, type StudioRelease } from "../../data/koko-studio-release.ts";
import { StudioError, type License, type ReleaseChecks, type ReleaseRecord, type PublicRelease, type ReleaseStorage, type StatsDaily, type Store } from "./types.ts";

const SEMVER = /^\d+\.\d+\.\d+$/;
const CHANNELS = ["stable", "beta"] as const;
type Channel = (typeof CHANNELS)[number];
const iso = (time: number) => new Date(time).toISOString();
const versionKey = (version: string) => version.replace(/\./g, "_");
export function compareVersions(a: string, b: string) {
  const left = a.split(".").map(Number), right = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return left[i] > right[i] ? 1 : -1;
  return 0;
}
function version(value: unknown) {
  if (typeof value !== "string" || !SEMVER.test(value) || value.length > 20) throw new StudioError("invalid_request");
  return value;
}
function channel(value: unknown, fallback: Channel = "stable"): Channel {
  if (value === undefined || value === null || value === "") return fallback;
  if (!CHANNELS.includes(value as Channel)) throw new StudioError("invalid_request");
  return value as Channel;
}
export const releaseFileKey = (v: string) => `releases/windows/${v}/KOKO-Studio-Setup-${v}.exe`;
export function uaFamily(ua: string) {
  const os = /Windows NT 10/.test(ua) ? "Windows 10/11" : /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  return `${os}/${browser}`;
}
type Meta = { ip: string; userAgent: string; referrer: string; utm: Record<string, string> };
type Options = { store: Store; storage: ReleaseStorage; downloadBaseUrl: string; origin: string; salt: string; now?: () => number };

export class ReleaseService {
  private store: Store;
  private storage: ReleaseStorage;
  private base: string;
  private origin: string;
  private salt: string;
  private now: () => number;
  constructor(options: Options) {
    this.store = options.store; this.storage = options.storage; this.base = options.downloadBaseUrl.replace(/\/+$/, "");
    this.origin = options.origin.replace(/\/+$/, ""); this.salt = options.salt; this.now = options.now ?? Date.now;
  }
  private fileUrl(release: ReleaseRecord) { return `${this.base}/${release.fileKey}`; }
  /** Same gate as the static page helper, so the website and API can never disagree. */
  private downloadable(release: ReleaseRecord) {
    if (release.status !== "published" || !release.publishedAt || !this.base) return false;
    const view: StudioRelease = { version: release.version, publishedAt: release.publishedAt, notes: release.notes, windowsInstallerUrl: this.fileUrl(release), windowsSha256: release.sha256, checks: release.checks };
    return isDownloadableRelease(view);
  }
  private async published(wanted: Channel) {
    const all = await this.store.list<ReleaseRecord>("studioReleases", { field: "status", value: "published" }, 100);
    return all.filter(r => (wanted === "beta" ? true : r.channel === "stable") && this.downloadable(r)).sort((a, b) => compareVersions(b.version, a.version));
  }
  private publicView(release: ReleaseRecord): PublicRelease {
    return { version: release.version, channel: release.channel, publishedAt: release.publishedAt, notes: release.notes, fileSize: release.fileSize, sha256: release.sha256, platform: release.platform, minimumSupportedVersion: release.minimumSupportedVersion, downloadUrl: `${this.origin}/api/studio/download?version=${release.version}${release.channel === "stable" ? "" : `&channel=${release.channel}`}` };
  }
  async latest(input: { channel?: unknown }) {
    const [release] = await this.published(channel(input.channel));
    return { release: release ? this.publicView(release) : null };
  }
  /** Resolves a downloadable release, records the download, and returns the immutable file URL. */
  async download(input: { channel?: unknown; version?: unknown }, meta: Meta) {
    const wanted = input.version ? version(input.version) : null;
    const candidates = await this.published(channel(input.channel));
    const release = wanted ? candidates.find(r => r.version === wanted) : candidates[0];
    if (!release) throw new StudioError("release_unavailable", 404);
    const day = iso(this.now()).slice(0, 10);
    const ipHash = hash(`${meta.ip}:${day}:${this.salt}`);
    const logId = hash(`${day}:${ipHash}:${release.version}`);
    const key = versionKey(release.version);
    await this.store.transaction(async tx => {
      const current = await tx.get<ReleaseRecord>("studioReleases", versionKey(release.version));
      const stats = (await tx.get<StatsDaily>("studioStatsDaily", day)) ?? emptyStats(day);
      const log = await tx.get<{ count: number }>("studioDownloads", logId);
      if (!current || current.status !== "published") throw new StudioError("release_unavailable", 404);
      tx.set("studioReleases", versionKey(release.version), { ...current, downloadCount: (current.downloadCount ?? 0) + 1 });
      tx.set<StatsDaily>("studioStatsDaily", day, { ...stats, downloads: { ...stats.downloads, [key]: (stats.downloads[key] ?? 0) + 1 }, uniqueDownloaders: stats.uniqueDownloaders + (log ? 0 : 1) });
      tx.set("studioDownloads", logId, log ? { ...log, count: log.count + 1, lastAt: iso(this.now()) } : {
        id: logId, version: release.version, channel: release.channel, day, at: iso(this.now()), lastAt: iso(this.now()), count: 1, ipHash,
        ua: uaFamily(meta.userAgent.slice(0, 300)), referrerHost: refHost(meta.referrer), utm: meta.utm,
      });
    });
    return { url: this.fileUrl(release), release: this.publicView(release) };
  }
  /** Desktop update check. Never grants rights and carries no license data. */
  async updateCheck(input: Input) {
    const current = version(input.version);
    const wanted = channel(input.channel);
    const deviceId = typeof input.deviceId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.deviceId) ? input.deviceId : null;
    const [release] = await this.published(wanted);
    const day = iso(this.now()).slice(0, 10);
    const key = versionKey(current);
    await this.store.transaction(async tx => {
      const stats = (await tx.get<StatsDaily>("studioStatsDaily", day)) ?? emptyStats(day);
      const licenseId = deviceId ? freeLicenseId(deviceId) : null;
      const license = licenseId ? await tx.get<License>("studioLicenses", licenseId) : null;
      tx.set<StatsDaily>("studioStatsDaily", day, { ...stats, updateChecks: { ...stats.updateChecks, [key]: (stats.updateChecks[key] ?? 0) + 1 } });
      // Only annotate an existing, active device; this never creates or changes entitlement fields.
      if (license && deviceId && licenseId && license.devices[deviceId]?.status === "active") {
        license.devices[deviceId] = { ...license.devices[deviceId], appVersion: current, appSeenAt: iso(this.now()) };
        tx.set("studioLicenses", licenseId, license);
      }
    });
    if (!release || compareVersions(release.version, current) <= 0) return { updateAvailable: false, currentVersion: current };
    const min = release.minimumSupportedVersion;
    return { updateAvailable: true, currentVersion: current, mandatory: Boolean(min && compareVersions(current, min) < 0), latest: this.publicView(release) };
  }

  // ---------- admin ----------
  async adminList() {
    const releases = await this.store.list<ReleaseRecord>("studioReleases", undefined, 100);
    return { releases: releases.sort((a, b) => compareVersions(b.version, a.version)), downloadBaseConfigured: Boolean(this.base) };
  }
  async adminStats(input: { from?: unknown; to?: unknown }) {
    const day = (value: unknown, fallback: number) => {
      const text = typeof value === "string" ? value : iso(fallback).slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(Date.parse(text))) throw new StudioError("invalid_request");
      return text;
    };
    const to = day(input.to, this.now()), from = day(input.from, this.now() - 29 * 86400000);
    const span = (Date.parse(to) - Date.parse(from)) / 86400000;
    if (span < 0 || span > 89) throw new StudioError("invalid_request");
    const days = Array.from({ length: span + 1 }, (_, i) => iso(Date.parse(from) + i * 86400000).slice(0, 10));
    const rows = await this.store.transaction(tx => Promise.all(days.map(async d => (await tx.get<StatsDaily>("studioStatsDaily", d)) ?? emptyStats(d))));
    const sum = (pick: (row: StatsDaily) => number) => rows.reduce((total, row) => total + pick(row), 0);
    const versions: Record<string, number> = {};
    for (const row of rows) for (const [k, n] of Object.entries(row.updateChecks)) versions[k.replace(/_/g, ".")] = (versions[k.replace(/_/g, ".")] ?? 0) + n;
    return { from, to, days: rows, totals: { downloads: sum(r => Object.values(r.downloads).reduce((a, b) => a + b, 0)), uniqueDownloaders: sum(r => r.uniqueDownloaders), freeClaims: sum(r => r.freeClaims), updateChecks: sum(r => Object.values(r.updateChecks).reduce((a, b) => a + b, 0)) }, updateChecksByVersion: versions };
  }
  async adminAction(actor: string, input: Input) {
    const action = input.action;
    const v = version(input.version);
    const read = (tx: Parameters<Parameters<Store["transaction"]>[0]>[0]) => tx.get<ReleaseRecord>("studioReleases", versionKey(v));
    const audit = (tx: Parameters<Parameters<Store["transaction"]>[0]>[0], name: string) => {
      const id = randomUUID();
      tx.set("studioAuditLogs", id, { id, action: name, licenseId: `release-${v}`, deviceId: null, actor, createdAt: iso(this.now()) });
    };
    const at = iso(this.now());
    switch (action) {
      case "create-draft": {
        const notes = Array.isArray(input.notes) ? input.notes.map(n => (typeof n === "string" ? n.trim() : "")).filter(Boolean) : [];
        if (notes.length > 20 || notes.some(n => n.length > 300)) throw new StudioError("invalid_request");
        const min = input.minimumSupportedVersion ? version(input.minimumSupportedVersion) : null;
        const kind = channel(input.channel);
        return this.store.transaction(async tx => {
          if (await read(tx)) throw new StudioError("release_exists", 409);
          const record: ReleaseRecord = { version: v, channel: kind, platform: "windows", status: "draft", notes, fileKey: releaseFileKey(v), fileSize: 0, sha256: "", minimumSupportedVersion: min, checks: { checksumVerified: false, productionApiVerified: false, publicKeyVerified: false, installerLifecycleVerified: false, approved: false }, downloadCount: 0, createdAt: at, updatedAt: at, publishedAt: null, withdrawnAt: null };
          tx.set("studioReleases", versionKey(v), record); audit(tx, "release.draft_created");
          return { release: record };
        });
      }
      case "request-upload-url": {
        const release = await this.store.transaction(tx => read(tx));
        if (!release || release.status !== "draft") throw new StudioError("release_not_draft", 409);
        return { uploadUrl: await this.storage.presignUpload(release.fileKey), fileKey: release.fileKey, expiresInSeconds: 900 };
      }
      case "verify": {
        const release = await this.store.transaction(tx => read(tx));
        if (!release || release.status !== "draft") throw new StudioError("release_not_draft", 409);
        const found = await this.storage.inspect(release.fileKey);
        if (!found || found.size <= 0) throw new StudioError("file_missing", 409);
        return this.store.transaction(async tx => {
          const current = await read(tx);
          if (!current || current.status !== "draft") throw new StudioError("release_not_draft", 409);
          // The checksum is always measured by the server; an admin cannot assert one.
          const next = { ...current, fileSize: found.size, sha256: found.sha256, checks: { ...current.checks, checksumVerified: true }, updatedAt: at };
          tx.set("studioReleases", versionKey(v), next); audit(tx, "release.verified");
          return { release: next };
        });
      }
      case "set-checks": {
        const checks = input.checks as Partial<ReleaseChecks> | undefined;
        if (!checks || typeof checks !== "object") throw new StudioError("invalid_request");
        const allowed = ["productionApiVerified", "publicKeyVerified", "installerLifecycleVerified", "approved"] as const;
        return this.store.transaction(async tx => {
          const current = await read(tx);
          if (!current || current.status !== "draft") throw new StudioError("release_not_draft", 409);
          const merged = { ...current.checks };
          for (const name of allowed) if (name in checks) { if (typeof checks[name] !== "boolean") throw new StudioError("invalid_request"); merged[name] = checks[name]; }
          const next = { ...current, checks: merged, updatedAt: at };
          tx.set("studioReleases", versionKey(v), next); audit(tx, "release.checks_updated");
          return { release: next };
        });
      }
      case "publish": {
        if (!this.base) throw new StudioError("download_base_unconfigured", 503);
        return this.store.transaction(async tx => {
          const current = await read(tx);
          if (!current || current.status !== "draft") throw new StudioError("release_not_draft", 409);
          const next: ReleaseRecord = { ...current, status: "published", publishedAt: at, updatedAt: at };
          if (!this.downloadable(next)) throw new StudioError("release_gate_failed", 409);
          tx.set("studioReleases", versionKey(v), next); audit(tx, "release.published");
          return { release: next };
        });
      }
      case "withdraw":
        return this.store.transaction(async tx => {
          const current = await read(tx);
          if (!current || current.status !== "published") throw new StudioError("release_not_published", 409);
          const next: ReleaseRecord = { ...current, status: "withdrawn", withdrawnAt: at, updatedAt: at };
          tx.set("studioReleases", versionKey(v), next); audit(tx, "release.withdrawn");
          return { release: next };
        });
      default: throw new StudioError("invalid_request");
    }
  }
}
function refHost(value: string) { try { return new URL(value).hostname.slice(0, 100); } catch { return ""; } }
