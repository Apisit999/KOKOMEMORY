import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { authErrorResponse } from "@/lib/api-error";
import { requireAdminApi } from "@/lib/require-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalize(id: string, data: FirebaseFirestore.DocumentData): Record<string, unknown> { return { id, ...data, files: Array.isArray(data.files) ? data.files.map((f: Record<string, unknown>) => ({ id: f.id, fileName: f.fileName, contentType: f.contentType, size: f.size, kind: f.kind })) : [] }; }
function errorResponse(error: unknown) { const denied = authErrorResponse(error); if (denied) return denied; return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "INTERNAL" }, { status: 400 }); }

export async function GET(request: Request) { try { await requireAdminApi(request); const snapshot = await adminDb.collection("3dQuotes").get(); return NextResponse.json({ success: true, quotes: snapshot.docs.map((d) => normalize(d.id, d.data())).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))) }); } catch (error) { return errorResponse(error); } }

export async function POST(request: Request) { try { const admin = await requireAdminApi(request); const body = await request.json() as Record<string, unknown>; const userId = typeof body.userId === "string" ? body.userId.trim() : ""; if (!userId) throw new Error("INVALID_USER"); const ref = adminDb.collection("3dQuotes").doc(); await ref.create({ quoteNumber: `Q3D-${Date.now()}`, userId, status: "inquiry", files: [], material: typeof body.material === "string" ? body.material.trim() : "", color: typeof body.color === "string" ? body.color.trim() : "", quantity: Math.max(1, Math.floor(Number(body.quantity) || 1)), createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }); await adminDb.collection("auditLogs").doc().create({ action: "3D_QUOTE_CREATED", resource: "3dQuote", quoteId: ref.id, adminUid: admin.uid, createdAt: FieldValue.serverTimestamp() }); return NextResponse.json({ success: true, id: ref.id }, { status: 201 }); } catch (error) { return errorResponse(error); } }
