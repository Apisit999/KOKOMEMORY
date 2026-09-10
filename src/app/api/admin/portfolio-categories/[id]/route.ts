import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import {
    deleteCategory,
    getCategory,
    PortfolioCategoryServiceError,
    updateCategory,
} from "@/services/portfolioCategory.service";
import type { PortfolioCategoryInput } from "@/types/portfolioCategory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
    const authorization = request.headers.get("authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : "";

    if (!token) throw new Error("UNAUTHORIZED");

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
}

function errorResponse(error: unknown) {
    if (error instanceof PortfolioCategoryServiceError) {
        const status =
            error.code === "DUPLICATE_SLUG"
                ? 409
                : error.code === "NOT_FOUND"
                    ? 404
                    : error.code === "IN_USE"
                        ? 409
                        : 400;

        return NextResponse.json(
            { success: false, error: error.message },
            { status }
        );
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return NextResponse.json(
            { success: false, error: "กรุณาเข้าสู่ระบบ Admin" },
            { status: 401 }
        );
    }

    if (error instanceof Error && error.message === "FORBIDDEN") {
        return NextResponse.json(
            { success: false, error: "บัญชีนี้ไม่มีสิทธิ์ Admin" },
            { status: 403 }
        );
    }

    console.error("Admin portfolio category API error:", error);
    return NextResponse.json(
        { success: false, error: "ไม่สามารถดำเนินการกับหมวดหมู่นี้ได้" },
        { status: 500 }
    );
}

export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin(request);
        const { id } = await context.params;
        const category = await getCategory(id);

        if (!category) {
            return NextResponse.json(
                { success: false, error: "ไม่พบหมวดหมู่นี้" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, category });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin(request);
        const { id } = await context.params;
        const input = (await request.json()) as PortfolioCategoryInput;
        const category = await updateCategory(id, input);

        return NextResponse.json({
            success: true,
            category,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function DELETE(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdmin(request);
        const { id } = await context.params;
        await deleteCategory(id);

        return NextResponse.json({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
