import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase-admin";

// Only Firebase custom claims grant access; profiles are not an auth source.
export async function requireAdminApi(request: Request): Promise<DecodedIdToken> {
    const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) throw new Error("UNAUTHORIZED");
    let decoded: DecodedIdToken;
    try {
        decoded = await adminAuth.verifyIdToken(token, true);
        const user = await adminAuth.getUser(decoded.uid);
        if (user.disabled) throw new Error("UNAUTHORIZED");
    } catch {
        throw new Error("UNAUTHORIZED");
    }
    if (!(decoded.admin === true || decoded.isAdmin === true || decoded.role === "admin")) {
        throw new Error("FORBIDDEN");
    }
    return decoded;
}
