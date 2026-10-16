import { Resend } from "resend";
import { FieldValue } from "firebase-admin/firestore";

import { adminAuth, adminDb } from "@/lib/firebase-admin";

export type ReviewRequestStatus = "pending" | "sent" | "reminded" | "completed";
export type ReviewStatus = "pending" | "approved" | "rejected";

const BOOKING_COLLECTION = "bookings";
const REQUEST_COLLECTION = "reviewRequests";
const REVIEW_COLLECTION = "reviews";

type BookingRecord = {
    userId?: unknown;
    bookingStatus?: unknown;
    customer?: { email?: unknown; name?: unknown };
    event?: { date?: unknown };
    package?: { name?: unknown };
};

function text(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function timestampMillis(value: unknown): number {
    if (value && typeof value === "object") {
        const seconds = (value as { seconds?: unknown }).seconds;
        if (typeof seconds === "number") return seconds * 1000;
    }
    return 0;
}

function getAppUrl(): string {
    const value = text(process.env.NEXT_PUBLIC_APP_URL).replace(/\/$/, "");
    if (!value) throw new Error("REVIEW_APP_URL_MISSING");
    const parsed = new URL(value);
    if (!/^https?:$/.test(parsed.protocol)) throw new Error("REVIEW_APP_URL_INVALID");
    return value;
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function reviewUrl(bookingId: string): string {
    return `${getAppUrl()}/account/bookings/${encodeURIComponent(bookingId)}?review=1`;
}

function emailHtml(bookingId: string, reminder: boolean): string {
    const url = reviewUrl(bookingId);
    const heading = reminder ? "ขอชวนคุณมาแชร์ประสบการณ์อีกครั้ง" : "ขอบคุณที่ใช้บริการ KOKO Memory";
    const body = reminder
        ? "หากมีเวลาสักครู่ ฝากแชร์ประสบการณ์การใช้บริการกับเรา ความคิดเห็นของคุณช่วยให้เราพัฒนาบริการให้ดียิ่งขึ้น"
        : "ขอบคุณที่ให้ KOKO Memory เป็นส่วนหนึ่งของช่วงเวลาพิเศษของคุณ หากมีเวลาสักครู่ ฝากแชร์ประสบการณ์การใช้บริการกับเรา";
    return `<!doctype html><html lang="th"><body style="margin:0;background:#fff7fb;padding:32px;font-family:Arial,sans-serif;color:#24151d"><div style="max-width:560px;margin:auto;background:#fff;border-radius:24px;padding:40px;box-shadow:0 10px 40px rgba(36,21,29,.08)"><div style="color:#ff4fa3;font-weight:800;letter-spacing:.08em">KOKO MEMORY</div><h1 style="font-size:28px;margin:24px 0 12px">${escapeHtml(heading)}</h1><p style="font-size:16px;line-height:1.8;color:#64748b">${escapeHtml(body)}</p><a href="${escapeHtml(url)}" style="display:inline-block;margin-top:24px;border-radius:999px;background:#ff4fa3;color:#fff;padding:15px 24px;text-decoration:none;font-weight:700">⭐ รีวิวการใช้บริการ</a><p style="margin-top:28px;color:#94a3b8;font-size:13px">ความคิดเห็นของคุณช่วยให้เราพัฒนาบริการให้ดียิ่งขึ้น</p></div></body></html>`;
}

async function sendReviewEmail(email: string, bookingId: string, reminder: boolean) {
    const apiKey = text(process.env.RESEND_API_KEY);
    const from = text(process.env.RESEND_FROM_EMAIL);
    if (!apiKey) throw new Error("RESEND_API_KEY_MISSING");
    if (!from) throw new Error("RESEND_FROM_EMAIL_MISSING");
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
        from,
        to: [email],
        subject: reminder ? "ขอชวนคุณมารีวิว KOKO Memory อีกครั้ง" : "ขอบคุณที่ใช้บริการ KOKO Memory",
        html: emailHtml(bookingId, reminder),
    });
    if (result.error) throw new Error("RESEND_SEND_FAILED");
}

async function audit(action: string, bookingId: string, extra: Record<string, unknown> = {}) {
    await adminDb.collection("auditLogs").doc().create({
        action,
        resource: "review",
        bookingId,
        ...extra,
        createdAt: FieldValue.serverTimestamp(),
    });
}

async function bookingFor(bookingId: string) {
    const snapshot = await adminDb.collection(BOOKING_COLLECTION).doc(bookingId).get();
    if (!snapshot.exists) throw new Error("BOOKING_NOT_FOUND");
    const booking = snapshot.data() as BookingRecord;
    if (text(booking.bookingStatus).toLowerCase() !== "completed") throw new Error("BOOKING_NOT_COMPLETED");
    const userId = text(booking.userId);
    if (!userId) throw new Error("BOOKING_USER_MISSING");
    let email = text(booking.customer?.email).toLowerCase();
    if (!email) email = text((await adminAuth.getUser(userId)).email).toLowerCase();
    if (!email) throw new Error("BOOKING_EMAIL_MISSING");
    return { ref: snapshot.ref, booking, userId, email };
}

export async function ensureReviewRequest(bookingId: string) {
    const source = await bookingFor(bookingId);
    const requestRef = adminDb.collection(REQUEST_COLLECTION).doc(bookingId);
    let created = false;

    await adminDb.runTransaction(async (transaction) => {
        const [bookingSnapshot, requestSnapshot] = await Promise.all([
            transaction.get(source.ref),
            transaction.get(requestRef),
        ]);
        if (!bookingSnapshot.exists) throw new Error("BOOKING_NOT_FOUND");
        const current = bookingSnapshot.data() as BookingRecord;
        if (text(current.bookingStatus).toLowerCase() !== "completed") throw new Error("BOOKING_NOT_COMPLETED");
        if (requestSnapshot.exists) return;
        transaction.create(requestRef, {
            id: bookingId,
            bookingId,
            userId: source.userId,
            email: source.email,
            status: "pending" as ReviewRequestStatus,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        created = true;
    });

    if (created) {
        try {
            await sendReviewEmail(source.email, bookingId, false);
            await requestRef.update({ status: "sent", sentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastErrorCode: FieldValue.delete() });
            await audit("REVIEW_REQUEST_SENT", bookingId);
        } catch (error) {
            const code = error instanceof Error ? error.message : "RESEND_SEND_FAILED";
            await requestRef.update({ status: "pending", lastErrorCode: code, lastErrorAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
            await audit("REVIEW_REQUEST_CREATED", bookingId);
            throw error;
        }
        await audit("REVIEW_REQUEST_CREATED", bookingId);
    }

    return { requestId: bookingId, created };
}

export async function getReviewForBooking(bookingId: string): Promise<(Record<string, unknown> & { id: string }) | null> {
    const snapshot = await adminDb.collection(REVIEW_COLLECTION).doc(bookingId).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function getReviewRequest(bookingId: string): Promise<(Record<string, unknown> & { id: string }) | null> {
    const snapshot = await adminDb.collection(REQUEST_COLLECTION).doc(bookingId).get();
    return snapshot.exists ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function submitReview(input: { bookingId: string; userId: string; rating: number; comment: string; customerName: string }) {
    const source = await bookingFor(input.bookingId);
    if (source.userId !== input.userId) throw new Error("FORBIDDEN");
    const reviewRef = adminDb.collection(REVIEW_COLLECTION).doc(input.bookingId);
    const requestRef = adminDb.collection(REQUEST_COLLECTION).doc(input.bookingId);

    await adminDb.runTransaction(async (transaction) => {
        const [reviewSnapshot, requestSnapshot] = await Promise.all([
            transaction.get(reviewRef),
            transaction.get(requestRef),
        ]);
        if (reviewSnapshot.exists) throw new Error("REVIEW_ALREADY_SUBMITTED");
        transaction.create(reviewRef, {
            bookingId: input.bookingId,
            userId: input.userId,
            customerName: input.customerName || "ลูกค้า KOKO Memory",
            rating: input.rating,
            comment: input.comment,
            status: "pending" as ReviewStatus,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });
        if (requestSnapshot.exists) {
            transaction.update(requestRef, { status: "completed", completedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
        } else {
            transaction.create(requestRef, {
                id: input.bookingId,
                bookingId: input.bookingId,
                userId: source.userId,
                email: source.email,
                status: "completed" as ReviewRequestStatus,
                completedAt: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
            });
        }
        transaction.set(adminDb.collection("auditLogs").doc(), { action: "REVIEW_SUBMITTED", resource: "review", bookingId: input.bookingId, userId: input.userId, createdAt: FieldValue.serverTimestamp() });
    });
}

export async function processReviewRequests() {
    const snapshot = await adminDb.collection(BOOKING_COLLECTION).where("bookingStatus", "==", "completed").get();
    const results = { created: 0, reminders: 0, skipped: 0, failed: 0 };
    const now = Date.now();

    for (const document of snapshot.docs) {
        try {
            await ensureReviewRequest(document.id);
            const requestRef = adminDb.collection(REQUEST_COLLECTION).doc(document.id);
            const requestSnapshot = await requestRef.get();
            const request = requestSnapshot.data() || {};
            if (request.status === "pending") {
                const attemptAt = timestampMillis(request.initialAttemptAt);
                if (attemptAt && now - attemptAt < 5 * 60 * 1000) { results.skipped += 1; continue; }
                const claimed = await adminDb.runTransaction(async (transaction) => {
                    const current = await transaction.get(requestRef);
                    const value = current.data() || {};
                    if (value.status !== "pending" || (timestampMillis(value.initialAttemptAt) && now - timestampMillis(value.initialAttemptAt) < 5 * 60 * 1000)) return false;
                    transaction.update(requestRef, { initialAttemptAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
                    return true;
                });
                if (!claimed) { results.skipped += 1; continue; }
                try {
                    const email = text(request.email).toLowerCase();
                    if (!email) throw new Error("REVIEW_EMAIL_MISSING");
                    await sendReviewEmail(email, document.id, false);
                    await requestRef.update({ status: "sent", sentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastErrorCode: FieldValue.delete() });
                    await audit("REVIEW_REQUEST_SENT", document.id);
                } catch (error) {
                    await requestRef.update({ status: "pending", lastErrorCode: error instanceof Error ? error.message : "RESEND_SEND_FAILED", lastErrorAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
                    results.failed += 1;
                }
                continue;
            }
            if (request.status !== "sent") { results.skipped += 1; continue; }
            if (await getReviewForBooking(document.id)) { results.skipped += 1; continue; }
            const sentAt = timestampMillis(request.sentAt);
            if (!sentAt || now - sentAt < 5 * 24 * 60 * 60 * 1000) { results.skipped += 1; continue; }
            const claimed = await adminDb.runTransaction(async (transaction) => {
                const current = await transaction.get(requestRef);
                const value = current.data() || {};
                if (value.status !== "sent" || (timestampMillis(value.reminderAttemptAt) && now - timestampMillis(value.reminderAttemptAt) < 5 * 60 * 1000)) return false;
                transaction.update(requestRef, { reminderAttemptAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
                return true;
            });
            if (!claimed) { results.skipped += 1; continue; }
            const email = text(request.email).toLowerCase();
            if (!email) throw new Error("REVIEW_EMAIL_MISSING");
            try {
                await sendReviewEmail(email, document.id, true);
                await requestRef.update({ status: "reminded", remindedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), lastErrorCode: FieldValue.delete() });
                await audit("REVIEW_REQUEST_REMINDER_SENT", document.id);
                results.reminders += 1;
            } catch (error) {
                await requestRef.update({ status: "sent", lastErrorCode: error instanceof Error ? error.message : "RESEND_SEND_FAILED", updatedAt: FieldValue.serverTimestamp() });
                results.failed += 1;
            }
        } catch {
            results.failed += 1;
        }
    }
    return results;
}

export { REVIEW_COLLECTION, REQUEST_COLLECTION };
