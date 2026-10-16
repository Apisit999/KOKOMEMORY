import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-error";
import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        await requireAdminApi(request);
        const snapshot = await adminDb.collection("reviews").get();
        const reviews = snapshot.docs.map((document) => ({ id: document.id, ...document.data() }));
        return NextResponse.json({ success: true, reviews });
    } catch (error) {
        return authErrorResponse(error) || NextResponse.json({ success: false, error: "REVIEWS_LOAD_FAILED" }, { status: 500 });
    }
}
