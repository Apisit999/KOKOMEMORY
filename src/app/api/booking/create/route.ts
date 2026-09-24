import { provinces } from "@/data/thailand/provinces";
import { createHash } from "node:crypto";
import { getTravelFee, getBookingDeposit } from "@/data/booking-pricing";
import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";

import { adminDb } from "@/lib/firebase-admin";
import { todayBangkok } from "@/lib/bangkok-date";
import {
    getPackageById,
    resolvePackageId,
} from "@/data/booking-packages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RELEASED_STATUSES = new Set([
    "cancelled",
    "canceled",
    "rejected",
    "declined",
    "released",
]);

const CLOSED_DATES = new Set([
    "2026-08-20",
    "2026-08-21",
    "2026-09-10",
]);

type RecordValue = Record<string, unknown>;

function errorResponse(error: string, status: number, code: string) {
    return NextResponse.json(
        { success: false, error, code },
        { status },
    );
}

function isRecord(value: unknown): value is RecordValue {
    return Boolean(
        value &&
            typeof value === "object" &&
            !Array.isArray(value),
    );
}

function stringValue(value: unknown, max = 2000): string {
    if (typeof value !== "string") return "";
    return value.normalize("NFC").trim().slice(0, max);
}

function numberValue(value: unknown): number | null {
    if (typeof value !== "number") return null;
    const number = value;
    return Number.isFinite(number) ? number : null;
}

function timestampMillis(value: unknown): number | null {
    if (value instanceof Date) return value.getTime();
    if (value && typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
        return value.toMillis();
    }
    if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value).getTime();
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function validDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function validTime(value: string): boolean {
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function minutes(value: string): number | null {
    if (!validTime(value)) return null;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
}

function expectedEndTime(startTime: string, hours: number): string {
    const start = minutes(startTime);
    if (start === null || !Number.isFinite(hours) || hours <= 0) return "";

    const end = start + hours * 60;
    if (end > 1440) return "";

    const h = Math.floor(end / 60);
    const m = end % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function getBearerToken(request: Request): string {
    const authorization = request.headers.get("authorization") || "";

    if (!authorization.startsWith("Bearer ")) {
        throw new Error("UNAUTHORIZED");
    }

    const token = authorization.slice(7).trim();
    if (!token) throw new Error("UNAUTHORIZED");
    return token;
}

async function getAuthenticatedCustomer(request: Request) {
    const token = getBearerToken(request);

    let decoded;
    try {
        decoded = await getAuth().verifyIdToken(token, true);
    } catch (error) {
        console.error("KOKO booking token verification failed:", error);
        throw new Error("INVALID_TOKEN");
    }

    const user = await getAuth().getUser(decoded.uid);

    if (user.disabled) throw new Error("USER_DISABLED");
    if (!user.emailVerified) throw new Error("EMAIL_NOT_VERIFIED");

    const email = user.email?.trim().toLowerCase();
    if (!email) throw new Error("EMAIL_MISSING");

    return { uid: user.uid, email };
}

export async function POST(request: Request) {
    try {
        const authUser = await getAuthenticatedCustomer(request);

        let body: unknown;
        try {
            body = await request.json();
        } catch {
            return errorResponse("ข้อมูลคำขอไม่ถูกต้อง", 400, "INVALID_JSON");
        }

        if (!isRecord(body)) {
            return errorResponse("ข้อมูลคำขอไม่ถูกต้อง", 400, "INVALID_BODY");
        }

        const clientRequestId = stringValue(body.clientRequestId, 100);
        if (!/^[A-Za-z0-9_-]{10,100}$/.test(clientRequestId)) {
            return errorResponse("ไม่พบรหัสคำขอที่ถูกต้อง", 400, "INVALID_REQUEST_ID");
        }

        const packageId = stringValue(body.packageId, 100);
        if (!packageId) {
            return errorResponse("ไม่พบ Package ID", 400, "MISSING_PACKAGE");
        }

        const resolvedPackageId = resolvePackageId(packageId);
        const selectedPackage = getPackageById(resolvedPackageId);
        if (!selectedPackage) {
            return errorResponse("ไม่พบแพ็กเกจที่เลือก", 400, "INVALID_PACKAGE");
        }

        const packageRecord = selectedPackage as unknown as RecordValue;
        const canonicalPackagePrice = numberValue(packageRecord.price);
        const canonicalPackageHours = numberValue(packageRecord.hours);

        if (canonicalPackagePrice === null || canonicalPackageHours === null) {
            return errorResponse("ข้อมูลแพ็กเกจในระบบไม่ถูกต้อง", 500, "INVALID_PACKAGE_CONFIG");
        }

        const eventDate = stringValue(body.eventDate, 10);
        const startTime = stringValue(body.startTime, 5);
        const endTime = stringValue(body.endTime, 5);

        if (!validDate(eventDate)) {
            return errorResponse("วันที่จัดงานไม่ถูกต้อง", 400, "INVALID_EVENT_DATE");
        }
        if (eventDate < todayBangkok()) {
            return errorResponse("ไม่สามารถจองวันที่ผ่านมาแล้ว", 400, "PAST_EVENT_DATE");
        }
        if (CLOSED_DATES.has(eventDate)) {
            return errorResponse("วันที่นี้ปิดรับจอง", 409, "DATE_CLOSED");
        }
        if (!validTime(startTime)) {
            return errorResponse("เวลาเริ่มงานไม่ถูกต้อง", 400, "INVALID_START_TIME");
        }

        const expectedEnd = expectedEndTime(startTime, canonicalPackageHours);
        if (!expectedEnd || endTime !== expectedEnd) {
            return errorResponse("ช่วงเวลาไม่ตรงกับระยะเวลาของแพ็กเกจ", 400, "INVALID_TIME_RANGE");
        }

        const customer = isRecord(body.customer) ? body.customer : {};
        const customerName = stringValue(customer.name, 200);
        const phone = stringValue(customer.phone, 30);
        const line = stringValue(customer.line, 100);

        if (!customerName) {
            return errorResponse("กรุณากรอกชื่อ-นามสกุล", 400, "MISSING_CUSTOMER_NAME");
        }
        if (!/^0\d{9}$/.test(phone)) {
            return errorResponse("กรุณากรอกเบอร์โทรศัพท์ 10 หลัก", 400, "INVALID_PHONE");
        }

        const event = isRecord(body.event) ? body.event : {};
        const eventType = stringValue(event.type, 100);
        const guests = stringValue(event.guests, 30);

        const venue = isRecord(body.venue) ? body.venue : {};
        const venueName = stringValue(venue.name, 300);
        const province = stringValue(venue.province, 100);
        const district = stringValue(venue.district, 100);
        const subdistrict = stringValue(venue.subdistrict, 100);
        const postalCode = stringValue(venue.postalCode, 10);
        const address = stringValue(venue.address, 1000);
        const googleMaps = stringValue(venue.googleMaps, 2000);

        if (!venueName) return errorResponse("กรุณากรอกชื่อสถานที่จัดงาน", 400, "MISSING_VENUE");
        if (!(provinces as readonly string[]).includes(province)) return errorResponse("กรุณาเลือกจังหวัด", 400, "MISSING_PROVINCE");
        if (!district) return errorResponse("กรุณาเลือกเขต / อำเภอ", 400, "MISSING_DISTRICT");
        if (!subdistrict) return errorResponse("กรุณาเลือกแขวง / ตำบล", 400, "MISSING_SUBDISTRICT");

        const pricing = isRecord(body.pricing) ? body.pricing : {};
        const clientPackagePrice = numberValue(pricing.packagePrice);
        if (clientPackagePrice === null || Math.abs(clientPackagePrice - canonicalPackagePrice) > 0.01) {
            return errorResponse("ราคาแพ็กเกจไม่ตรงกับข้อมูลระบบ กรุณารีเฟรชหน้าแล้วลองใหม่", 409, "PACKAGE_PRICE_MISMATCH");
        }

        const travelFee = getTravelFee(province);
        const discount = 0;
        const total = Math.max(canonicalPackagePrice + travelFee - discount, 0);
        const clientTotal = numberValue(pricing.total);

        if (clientTotal === null || Math.abs(clientTotal - total) > 0.01) {
            return errorResponse("ยอดรวมไม่ตรงกับข้อมูลระบบ กรุณารีเฟรชหน้าแล้วลองใหม่", 409, "TOTAL_MISMATCH");
        }

        const deposit = getBookingDeposit(packageId);

        if (deposit > total) {
            return errorResponse("เงินมัดจำมากกว่ายอดรวม", 400, "INVALID_DEPOSIT");
        }

        const remaining = Math.max(total - deposit, 0);
        const requestFingerprint = createHash("sha256").update(JSON.stringify({
            packageId: resolvedPackageId, eventDate, startTime, endTime, customerName, phone, line,
            eventType, guests, venueName, province, district, subdistrict, postalCode, address, googleMaps,
            note: stringValue(body.note, 3000),
        })).digest("hex");
        const bookingId = createHash("sha256").update(JSON.stringify([authUser.uid, clientRequestId])).digest("hex");
        const bookingRef = adminDb.collection("bookings").doc(bookingId);
        const dateLockRef = adminDb.collection("bookingDates").doc(eventDate);
        const auditRef = adminDb.collection("auditLogs").doc();
        const holdExpiresAt = Timestamp.fromMillis(Date.now() + 30 * 60 * 1000);

        const result = await adminDb.runTransaction(async (transaction) => {
            const dateSnapshot = await transaction.get(dateLockRef);
            const bookingSnapshot = await transaction.get(bookingRef);

            if (bookingSnapshot.exists) {
                const existing = bookingSnapshot.data() || {};
                if (existing.userId !== authUser.uid || existing.requestFingerprint !== requestFingerprint) {
                    throw new Error("REQUEST_ID_CONFLICT");
                }

                const existingStatus = stringValue(existing.bookingStatus, 100).toLowerCase();
                if (existingStatus === "cancelled" || existingStatus === "canceled") {
                    throw new Error("BOOKING_CANCELLED_RETRY");
                }

                const existingHoldExpired =
                    existingStatus === "expired" ||
                    (existingStatus === "pending_payment" &&
                        (timestampMillis(existing.holdExpiresAt) ?? Number.POSITIVE_INFINITY) <= Date.now());
                const existingUploadStartedAt = timestampMillis(existing.paymentUploadLock?.startedAt);
                const existingUploadInProgress = Boolean(
                    existingUploadStartedAt !== null && Date.now() - existingUploadStartedAt < 10 * 60 * 1000,
                );

                if (existingHoldExpired && !existingUploadInProgress) {
                    if (existingStatus === "pending_payment") {
                        transaction.update(bookingRef, {
                            bookingStatus: "expired",
                            expiredAt: FieldValue.serverTimestamp(),
                            expiredBy: "system",
                            updatedAt: FieldValue.serverTimestamp(),
                        });

                        if (dateSnapshot.exists && dateSnapshot.data()?.bookingId === bookingRef.id) {
                            transaction.update(dateLockRef, {
                                status: "released",
                                updatedAt: FieldValue.serverTimestamp(),
                            });
                        }
                    }

                    return { created: false, bookingId: bookingRef.id, expired: true };
                }

                return { created: false, bookingId: bookingRef.id, expired: false };
            }

            let expiredBookingRef: DocumentReference | null = null;

            if (dateSnapshot.exists) {
                const lock = dateSnapshot.data() || {};
                const status = stringValue(lock.status, 100).toLowerCase();
                if (!RELEASED_STATUSES.has(status)) {
                    const lockExpiresAt = timestampMillis(lock.holdExpiresAt);
                    const lockedBookingId = stringValue(lock.bookingId, 200);
                    if (status !== "reserved" || lockExpiresAt === null || lockExpiresAt > Date.now() || !lockedBookingId) {
                        throw new Error("DATE_ALREADY_BOOKED");
                    }

                    const lockedBookingRef = adminDb.collection("bookings").doc(lockedBookingId);
                    const lockedBookingSnapshot = await transaction.get(lockedBookingRef);
                    const lockedBooking = lockedBookingSnapshot.data() || {};
                    const uploadStartedAt = timestampMillis(lockedBooking.paymentUploadLock?.startedAt);
                    const bookingHoldExpiresAt = timestampMillis(lockedBooking.holdExpiresAt);
                    const uploadInProgress = Boolean(
                        uploadStartedAt !== null && Date.now() - uploadStartedAt < 10 * 60 * 1000,
                    );

                    if (
                        !lockedBookingSnapshot.exists ||
                        stringValue(lockedBooking.bookingStatus, 100).toLowerCase() !== "pending_payment" ||
                        bookingHoldExpiresAt === null ||
                        bookingHoldExpiresAt > Date.now() ||
                        uploadInProgress
                    ) {
                        throw new Error("DATE_ALREADY_BOOKED");
                    }

                    expiredBookingRef = lockedBookingRef;
                }
            }

            if (expiredBookingRef) {
                transaction.update(expiredBookingRef, {
                    bookingStatus: "expired",
                    expiredAt: FieldValue.serverTimestamp(),
                    expiredBy: "system",
                    updatedAt: FieldValue.serverTimestamp(),
                });
            }

            const bookingData = {
                userId: authUser.uid,
                bookingVersion: 1,
                requestFingerprint,
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                package: {
                    id: resolvedPackageId,
                    name: stringValue(packageRecord.title || packageRecord.name, 200) || packageId,
                    hours: canonicalPackageHours,
                    category: stringValue(packageRecord.category, 100),
                    group: stringValue(packageRecord.group, 100),
                    paperSize: stringValue(packageRecord.paperSize, 100),
                    price: canonicalPackagePrice,
                },
                event: {
                    date: eventDate,
                    startTime,
                    endTime,
                    durationHours: canonicalPackageHours,
                    type: eventType,
                    guests,
                },
                customer: {
                    name: customerName,
                    phone,
                    line,
                    email: authUser.email,
                },
                venue: {
                    name: venueName,
                    province,
                    district,
                    subdistrict,
                    postalCode,
                    address,
                    googleMaps,
                },
                pricing: {
                    packagePrice: canonicalPackagePrice,
                    travelFee,
                    discount,
                    total,
                    deposit,
                    remaining,
                },
                payment: {
                    status: "unpaid",
                    method: null,
                    proofUrl: null,
                    paidAmount: 0,
                    paidAt: null,
                    verifiedAt: null,
                    verifiedBy: null,
                },
                bookingStatus: "pending_payment",
                archiveStatus: "active",
                holdExpiresAt,
                note: stringValue(body.note, 3000),
            };

            transaction.set(dateLockRef, {
                date: eventDate,
                bookingId: bookingRef.id,
                status: "reserved",
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
                holdExpiresAt,
            });

            transaction.set(bookingRef, bookingData);

            transaction.set(auditRef, {
                action: "CREATE_BOOKING",
                resource: "booking",
                bookingId: bookingRef.id,
                userId: authUser.uid,
                email: authUser.email,
                eventDate,
                bookingStatus: "pending_payment",
                archiveStatus: "active",
                createdAt: FieldValue.serverTimestamp(),
            });

            return { created: true, bookingId: bookingRef.id, expired: false };
        });

        if (result.expired) {
            return errorResponse("เวลาพักคิวหมดแล้ว กรุณาลองจองอีกครั้ง", 409, "BOOKING_EXPIRED");
        }

        return NextResponse.json({
            success: true,
            created: result.created,
            bookingId: result.bookingId,
        });
    } catch (error: unknown) {
        console.error("KOKO CREATE BOOKING API ERROR:", error);

        const message = error instanceof Error ? error.message : "";

        switch (message) {
            case "UNAUTHORIZED":
                return errorResponse("กรุณาเข้าสู่ระบบก่อนทำรายการจอง", 401, "UNAUTHORIZED");
            case "INVALID_TOKEN":
                return errorResponse("เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่", 401, "INVALID_TOKEN");
            case "USER_DISABLED":
                return errorResponse("บัญชีนี้ถูกระงับการใช้งาน", 403, "USER_DISABLED");
            case "EMAIL_NOT_VERIFIED":
                return errorResponse("กรุณายืนยัน Email ก่อนทำรายการจอง", 403, "EMAIL_NOT_VERIFIED");
            case "EMAIL_MISSING":
                return errorResponse("ไม่พบ Email ของบัญชี", 400, "EMAIL_MISSING");
            case "REQUEST_ID_CONFLICT":
                return errorResponse("ไม่สามารถสร้างรายการจองนี้ได้ กรุณากลับไปทำรายการใหม่", 409, "REQUEST_ID_CONFLICT");
            case "BOOKING_CANCELLED_RETRY":
                return errorResponse("รายการจองเดิมถูกยกเลิกแล้ว กรุณากลับไปเลือกวันใหม่", 409, "BOOKING_CANCELLED_RETRY");
            case "DATE_ALREADY_BOOKED":
                return errorResponse("ขออภัย วันที่นี้มีลูกค้าท่านอื่นจองไปแล้ว กรุณากลับไปเลือกวันใหม่", 409, "DATE_ALREADY_BOOKED");
            default:
                return errorResponse("ไม่สามารถสร้างรายการจองได้ กรุณาลองใหม่อีกครั้ง", 500, "BOOKING_CREATE_FAILED");
        }
    }
}
