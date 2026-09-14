import { adminAuth } from "@/lib/firebase-admin";

/**
 * ตรวจสอบว่า Request มาจากผู้ใช้ที่ Login ด้วย Firebase จริง
 * และมีสิทธิ์เป็น Admin
 *
 * รองรับ Admin Custom Claims:
 * - admin: true
 * - isAdmin: true
 * - role: "admin"
 */
export async function requireAdminApi(
    request: Request
) {
    const authorization =
        request.headers.get("authorization");

    if (!authorization) {
        throw new Error("MISSING_TOKEN");
    }

    const match =
        authorization.match(
            /^Bearer\s+(.+)$/i
        );

    if (!match) {
        throw new Error("INVALID_AUTH_HEADER");
    }

    const idToken =
        match[1]?.trim();

    if (!idToken) {
        throw new Error("MISSING_TOKEN");
    }

    let decodedToken;

    try {
        decodedToken =
            await adminAuth.verifyIdToken(
                idToken
            );
    } catch (error) {
        console.error(
            "Firebase ID token verification failed:",
            error
        );

        throw new Error("INVALID_TOKEN");
    }

    if (!decodedToken.uid) {
        throw new Error("UNAUTHORIZED");
    }

    /*
     * ตรวจสอบบัญชีผู้ใช้เพิ่มเติม
     * เพื่อป้องกันบัญชีที่ถูก Disabled
     */
    let userRecord;

    try {
        userRecord =
            await adminAuth.getUser(
                decodedToken.uid
            );
    } catch (error) {
        console.error(
            "Firebase getUser failed:",
            error
        );

        throw new Error("UNAUTHORIZED");
    }

    if (userRecord.disabled) {
        throw new Error("ACCOUNT_DISABLED");
    }

    /*
     * ตรวจสอบสิทธิ์ Admin
     *
     * รองรับ:
     *
     * { admin: true }
     * { isAdmin: true }
     * { role: "admin" }
     */
    const claims =
        decodedToken as typeof decodedToken & {
            admin?: boolean;
            isAdmin?: boolean;
            role?: string;
        };

    const isAdmin =
        claims.admin === true ||
        claims.isAdmin === true ||
        claims.role?.toLowerCase() === "admin";

    if (!isAdmin) {
        throw new Error("NOT_ADMIN");
    }

    return decodedToken;
}