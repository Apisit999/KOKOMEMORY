import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown) {
    return authErrorResponse(error) || NextResponse.json({ success: false, error: "ENQUIRY_REQUEST_FAILED" }, { status: 500 });
}

export async function GET(request: Request) {
    try {
        await requireAdminApi(request);
        const snapshot = await adminDb.collection("enquiries").orderBy("createdAt", "desc").get();
        const enquiries = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        return NextResponse.json({ success: true, enquiries }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) { return errorResponse(error); }
}

const updateSchema = z.object({ status: z.enum(["new", "contacted", "quoted", "closed"]) });

export async function PATCH(request: Request) {
    try {
        const admin = await requireAdminApi(request);
        const body = await request.json() as { id?: unknown; status?: unknown };
        const id = z.string().min(1).max(150).safeParse(body.id);
        const update = updateSchema.safeParse({ status: body.status });
        if (!id.success || !update.success) return NextResponse.json({ success: false, error: "INVALID_ENQUIRY_UPDATE" }, { status: 400 });
        const ref = adminDb.collection("enquiries").doc(id.data);
        await adminDb.runTransaction(async (tx) => {
            const doc = await tx.get(ref);
            if (!doc.exists) throw new Error("ENQUIRY_NOT_FOUND");
            tx.update(ref, { status: update.data.status, updatedAt: FieldValue.serverTimestamp() });
            const log = adminDb.collection("auditLogs").doc();
            tx.create(log, { action: "ENQUIRY_STATUS_UPDATED", resource: "enquiry", enquiryId: id.data, status: update.data.status, adminUid: admin.uid, createdAt: FieldValue.serverTimestamp() });
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof Error && error.message === "ENQUIRY_NOT_FOUND") return NextResponse.json({ success: false, error: error.message }, { status: 404 });
        return errorResponse(error);
    }
}
