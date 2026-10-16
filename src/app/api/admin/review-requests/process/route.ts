import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { processReviewRequests } from "@/lib/review-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        await requireAdminApi(request);
        return NextResponse.json({ success: true, ...(await processReviewRequests()) });
    } catch (error) {
        return authErrorResponse(error) || NextResponse.json({ success: false, error: "REVIEW_REQUEST_PROCESS_FAILED" }, { status: 500 });
    }
}
