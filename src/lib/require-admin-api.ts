import { getAuth } from "firebase-admin/auth";

import { adminDb } from "@/lib/firebase-admin";

export async function requireAdminApi(request: Request) {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : "";

    if (!token) {
        throw new Error("UNAUTHORIZED");
    }

    const decodedToken = await getAuth().verifyIdToken(token);
    const adminSnapshot = await adminDb
        .collection("admins")
        .doc(decodedToken.uid)
        .get();
    const adminData = adminSnapshot.data();

    if (
        !adminSnapshot.exists ||
        adminData?.role !== "admin" ||
        adminData?.active !== true
    ) {
        throw new Error("FORBIDDEN");
    }

    return decodedToken;
}
