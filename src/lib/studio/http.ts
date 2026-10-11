import { randomUUID } from "node:crypto";
import { StudioError, purchaseDisabled } from "./types.ts";
import type { Input, StudioService } from "./service.ts";
type Identity = { uid: string; admin: boolean };
type Dependencies = { enabled: boolean; origin: string; service: () => Promise<StudioService>; authenticate: (request: Request) => Promise<Identity>; clientAddress: (request: Request) => string };
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
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
  return async (request: Request, path: string): Promise<Response> => {
    const requestId = randomUUID();
    try {
      const origin = request.headers.get("origin");
      if (origin && origin !== dependencies.origin) throw new StudioError("origin_denied", 403);
      if (path === "health" && request.method === "GET") return Response.json({ status: "ok", service: "koko-studio" }, { headers });
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
      await service.rateLimit(path, identity ? `uid:${identity.uid}` : dependencies.clientAddress(request), path === "account/link" ? 10 : 30);
      if (request.method === "GET") {
        if (path === "desktop/plans") return Response.json(await service.plans(), { headers });
        if (path === "account/licenses" && identity) return Response.json(await service.account(identity.uid), { headers });
        if (path === "admin/licenses" && identity?.admin) return Response.json(await service.admin(), { headers });
        throw new StudioError("not_found", 404);
      }
      if (request.method !== "POST") throw new StudioError("method_not_allowed", 405);
      if (path === "purchase") purchaseDisabled();
      const input = await body(request);
      let result: unknown;
      switch (path) {
        case "desktop/licenses/free/claim": result = await service.claimFree(input); break;
        case "desktop/licenses/activate": result = await service.activate(input); break;
        case "desktop/leases/refresh": result = await service.refresh(input); break;
        case "desktop/licenses/deactivate": result = await service.deactivate(input); break;
        case "desktop/photo-folders": result = await service.cloud(input); break;
        case "desktop/device-authorizations": result = await service.beginLink(input); break;
        case "desktop/device-authorizations/poll": result = await service.pollLink(input); break;
        case "account/link":
          if (input.action !== "inspect" && input.action !== "approve") throw new StudioError("invalid_request");
          result = input.action === "approve" ? await service.approveLink(identity!.uid, input.userCode) : await service.inspectLink(identity!.uid, input.userCode); break;
        case "account/licenses/manage": result = await service.manage(identity!.uid, false, input); break;
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
