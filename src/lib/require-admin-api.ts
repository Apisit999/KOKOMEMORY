/**
 * ============================================================
 * KOKO Memory - Require Admin API
 * ============================================================
 *
 * ใช้สำหรับป้องกัน API Route ของ Admin
 *
 * Flow:
 *
 * Browser
 *   ↓
 * Firebase Auth
 *   ↓
 * ID Token
 *   ↓
 * Authorization: Bearer <token>
 *   ↓
 * Next.js API
 *   ↓
 * requireAdminApi()
 *   ↓
 * Firebase Admin Auth
 *   ↓
 * Firestore admins/{uid}
 *   ↓
 * ตรวจ role + active
 *
 * ============================================================
 */

import {
    type DecodedIdToken,
} from "firebase-admin/auth";

import {
    adminAuth,
    adminDb,
} from "@/lib/firebase-admin";


/* ============================================================
   Require Admin
============================================================ */

export async function requireAdminApi(
    request: Request
): Promise<DecodedIdToken> {

    /*
     * --------------------------------------------------------
     * 1. อ่าน Authorization Header
     * --------------------------------------------------------
     */

    const authorization =
        request.headers.get(
            "authorization"
        );

    if (!authorization) {
        throw new Error(
            "MISSING_TOKEN"
        );
    }


    /*
     * --------------------------------------------------------
     * 2. ตรวจ Bearer Token
     * --------------------------------------------------------
     */

    const match =
        authorization.match(
            /^Bearer\s+(.+)$/i
        );

    if (!match) {
        throw new Error(
            "INVALID_AUTH_HEADER"
        );
    }

    const idToken =
        match[1].trim();

    if (!idToken) {
        throw new Error(
            "MISSING_TOKEN"
        );
    }


    /*
     * --------------------------------------------------------
     * 3. Verify Firebase ID Token
     * --------------------------------------------------------
     */

    let decodedToken:
        DecodedIdToken;

    try {

        decodedToken =
            await adminAuth.verifyIdToken(
                idToken
            );

    } catch (error) {

        console.error(
            "Firebase Admin verifyIdToken error:",
            error
        );

        throw new Error(
            "INVALID_TOKEN"
        );
    }


    /*
     * --------------------------------------------------------
     * 4. ตรวจ UID
     * --------------------------------------------------------
     */

    if (!decodedToken.uid) {
        throw new Error(
            "UNAUTHORIZED"
        );
    }


    /*
     * --------------------------------------------------------
     * 5. ตรวจ Firebase User
     * --------------------------------------------------------
     *
     * ตรวจว่าบัญชีถูก Disable หรือไม่
     *
     * --------------------------------------------------------
     */

    let userRecord;

    try {

        userRecord =
            await adminAuth.getUser(
                decodedToken.uid
            );

    } catch (error) {

        console.error(
            "Firebase Admin getUser error:",
            error
        );

        throw new Error(
            "UNAUTHORIZED"
        );
    }


    if (userRecord.disabled) {
        throw new Error(
            "ADMIN_DISABLED"
        );
    }


    /*
     * --------------------------------------------------------
     * 6. ตรวจ Admin จาก Firestore
     * --------------------------------------------------------
     *
     * ใช้ระบบ Admin เดิมของ KOKO Memory:
     *
     * admins/{Firebase UID}
     *
     * ต้องมี:
     *
     * role   === "admin"
     * active === true
     *
     * --------------------------------------------------------
     */

    let adminSnapshot;

    try {

        adminSnapshot =
            await adminDb
                .collection("admins")
                .doc(decodedToken.uid)
                .get();

    } catch (error) {

        console.error(
            "Firebase Admin Firestore admin check error:",
            error
        );

        throw new Error(
            "UNAUTHORIZED"
        );
    }


    /*
     * ไม่มี Admin Document
     */

    if (!adminSnapshot.exists) {

        console.error(
            "Admin document not found:",
            decodedToken.uid
        );

        throw new Error(
            "NOT_ADMIN"
        );
    }


    /*
     * อ่านข้อมูล Admin
     */

    const adminData =
        adminSnapshot.data();


    /*
     * ตรวจ Role
     */

    if (
        adminData?.role !== "admin"
    ) {

        console.error(
            "Invalid admin role:",
            {
                uid: decodedToken.uid,
                role: adminData?.role,
            }
        );

        throw new Error(
            "NOT_ADMIN"
        );
    }


    /*
     * ตรวจ Active
     */

    if (
        adminData?.active !== true
    ) {

        console.error(
            "Admin account is inactive:",
            decodedToken.uid
        );

        throw new Error(
            "ADMIN_DISABLED"
        );
    }


    /*
     * --------------------------------------------------------
     * 7. ผ่านทั้งหมด
     * --------------------------------------------------------
     */

    return decodedToken;
}