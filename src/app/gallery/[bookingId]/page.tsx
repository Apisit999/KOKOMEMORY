"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Photo = {
    id: string;
    bookingId: string;
    fileName: string;
    key: string;
    contentType: string;
    size: number;
    url: string;
};

export default function GalleryPage() {
    const params = useParams();

    const bookingId = String(
        params.bookingId || ""
    );

    const [photos, setPhotos] =
        useState<Photo[]>([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [downloadingId, setDownloadingId] =
        useState("");

    // =========================================
    // LOAD GALLERY
    // =========================================

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            setError("ไม่พบ Booking ID");
            return;
        }

        async function loadGallery() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch(
                    `/api/gallery/${encodeURIComponent(
                        bookingId
                    )}`,
                    {
                        method: "GET",
                        cache: "no-store",
                    }
                );

                const text =
                    await response.text();

                let data: {
                    success?: boolean;
                    photos?: Photo[];
                    error?: string;
                    message?: string;
                };

                try {
                    data = JSON.parse(text);
                } catch {
                    console.error(
                        "API returned:",
                        text
                    );

                    throw new Error(
                        "API ไม่ได้ส่ง JSON กลับมา"
                    );
                }

                console.log(
                    "Gallery API:",
                    data
                );

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                        data.message ||
                        "โหลดรูปไม่สำเร็จ"
                    );
                }

                if (!data.success) {
                    throw new Error(
                        data.error ||
                        "โหลด Gallery ไม่สำเร็จ"
                    );
                }

                setPhotos(
                    Array.isArray(data.photos)
                        ? data.photos
                        : []
                );
            } catch (error) {
                console.error(
                    "Gallery error:",
                    error
                );

                setError(
                    error instanceof Error
                        ? error.message
                        : "เกิดข้อผิดพลาด"
                );
            } finally {
                setLoading(false);
            }
        }

        loadGallery();
    }, [bookingId]);

    // =========================================
    // DOWNLOAD
    // =========================================

    const handleDownload = async (
        photo: Photo
    ) => {
        if (!photo.id) {
            alert(
                "ไม่พบ Photo ID"
            );
            return;
        }

        try {
            setDownloadingId(photo.id);

            console.log(
                "Downloading photo:",
                photo.id
            );

            const downloadUrl =
                `/api/gallery/${encodeURIComponent(
                    bookingId
                )}/download/${encodeURIComponent(
                    photo.id
                )}`;

            console.log(
                "Download URL:",
                downloadUrl
            );

            const response =
                await fetch(downloadUrl);

            if (!response.ok) {
                let errorMessage =
                    "ดาวน์โหลดรูปไม่สำเร็จ";

                try {
                    const data =
                        await response.json();

                    errorMessage =
                        data.error ||
                        errorMessage;
                } catch {
                    // API ไม่ได้ส่ง JSON
                }

                throw new Error(
                    errorMessage
                );
            }

            const blob =
                await response.blob();

            if (blob.size === 0) {
                throw new Error(
                    "ไฟล์ที่ดาวน์โหลดมีขนาด 0"
                );
            }

            const blobUrl =
                window.URL.createObjectURL(
                    blob
                );

            const link =
                document.createElement("a");

            link.href = blobUrl;

            link.download =
                photo.fileName ||
                "koko-memory-photo.jpg";

            link.style.display = "none";

            document.body.appendChild(
                link
            );

            link.click();

            link.remove();

            // รอเล็กน้อยก่อน revoke
            setTimeout(() => {
                window.URL.revokeObjectURL(
                    blobUrl
                );
            }, 1000);

        } catch (error) {
            console.error(
                "Download error:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "ไม่สามารถบันทึกรูปได้"
            );
        } finally {
            setDownloadingId("");
        }
    };

    // =========================================
    // RENDER
    // =========================================

    return (
        <main className="min-h-screen bg-slate-50 px-6 py-12">

            <div className="mx-auto max-w-7xl">

                {/* HEADER */}

                <div className="mb-10 text-center">

                    <p className="text-sm font-semibold tracking-[0.35em] text-pink-500">
                        KOKO MEMORY
                    </p>

                    <h1 className="mt-3 text-4xl font-bold text-slate-900">
                        Your Photos
                    </h1>

                    <p className="mt-3 text-slate-500">
                        รูปภาพจากงานของคุณ
                    </p>

                    <div className="mt-5 inline-block rounded-full bg-pink-50 px-5 py-2">

                        <span className="text-sm text-pink-600">

                            Booking:{" "}

                            <span className="font-semibold">
                                {bookingId}
                            </span>

                        </span>

                    </div>

                </div>

                {/* LOADING */}

                {loading && (
                    <div className="flex min-h-[300px] items-center justify-center">

                        <div className="text-center">

                            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-pink-500" />

                            <p className="mt-4 text-slate-500">
                                กำลังโหลดรูป...
                            </p>

                        </div>

                    </div>
                )}

                {/* ERROR */}

                {!loading && error && (
                    <div className="mx-auto max-w-xl rounded-2xl bg-red-50 p-6 text-center">

                        <p className="font-semibold text-red-700">
                            โหลด Gallery ไม่สำเร็จ
                        </p>

                        <p className="mt-2 break-all text-sm text-red-500">
                            {error}
                        </p>

                        <button
                            onClick={() =>
                                window.location.reload()
                            }
                            className="mt-5 rounded-xl bg-pink-500 px-5 py-3 text-sm font-semibold text-white hover:bg-pink-400"
                        >
                            ลองใหม่
                        </button>

                    </div>
                )}

                {/* NO PHOTO */}

                {!loading &&
                    !error &&
                    photos.length === 0 && (

                        <div className="mx-auto max-w-xl rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">

                            <div className="text-5xl">
                                📷
                            </div>

                            <h2 className="mt-5 text-xl font-semibold text-slate-900">
                                ยังไม่มีรูป
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                Booking นี้ยังไม่มีรูปภาพ
                            </p>

                        </div>
                    )}

                {/* GALLERY */}

                {!loading &&
                    !error &&
                    photos.length > 0 && (

                        <div>

                            <div className="mb-6">

                                <h2 className="text-2xl font-bold text-slate-900">
                                    Gallery
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    {photos.length} รูป
                                </p>

                            </div>

                            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

                                {photos.map(
                                    (photo) => (

                                        <div
                                            key={photo.id}
                                            className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                                        >

                                            {/* IMAGE */}

                                            <div className="aspect-square bg-slate-100">

                                                <img
                                                    src={
                                                        photo.url
                                                    }
                                                    alt={
                                                        photo.fileName ||
                                                        "KOKO Memory Photo"
                                                    }
                                                    className="h-full w-full object-cover"
                                                />

                                            </div>

                                            {/* INFO */}

                                            <div className="p-4">

                                                <p className="truncate text-sm font-semibold text-slate-800">
                                                    {
                                                        photo.fileName
                                                    }
                                                </p>

                                                <p className="mt-1 text-xs text-slate-400">
                                                    {(
                                                        photo.size /
                                                        1024 /
                                                        1024
                                                    ).toFixed(
                                                        2
                                                    )}{" "}
                                                    MB
                                                </p>

                                                {/* OPEN */}

                                                <a
                                                    href={
                                                        photo.url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="mt-4 block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                                >
                                                    เปิดรูป
                                                </a>

                                                {/* DOWNLOAD */}

                                                <button
                                                    type="button"
                                                    disabled={
                                                        downloadingId ===
                                                        photo.id
                                                    }
                                                    onClick={() =>
                                                        handleDownload(
                                                            photo
                                                        )
                                                    }
                                                    className="mt-2 w-full rounded-xl bg-pink-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-pink-400 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    {downloadingId ===
                                                        photo.id
                                                        ? "กำลังบันทึก..."
                                                        : "บันทึกรูป"}
                                                </button>

                                            </div>

                                        </div>

                                    )
                                )}

                            </div>

                        </div>
                    )}

            </div>

        </main>
    );
}