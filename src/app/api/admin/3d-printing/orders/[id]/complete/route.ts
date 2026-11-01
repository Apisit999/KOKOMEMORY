import { NextResponse } from "next/server";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";
import { transitionThreeDOrder } from "@/lib/three-d-order-lifecycle";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) { try { const admin = await requireAdminApi(request); const { id } = await context.params; return NextResponse.json({ success: true, ...(await transitionThreeDOrder(id, "complete", admin.uid)) }); } catch (error) { const denied = authErrorResponse(error); if (denied) return denied; const code = error instanceof Error ? error.message : "ORDER_TRANSITION_FAILED"; return NextResponse.json({ success: false, error: code, code }, { status: code === "ORDER_NOT_FOUND" ? 404 : 409 }); } }
