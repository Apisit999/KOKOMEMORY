import { NextResponse } from "next/server";

import { getCategories } from "@/services/portfolioCategory.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const categories = await getCategories({ activeOnly: true });

        return NextResponse.json(
            {
                success: true,
                categories,
            },
            {
                status: 200,
                headers: {
                    "Cache-Control": "public, max-age=60, s-maxage=300",
                },
            }
        );
    } catch (error) {
        console.error("Public portfolio categories API error:", error);

        return NextResponse.json(
            {
                success: false,
                categories: [],
                error: "ไม่สามารถโหลดหมวดหมู่ได้",
            },
            { status: 200 }
        );
    }
}
