import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { requireCustomerApi, safeId } from "@/lib/customer-api-auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireCustomerApi(request);
        const id = safeId((await context.params).id);
        if (!id) return NextResponse.json({ success: false, error: "NOT_FOUND" }, { status: 404 });
        const quoteRef = adminDb.collection("3dQuotes").doc(id);

        await adminDb.runTransaction(async (tx) => {
            const quote = await tx.get(quoteRef);
            if (!quote.exists || quote.data()?.userId !== user.uid) throw new Error("NOT_FOUND");
            if (quote.data()?.status !== "quoted") throw new Error("QUOTE_NOT_READY");
            tx.update(quoteRef, { status: "rejected", rejectedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
            tx.create(adminDb.collection("auditLogs").doc(), { action: "3D_QUOTE_REJECTED", resource: "3dQuote", quoteId: id, userId: user.uid, createdAt: FieldValue.serverTimestamp() });
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        const code = error instanceof Error ? error.message : "INTERNAL";
        const status = code === "NOT_FOUND" ? 404 : code === "QUOTE_NOT_READY" ? 409 : code === "UNAUTHORIZED" ? 401 : 400;
        return NextResponse.json({ success: false, error: code }, { status });
    }
}
