import { authErrorResponse } from "@/lib/api-error";
import { portfolioInput } from "@/lib/portfolio-input";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
    try {
        await requireAdminApi(request);
        const { id } = await context.params;
        const parsed = portfolioInput.partial().safeParse(await request.json());
        if (!id || id.includes("/") || !parsed.success || !Object.keys(parsed.data).length) {
            return NextResponse.json({ error: "INVALID_PORTFOLIO_UPDATE" }, { status: 400 });
        }
        const reference = adminDb.collection("portfolio").doc(id);
        const snapshot = await reference.get();
        if (!snapshot.exists) {
            return NextResponse.json({ success: false, error: "PORTFOLIO_NOT_FOUND", code: "PORTFOLIO_NOT_FOUND" }, { status: 404 });
        }

        await reference.update({ ...parsed.data, updatedAt: FieldValue.serverTimestamp() });
        return NextResponse.json({ success: true, id });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        const code = error instanceof Error ? error.message : "DATABASE_ERROR";
        return NextResponse.json({ success: false, error: code, code }, { status: code === "NOT_ADMIN" ? 403 : 500 });
    }
}

export async function DELETE(request: Request, context: Context) {
    try {
        await requireAdminApi(request);
        const { id } = await context.params;
        if (!id) {
            return NextResponse.json({ success: false, error: "MISSING_PORTFOLIO_ID", code: "MISSING_PORTFOLIO_ID" }, { status: 400 });
        }
        await adminDb.collection("portfolio").doc(id).delete();
        return NextResponse.json({ success: true, id });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        const code = error instanceof Error ? error.message : "DATABASE_ERROR";
        return NextResponse.json({ success: false, error: code, code }, { status: code === "NOT_ADMIN" ? 403 : 500 });
    }
}

export async function GET(request: Request, context: Context) {
    try {
        await requireAdminApi(request);
        const { id } = await context.params;
        if (!id || id.includes("/")) return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
        const snapshot = await adminDb.collection("portfolio").doc(id).get();
        if (!snapshot.exists) return NextResponse.json({ portfolio: null });
        return NextResponse.json({ portfolio: { ...snapshot.data(), id: snapshot.id } }, { headers: { "Cache-Control": "private, no-store" } });
    } catch (error) {
        return authErrorResponse(error) ?? NextResponse.json({ error: "PORTFOLIO_READ_FAILED" }, { status: 500 });
    }
}
