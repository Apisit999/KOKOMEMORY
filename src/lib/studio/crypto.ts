import { createHash, createPrivateKey, createPublicKey, sign, verify, type KeyObject } from "node:crypto";
import { PRODUCT_ID, StudioError, type Claims, type Feature } from "./types.ts";

export const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const features: Feature[] = ["capture", "printing", "templates", "cloud_sync"];
const date = (value: unknown): value is string => typeof value === "string" && Number.isFinite(Date.parse(value));
function decode(part: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(part)) throw new StudioError("invalid_entitlement", 401);
  const buffer = Buffer.from(part, "base64url");
  if (buffer.toString("base64url") !== part) throw new StudioError("invalid_entitlement", 401);
  return buffer;
}
export class EntitlementSigner {
  private privateKey: KeyObject;
  private trusted: Record<string, KeyObject>;
  readonly keyId: string;
  constructor(keyId: string, privatePem: string, trustedPem: Record<string, string> = {}) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(keyId)) throw new Error("Invalid signing configuration");
    this.keyId = keyId;
    this.privateKey = createPrivateKey(privatePem);
    if (this.privateKey.asymmetricKeyType !== "rsa" || (this.privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error("RSA 2048 or stronger is required");
    this.trusted = Object.fromEntries(Object.entries(trustedPem).map(([id, pem]) => [id, createPublicKey(pem)]));
    for (const [id, key] of Object.entries(this.trusted)) {
      if (!/^[A-Za-z0-9_-]{1,80}$/.test(id) || key.asymmetricKeyType !== "rsa" || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new Error("Invalid trusted RSA key configuration");
    }
    // The active key must always verify using the private key's corresponding public key.
    this.trusted[keyId] = createPublicKey(this.privateKey);
  }
  publicKeys() { return Object.fromEntries(Object.entries(this.trusted).map(([id, key]) => [id, key.export({ type: "spki", format: "pem" }).toString()])); }
  sign(claims: Claims): string {
    const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT", kid: this.keyId })).toString("base64url");
    const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
    const input = `${header}.${body}`;
    return `${input}.${sign("RSA-SHA256", Buffer.from(input), this.privateKey).toString("base64url")}`;
  }
  verify(token: unknown, deviceId: string, now: number): Claims {
    try {
      if (typeof token !== "string" || token.length > 16384) throw new Error();
      const parts = token.split(".");
      if (parts.length !== 3) throw new Error();
      const header = JSON.parse(decode(parts[0]).toString());
      const claims = JSON.parse(decode(parts[1]).toString()) as Claims;
      if (header.alg !== "RS256" || typeof header.kid !== "string" || !Object.hasOwn(this.trusted, header.kid) || claims.keyId !== header.kid) throw new Error();
      if (!verify("RSA-SHA256", Buffer.from(`${parts[0]}.${parts[1]}`), this.trusted[header.kid], decode(parts[2]))) throw new Error();
      if (claims.schemaVersion !== 1 || !/^[A-Za-z0-9_-]{1,128}$/.test(claims.licenseId) || claims.deviceId !== deviceId || claims.productId !== PRODUCT_ID) throw new Error();
      if (!date(claims.issuedAt) || !date(claims.startsAt) || !date(claims.refreshAfter) || !date(claims.offlineUntil) || (claims.expiresAt !== null && !date(claims.expiresAt))) throw new Error();
      if (!Array.isArray(claims.features) || new Set(claims.features).size !== claims.features.length || !claims.features.every(f => features.includes(f))) throw new Error();
      if (Date.parse(claims.issuedAt) > now + 300000 || Date.parse(claims.startsAt) > now || Date.parse(claims.refreshAfter) < Date.parse(claims.issuedAt) || Date.parse(claims.offlineUntil) < Date.parse(claims.refreshAfter)) throw new Error();
      // Expired offline windows are intentionally accepted here; live DB policy decides refresh.
      return claims;
    } catch { throw new StudioError("invalid_entitlement", 401); }
  }
}
