import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET(
    request: Request,
    context: {
        params: Promise<{
            bookingId: string;
        }>;
    }
) {
    try {
        // =========================================
        // PARAMS
        // =========================================

        const { bookingId } = await context.params;

        if (!bookingId) {
            return NextResponse.json(
                {
                    success: false,
                    error: "ไม่พบ Booking ID",
                },
                { status: 400 }
            );
        }

        console.log("=================================");
        console.log("GALLERY API");
        console.log("Booking ID:", bookingId);
        console.log("=================================");

        // =========================================
        // FIRESTORE
        // bookings/{bookingId}/photos
        // =========================================

        const photosRef = adminDb
            .collection("bookings")
            .doc(bookingId)
            .collection("photos");

        const snapshot = await photosRef
            .orderBy("createdAt", "desc")
            .get();

        console.log(
            "Photos found:",
            snapshot.size
        );

        // =========================================
        // MAP PHOTOS
        // =========================================

        const photos = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                id: doc.id,

                bookingId,

                fileName:
                    data.fileName ||
                    "KOKO Memory Photo",

                key:
                    data.key ||
                    "",

                contentType:
                    data.contentType ||
                    "image/jpeg",

                size:
                    Number(data.size) || 0,

                url:
                    data.url ||
                    "",
            };
        });

        // =========================================
        // RETURN JSON
        // =========================================

        return NextResponse.json(
            {
                success: true,
                bookingId,
                count: photos.length,
                photos,
            },
            {
                status: 200,
                headers: {
                    "Cache-Control":
                        "no-store, no-cache, must-revalidate",
                },
            }
        );
    } catch (error) {
        console.error(
            "================================="
        );

        console.error(
            "GALLERY API ERROR:"
        );

        console.error(error);

        console.error(
            "================================="
        );

        return NextResponse.json(
            {
                success: false,

                error:
                    error instanceof Error
                        ? error.message
                        : "โหลด Gallery ไม่สำเร็จ",
            },
            {
                status: 500,
            }
        );
    }
}