import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { StudioError, purchaseDisabled } from "./types.ts";
import type { Input, StudioService } from "./service.ts";
import type { ReleaseService } from "./releases.ts";
import type { CloudService } from "./cloud.ts";
import type { NotificationService } from "./notifications.ts";
import type { BillingService } from "./billing.ts";
import { MemoryRateLimiter } from "./memory-rate-limit.ts";
import { UNMETERED_PATHS, requestMetrics, type MonitorSnapshot } from "./monitoring.ts";
type Identity = { uid: string; admin: boolean };
type Dependencies = { enabled: boolean; origin: string; service: () => Promise<StudioService>; authenticate: (request: Request) => Promise<Identity>; clientAddress: (request: Request) => string; releases?: () => Promise<ReleaseService>; cloud?: () => Promise<CloudService>; notifications?: () => Promise<NotificationService>; monitor?: () => Promise<MonitorSnapshot>; billing?: () => Promise<BillingService> };
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
/** Counts guests opening and saving photos in memory: see memory-rate-limit.ts for why this is not a database transaction. */
const guestReadLimiter = new MemoryRateLimiter();
/** Per booth path: one device may send 60 a minute; all booths behind one public address together 600. */
const BOOTH_DEVICE_PER_MINUTE = 60, BOOTH_IP_PER_MINUTE = 600;
// Only for local fault-injection tests that replay hours of booth traffic in minutes from one device.
const boothDeviceLimit = () => process.env.STUDIO_ENV === "local" && Number(process.env.STUDIO_BOOTH_DEVICE_PER_MINUTE) > 0 ? Number(process.env.STUDIO_BOOTH_DEVICE_PER_MINUTE) : BOOTH_DEVICE_PER_MINUTE;
async function body(request: Request): Promise<Input> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new StudioError("invalid_request", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new StudioError("invalid_request");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const next = await reader.read();
      if (next.done) break;
      size += next.value.length;
      if (size > 24576) { await reader.cancel(); throw new StudioError("request_too_large", 413); }
      chunks.push(next.value);
    }
    const parsed = JSON.parse(Buffer.concat(chunks).toString());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    return parsed;
  } catch (error) { if (error instanceof StudioError) throw error; throw new StudioError("invalid_request"); }
}
export function createStudioHandler(dependencies: Dependencies) {
  const handle = studioHandler(dependencies);
  return async (request: Request, path: string): Promise<Response> => {
    const started = Date.now();
    const response = await handle(request, path);
    if (!UNMETERED_PATHS.has(path)) requestMetrics.record(path, response.status, Date.now() - started);
    return response;
  };
}
function studioHandler(dependencies: Dependencies) {
  return async (request: Request, path: string): Promise<Response> => {
    const requestId = randomUUID();
    try {
      const origin = request.headers.get("origin");
      if (origin && origin !== dependencies.origin) throw new StudioError("origin_denied", 403);
      if (path === "health" && request.method === "GET") return Response.json({ status: "ok", service: "koko-studio" }, { headers });
      if (path === "monitor/snapshot" && request.method === "GET") {
        // Own token (not the cron one), checked before anything else so a database outage can still be reported.
        const secret = process.env.STUDIO_MONITOR_TOKEN ?? ""; const given = request.headers.get("x-monitor-token") ?? "";
        const a = createHash("sha256").update(secret).digest(), b = createHash("sha256").update(given).digest();
        if (secret.length < 32 || !dependencies.monitor || !timingSafeEqual(a, b)) throw new StudioError("not_found", 404);
        return Response.json(await dependencies.monitor(), { headers });
      }
      if (!dependencies.enabled) throw new StudioError("service_unavailable", 503);
      const service = await dependencies.service();
      await service.ready();
      if (path === "readiness" && request.method === "GET") return Response.json({ status: "ready" }, { headers });
      let identity: Identity | null = null;
      if (path.startsWith("account/") || path.startsWith("admin/") || path === "purchase") {
        try { identity = await dependencies.authenticate(request); } catch { throw new StudioError("unauthorized", 401); }
        if (path.startsWith("admin/") && !identity.admin) throw new StudioError("forbidden", 403);
      }
      // Only trust a proxy address when the hosting platform strips inbound spoofed headers.
      const publicRead = path === "billing/omise/webhook" || path === "download" || path === "releases/latest" || path === "desktop/updates" || path === "share/view" || path === "share/photo" || path === "share/code";
      // Public download/update paths see far more traffic than license mutations; without a trusted proxy header every caller shares one bucket.
      const principal = identity ? `uid:${identity.uid}` : dependencies.clientAddress(request);
      const maxPerMinute = path === "account/link" || path === "share/code" ? 10 : publicRead ? 300 : 30;
      // Guests of one event often share an address, so the busiest reads must not queue on one database document.
      // Booths of one venue share one public address too: count them in memory (generous per address; fairness is per device, below).
      const boothPath = path.startsWith("desktop/cloud/");
      if (path === "share/view" || path === "share/photo") guestReadLimiter.hit(`${path}:${principal}`, maxPerMinute, Date.now());
      else if (boothPath) guestReadLimiter.hit(`${path}:${principal}`, BOOTH_IP_PER_MINUTE, Date.now());
      else await service.rateLimit(path, principal, maxPerMinute);
      const url = new URL(request.url);
      const releases = async () => { if (!dependencies.releases) throw new StudioError("not_found", 404); return dependencies.releases(); };
      const cloud = async () => { if (!dependencies.cloud) throw new StudioError("not_found", 404); return dependencies.cloud(); };
      const billing = async () => { if (!dependencies.billing) throw new StudioError("purchase_unavailable", 503); return dependencies.billing(); };
      if (request.method === "GET") {
        if (path === "releases/latest") return Response.json(await (await releases()).latest({ channel: url.searchParams.get("channel") }), { headers: { ...headers, "Cache-Control": "public, max-age=60" } });
        if (path === "download") {
          const utm: Record<string, string> = {};
          for (const name of ["utm_source", "utm_medium", "utm_campaign"]) { const value = url.searchParams.get(name); if (value) utm[name.slice(4)] = value.slice(0, 60); }
          const result = await (await releases()).download({ channel: url.searchParams.get("channel"), version: url.searchParams.get("version") }, { ip: dependencies.clientAddress(request), userAgent: request.headers.get("user-agent") ?? "", referrer: request.headers.get("referer") ?? "", utm });
          return new Response(null, { status: 302, headers: { ...headers, Location: result.url } });
        }
        if (path === "share/photo") {
          const file = await (await cloud()).sharePhotoByToken(url.searchParams.get("t"));
          return new Response(file.bytes as BodyInit, { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(file.bytes.length), "Content-Disposition": `attachment; filename="${file.name}"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
        }
        if (path === "desktop/updates") return Response.json(await (await releases()).updateCheck({ version: url.searchParams.get("version"), channel: url.searchParams.get("channel"), deviceId: url.searchParams.get("deviceId") }), { headers });
        if (path === "admin/releases" && identity?.admin) return Response.json(await (await releases()).adminList(), { headers });
        if (path === "admin/stats" && identity?.admin) return Response.json(await (await releases()).adminStats({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined }), { headers });
        if (path === "account/cloud/events" && identity) return Response.json(await (await cloud()).accountOverview(identity.uid), { headers });
        if (path === "account/cloud/photos" && identity) return Response.json(await (await cloud()).eventPhotos({ ownerUid: identity.uid }, url.searchParams.get("eventId")), { headers });
        if (path === "admin/cloud/events" && identity?.admin) return Response.json(await (await cloud()).adminEvents(url.searchParams.get("ownerUid") ?? undefined), { headers });
        if (path === "admin/cloud/photos" && identity?.admin) return Response.json(await (await cloud()).eventPhotos({ admin: true }, url.searchParams.get("eventId")), { headers });
        if (path === "account/billing/plans" && identity) return Response.json(await (await billing()).plans(), { headers });
        if (path === "account/billing/orders" && identity) return Response.json(await (await billing()).history(identity.uid), { headers });
        if (path === "account/billing/order" && identity) return Response.json(await (await billing()).orderStatus(identity.uid, url.searchParams.get("orderId")), { headers });
        if (path === "desktop/plans") return Response.json(await service.plans(), { headers });
        if (path === "account/licenses" && identity) return Response.json(await service.account(identity.uid), { headers });
        if (path === "admin/licenses" && identity?.admin) return Response.json(await service.admin(), { headers });
        throw new StudioError("not_found", 404);
      }
      if (request.method !== "POST") throw new StudioError("method_not_allowed", 405);
      if (path === "purchase") purchaseDisabled();
      const input = await body(request);
      // The device id is not verified here, so it can only share out the per-address budget above, never exceed it.
      if (boothPath && typeof input.deviceId === "string") guestReadLimiter.hit(`${path}:device:${input.deviceId.slice(0, 40)}`, boothDeviceLimit(), Date.now());
      let result: unknown;
      switch (path) {
        case "account/billing/checkout": result = await (await billing()).checkout(identity!.uid, input); break;
        case "billing/omise/webhook": result = await (await billing()).webhook(input); break;
        case "desktop/licenses/free/claim": result = await service.claimFree(input); break;
        case "desktop/licenses/activate": result = await service.activate(input); break;
        case "desktop/leases/refresh": result = await service.refresh(input); break;
        case "desktop/licenses/deactivate": result = await service.deactivate(input); break;
        case "share/view": {
          // Public page: never cached and never leaks the link through the Referer header.
          return Response.json(await (await cloud()).viewShare(input.token, input.pin), { headers: { ...headers, "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
        }
        case "share/code": {
          // Short codes are guessable in principle, so each event also gets its own budget whoever is asking.
          await service.rateLimit("share/code:event", `event:${typeof input.eventId === "string" ? input.eventId.slice(0, 64) : ""}`, 30);
          return Response.json(await (await cloud()).viewShortCode(input.eventId, input.code, input.pin), { headers: { ...headers, "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
        }
        case "share/photo": {
          const file = await (await cloud()).sharePhoto(input.token, input.photoId, input.pin);
          return new Response(file.bytes as BodyInit, { headers: { ...headers, "Content-Type": "image/jpeg", "Content-Length": String(file.bytes.length), "Content-Disposition": `attachment; filename="${file.name}"`, "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow" } });
        }
        case "desktop/cloud/shares/revoke": result = await (await cloud()).revokeSessionShare(input); break;
        case "desktop/cloud/sessions": result = await (await cloud()).registerSession(input); break;
        case "desktop/cloud/shares": result = await (await cloud()).createSessionShare(input); break;
        case "account/cloud/shares": result = await (await cloud()).manageShare(identity!.uid, input); break;
        case "desktop/cloud/events": result = await (await cloud()).upsertEvent(input); break;
        case "desktop/cloud/photos/init": result = await (await cloud()).initPhoto(input); break;
        case "desktop/cloud/photos/confirm": result = await (await cloud()).confirmPhoto(input); break;
        case "account/cloud/photos/manage": result = await (await cloud()).managePhoto({ ownerUid: identity!.uid }, identity!.uid, input); break;
        case "admin/cloud/retention-sweep": if (!identity?.admin) throw new StudioError("forbidden", 403); result = await (await cloud()).sweepExpiredPhotos(`admin:${identity.uid}`); break;
        case "admin/cloud/derivatives/backfill": result = await (await cloud()).backfillDerivatives(typeof input.limit === "number" ? input.limit : 50); break;
        case "admin/cloud/photos/manage": result = await (await cloud()).managePhoto({ admin: true }, identity!.uid, input); break;
        case "desktop/photo-folders": result = await service.cloud(input); break;
        case "desktop/device-authorizations": result = await service.beginLink(input); break;
        case "desktop/device-authorizations/poll": result = await service.pollLink(input); break;
        case "account/link":
          if (input.action !== "inspect" && input.action !== "approve") throw new StudioError("invalid_request");
          result = input.action === "approve" ? await service.approveLink(identity!.uid, input.userCode) : await service.inspectLink(identity!.uid, input.userCode); break;
        case "account/licenses/manage": result = await service.manage(identity!.uid, false, input); break;
        case "admin/releases": result = await (await releases()).adminAction(identity!.uid, input); break;
        case "account/pilot/start": result = await service.startPilot(identity!.uid, input); break;
        case "admin/licenses/grant": result = await service.grantPlan(identity!.uid, input); break;
        case "cron/retention-sweep": {
          const secret = process.env.STUDIO_CRON_SECRET ?? ""; const given = request.headers.get("x-cron-secret") ?? "";
          const a = createHash("sha256").update(secret).digest(), b = createHash("sha256").update(given).digest();
          if (secret.length < 32 || !timingSafeEqual(a, b)) throw new StudioError("forbidden", 403);
          { const swept = await (await cloud()).sweepExpiredPhotos("system:cron"); const notices = dependencies.notifications ? await (await dependencies.notifications()).run() : null; result = { ...swept, notices }; } break;
        }
        case "admin/licenses/manage": result = await service.manage(identity!.uid, true, input); break;
        default: throw new StudioError("not_found", 404);
      }
      return Response.json(result, { headers });
    } catch (error) {
      const known = error instanceof StudioError;
      const status = known ? error.status : 503;
      const code = known ? error.code : "server_error";
      // Do not log input, JWTs, PEMs, Firebase errors, or user content.
      if (!known) console.error(JSON.stringify({ service: "koko-studio", code, requestId }));
      return Response.json({ code, requestId }, { status, headers: { ...headers, ...(status === 429 ? { "Retry-After": "60" } : {}) } });
    }
  };
}
