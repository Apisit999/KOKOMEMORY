import { NextResponse } from "next/server";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ paymentId: string }> }) {
    try {
        const token = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
        if (!token) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        const decoded = await adminAuth.verifyIdToken(token, true);
        const user = await adminAuth.getUser(decoded.uid);
        if (user.disabled) return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
        const { paymentId } = await context.params;
        if (!/^[A-Za-z0-9_-]{1,128}$/.test(paymentId)) return NextResponse.json({ success: false, error: "INVALID_PAYMENT_ID" }, { status: 400 });
        const paymentSnap = await adminDb.collection("payments").doc(paymentId).get();
        if (!paymentSnap.exists) return NextResponse.json({ success: false, error: "PAYMENT_NOT_FOUND" }, { status: 404 });
        const payment = paymentSnap.data() || {};
        const bookingId = typeof payment.bookingId === "string" ? payment.bookingId : "";
        const bookingSnap = await adminDb.collection("bookings").doc(bookingId).get();
        const booking = bookingSnap.data() || {};
        const isAdmin = decoded.admin === true || decoded.isAdmin === true || decoded.role === "admin";
        if (!isAdmin && booking.userId !== decoded.uid) return NextResponse.json({ success: false, error: "FORBIDDEN" }, { status: 403 });
        const key = typeof payment.slipKey === "string" ? payment.slipKey : typeof payment.slipPath === "string" ? payment.slipPath : "";
        if (!key || ["rejected", "invalid", "deleted"].includes(String(payment.status || "").toLowerCase())) return NextResponse.json({ success: false, error: "SLIP_NOT_AVAILABLE" }, { status: 404 });
        const accountId = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
        const bucketName = process.env.R2_BUCKET_NAME;
        if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) return NextResponse.json({ success: false, error: "R2_NOT_CONFIGURED" }, { status: 500 });
        const s3 = new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey } });
        const result = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
        if (!result.Body) return NextResponse.json({ success: false, error: "SLIP_NOT_FOUND" }, { status: 404 });
        const body = Buffer.from(await result.Body.transformToByteArray());
        return new NextResponse(body, { status: 200, headers: { "Content-Type": typeof payment.slipContentType === "string" ? payment.slipContentType : result.ContentType || "application/octet-stream", "Content-Disposition": "inline", "Cache-Control": "private, no-store, max-age=0", "X-Content-Type-Options": "nosniff" } });
    } catch {
        return NextResponse.json({ success: false, error: "SLIP_ACCESS_FAILED" }, { status: 500 });
    }
}
