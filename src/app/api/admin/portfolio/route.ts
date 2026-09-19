import { authErrorResponse } from "@/lib/api-error";
import { FieldValue } from "firebase-admin/firestore";
import { portfolioInput } from "@/lib/portfolio-input";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    try {
        await requireAdminApi(request);
        const snapshot = await adminDb.collection("portfolio").get();
        const portfolios = snapshot.docs.map((document) => ({
            id: document.id,
            ...document.data(),
        }));
        return NextResponse.json({ success: true, portfolios });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        console.error("Admin portfolio list error:", error);
        const code = error instanceof Error ? error.message : "DATABASE_ERROR";
        const status = ["MISSING_TOKEN", "INVALID_TOKEN", "UNAUTHORIZED"].includes(code)
            ? 401
            : code === "NOT_ADMIN" || code === "ADMIN_DISABLED"
                ? 403
                : 500;
        return NextResponse.json(
            { success: false, error: "ไม่สามารถโหลด Portfolio ได้", code },
            { status },
        );
    }
}

export async function POST(request: Request) {
    try {
        await requireAdminApi(request);
        const parsed = portfolioInput.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ error: "INVALID_PORTFOLIO_INPUT" }, { status: 400 });
        const ref = adminDb.collection("portfolio").doc();
        await ref.create({ ...parsed.data, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, id: ref.id }, { status: 201 });
    } catch (error) {
        return authErrorResponse(error) ?? NextResponse.json({ error: error instanceof SyntaxError ? "INVALID_JSON" : "PORTFOLIO_CREATE_FAILED" }, { status: error instanceof SyntaxError ? 400 : 500 });
    }
}
