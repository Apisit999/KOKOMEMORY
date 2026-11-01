import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase-admin";

export async function requireCustomerApi(request: Request): Promise<DecodedIdToken> {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Error("UNAUTHORIZED");
    const decoded = await adminAuth.verifyIdToken(token, true);
    const user = await adminAuth.getUser(decoded.uid);
    if (user.disabled) throw new Error("UNAUTHORIZED");
    return decoded;
}

export function isAdminToken(token: DecodedIdToken) {
    return token.admin === true || token.isAdmin === true || token.role === "admin";
}

export function safeId(value: unknown) {
    const id = typeof value === "string" ? value.trim() : "";
    return /^[A-Za-z0-9_-]{1,128}$/.test(id) ? id : "";
}
