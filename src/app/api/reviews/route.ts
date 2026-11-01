import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const snapshot = await adminDb.collection("reviews").where("status", "==", "approved").get();
    const reviews = snapshot.docs.map((document) => {
        const data = document.data();
        return { id: document.id, customerName: data.customerName || "ลูกค้า KOKO Memory", rating: data.rating, comment: data.comment, eventType: data.eventType || "", createdAt: data.createdAt };
    });
    reviews.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    return NextResponse.json({ success: true, reviews }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
}
