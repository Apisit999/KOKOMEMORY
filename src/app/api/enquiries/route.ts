import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const enquirySchema = z.object({
    name: z.string().trim().min(2).max(100),
    contact: z.string().trim().min(5).max(160),
    service: z.enum(["rental", "photobooth-software", "software", "3d-print", "other"]),
    details: z.string().trim().min(10).max(3000),
    website: z.string().max(300).optional(),
});

export async function POST(request: Request) {
    try {
        const parsed = enquirySchema.safeParse(await request.json());
        if (!parsed.success) return NextResponse.json({ success: false, error: "INVALID_ENQUIRY" }, { status: 400 });
        // Quietly accept honeypot submissions without storing them.
        if (parsed.data.website) return NextResponse.json({ success: true }, { status: 201 });
        const ref = adminDb.collection("enquiries").doc();
        await ref.create({
            name: parsed.data.name,
            contact: parsed.data.contact,
            service: parsed.data.service,
            details: parsed.data.details,
            status: "new",
            source: "website",
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        return NextResponse.json({ success: true, reference: ref.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
    } catch {
        return NextResponse.json({ success: false, error: "ENQUIRY_SUBMIT_FAILED" }, { status: 500 });
    }
}
