import { authErrorResponse } from "@/lib/api-error";
import { NextResponse } from "next/server";

import { requireAdminApi } from "@/lib/require-admin-api";
import {
    createCategory,
    ensureDefaultCategories,
    getCategories,
    PortfolioCategoryServiceError,
} from "@/services/portfolioCategory.service";
import type { PortfolioCategoryInput } from "@/types/portfolioCategory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireAdmin(request: Request) {
    await requireAdminApi(request);
}

function errorResponse(error: unknown) {
    if (error instanceof PortfolioCategoryServiceError) {
        const status =
            error.code === "DUPLICATE_SLUG" ? 409 : 400;
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

    console.error("Admin portfolio categories API error:", error);
    return NextResponse.json(
        { success: false, error: "ไม่สามารถดำเนินการกับหมวดหมู่ได้" },
        { status: 500 }
    );
}

export async function GET(request: Request) {
    try {
        await requireAdmin(request);
        await ensureDefaultCategories();
        const categories = await getCategories();

        return NextResponse.json({
            success: true,
            categories,
        });
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}

export async function POST(request: Request) {
    try {
        await requireAdmin(request);
        const input = (await request.json()) as PortfolioCategoryInput;
        const category = await createCategory(input);

        return NextResponse.json(
            {
                success: true,
                category,
            },
            { status: 201 }
        );
    } catch (error) {
        const denied = authErrorResponse(error);
        if (denied) return denied;
        return errorResponse(error);
    }
}
