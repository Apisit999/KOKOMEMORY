"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
    ArrowLeft,
    Check,
    ChevronDown,
    ChevronUp,
    Image as ImageIcon,
    Loader2,
    Save,
    Star,
    Trash2,
    Upload,
    X,
} from "lucide-react";

import { auth } from "@/lib/firebase";

import {
    getPortfolio,
    updatePortfolio,
    type Portfolio,
    type PortfolioImage,
    type PortfolioStatus,
} from "@/services/portfolio.service";

/* =========================================================
   Types
========================================================= */

type NewImage = {
    file: File;
    preview: string;
    name: string;
};

type UploadResponse = {
    id?: string;
    url?: string;
    key?: string;
    name?: string;
    error?: string;
};

/* =========================================================
   Helpers
========================================================= */

const MAX_FILE_SIZE = 20 * 1024 * 1024;

const ALLOWED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];

function isAllowedImage(file: File) {
    return (
        ALLOWED_TYPES.includes(file.type) &&
        file.size <= MAX_FILE_SIZE
    );
}

async function readJsonResponse(
    response: Response
): Promise<UploadResponse> {
    const text = await response.text();

    if (!text) {
        return {};
    }

    try {
        return JSON.parse(text);
    } catch {
        return {
            error: text.slice(0, 500),
        };
    }
}

/* =========================================================
   Page
========================================================= */

export default function EditAdminPortfolioPage() {
    const params = useParams();

    const portfolioId = Array.isArray(params?.id)
        ? params.id[0]
        : params?.id;

    const fileInputRef =
        useRef<HTMLInputElement>(null);

    /* -------------------------------------------------------
       Loading
    ------------------------------------------------------- */

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    /* -------------------------------------------------------
       Portfolio data
    ------------------------------------------------------- */

    const [portfolio, setPortfolio] =
        useState<Portfolio | null>(null);

    const [title, setTitle] =
        useState("");

    const [description, setDescription] =
        useState("");

    const [category, setCategory] =
        useState("");

    const [eventDate, setEventDate] =
        useState("");

    const [featured, setFeatured] =
        useState(false);

    const [status, setStatus] =
        useState<PortfolioStatus>("active");

    const [images, setImages] =
        useState<PortfolioImage[]>([]);

    const [newImages, setNewImages] =
        useState<NewImage[]>([]);

    /* =========================================================
       Load Portfolio
    ========================================================= */

    const loadPortfolio =
        useCallback(async () => {
            if (!portfolioId) {
                setError("ไม่พบ Portfolio ID");
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError("");

                const data =
                    await getPortfolio(
                        portfolioId
                    );

                if (!data) {
                    setError(
                        "ไม่พบ Portfolio นี้"
                    );
                    return;
                }

                setPortfolio(data);

                setTitle(data.title);
                setDescription(
                    data.description
                );
                setCategory(data.category);
                setEventDate(
                    data.eventDate
                );
                setFeatured(
                    data.featured
                );
                setStatus(data.status);

                setImages(
                    [...data.images].sort(
                        (a, b) =>
                            (a.order ?? 0) -
                            (b.order ?? 0)
                    )
                );
            } catch (err) {
                console.error(
                    "[Portfolio Edit] Load failed:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "ไม่สามารถโหลด Portfolio ได้"
                );
            } finally {
                setLoading(false);
            }
        }, [portfolioId]);

    useEffect(() => {
        loadPortfolio();
    }, [loadPortfolio]);

    /* =========================================================
       Image count
    ========================================================= */

    const totalImageCount = useMemo(
        () =>
            images.length +
            newImages.length,
        [images.length, newImages.length]
    );

    /* =========================================================
       New image selection
    ========================================================= */

    function handleSelectFiles(
        files: FileList | null
    ) {
        if (!files) return;

        setError("");

        const selected =
            Array.from(files);

        const invalid =
            selected.find(
                (file) =>
                    !isAllowedImage(file)
            );

        if (invalid) {
            setError(
                `ไฟล์ "${invalid.name}" ไม่รองรับ หรือมีขนาดเกิน 20MB`
            );
            return;
        }

        const previews =
            selected.map((file) => ({
                file,
                preview:
                    URL.createObjectURL(file),
                name: file.name,
            }));

        setNewImages((current) => [
            ...current,
            ...previews,
        ]);

        if (fileInputRef.current) {
            fileInputRef.current.value =
                "";
        }
    }

    function removeNewImage(index: number) {
        setNewImages((current) => {
            const item = current[index];

            if (item?.preview) {
                URL.revokeObjectURL(
                    item.preview
                );
            }

            return current.filter(
                (_, i) => i !== index
            );
        });
    }

    /* =========================================================
       Existing image ordering
    ========================================================= */

    function moveImage(
        index: number,
        direction: "up" | "down"
    ) {
        setImages((current) => {
            const target =
                direction === "up"
                    ? index - 1
                    : index + 1;

            if (
                target < 0 ||
                target >= current.length
            ) {
                return current;
            }

            const next = [...current];

            [
                next[index],
                next[target],
            ] = [
                next[target],
                next[index],
            ];

            return next.map(
                (image, imageIndex) => ({
                    ...image,
                    order: imageIndex,
                })
            );
        });
    }

    /* =========================================================
       Cover
    ========================================================= */

    function setCover(url: string) {
        setPortfolio((current) =>
            current
                ? {
                      ...current,
                      coverImage: url,
                  }
                : current
        );
    }

    /* =========================================================
       Delete existing image from R2
    ========================================================= */

    async function deleteR2Image(
        image: PortfolioImage
    ) {
        if (!image.key) {
            return;
        }

        const user =
            auth.currentUser;

        if (!user) {
            throw new Error(
                "กรุณาเข้าสู่ระบบก่อนใช้งาน"
            );
        }

        const token =
            await user.getIdToken();

        const response =
            await fetch(
                "/api/portfolio/upload",
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type":
                            "application/json",
                    },
                    body: JSON.stringify({
                        key: image.key,
                    }),
                }
            );

        const result =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                result.error ||
                    "ไม่สามารถลบรูปจาก R2 ได้"
            );
        }
    }

    /* =========================================================
       Remove existing image
    ========================================================= */

    async function removeExistingImage(
        index: number
    ) {
        const image = images[index];

        if (!image) return;

        const confirmed =
            window.confirm(
                `ต้องการลบรูป "${image.name || "รูปนี้"}" ใช่หรือไม่?\n\nรูปจะถูกลบออกจาก R2 ด้วย`
            );

        if (!confirmed) {
            return;
        }

        try {
            setError("");

            await deleteR2Image(image);

            setImages((current) => {
                const next =
                    current.filter(
                        (_, i) =>
                            i !== index
                    );

                return next.map(
                    (
                        item,
                        imageIndex
                    ) => ({
                        ...item,
                        order: imageIndex,
                    })
                );
            });

            /*
             * หากรูปที่ลบเป็น Cover
             * ให้เลือก Cover ใหม่เป็นรูปแรก
             */
            setPortfolio((current) => {
                if (
                    !current ||
                    current.coverImage !==
                        image.url
                ) {
                    return current;
                }

                const remaining =
                    images.filter(
                        (_, i) =>
                            i !== index
                    );

                return {
                    ...current,
                    coverImage:
                        remaining[0]
                            ?.url || "",
                };
            });
        } catch (err) {
            console.error(
                "[Portfolio Edit] Delete image failed:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "ไม่สามารถลบรูปได้"
            );
        }
    }

    /* =========================================================
       Upload new image
    ========================================================= */

    async function uploadNewImage(
        item: NewImage,
        order: number
    ): Promise<PortfolioImage> {
        const user =
            auth.currentUser;

        if (!user) {
            throw new Error(
                "กรุณาเข้าสู่ระบบก่อนใช้งาน"
            );
        }

        const token =
            await user.getIdToken(
                true
            );

        const body =
            new FormData();

        body.append(
            "file",
            item.file
        );

        if (!portfolioId) {
            throw new Error(
                "ไม่พบ Portfolio ID"
            );
        }

        body.append(
            "portfolioId",
            portfolioId
        );

        body.append(
            "order",
            String(order)
        );

        const response =
            await fetch(
                "/api/portfolio/upload",
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body,
                }
            );

        const result =
            await readJsonResponse(
                response
            );

        if (!response.ok) {
            throw new Error(
                result.error ||
                    `Upload failed (${response.status})`
            );
        }

        if (
            !result.url ||
            !result.key
        ) {
            throw new Error(
                "R2 upload สำเร็จแต่ไม่ได้รับ URL หรือ key"
            );
        }

        return {
            id: result.id,
            url: result.url,
            key: result.key,
            name:
                result.name ||
                item.name,
            order,
        };
    }

    /* =========================================================
       Save
    ========================================================= */

    async function handleSave() {
        if (!portfolioId) {
            setError(
                "ไม่พบ Portfolio ID"
            );
            return;
        }

        if (!title.trim()) {
            setError(
                "กรุณาระบุชื่อ Portfolio"
            );
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            /*
             * ตรวจ Auth
             */
            const user =
                auth.currentUser;

            if (!user) {
                throw new Error(
                    "กรุณาเข้าสู่ระบบก่อนใช้งาน"
                );
            }

            /*
             * 1. Upload รูปใหม่
             */
            const uploadedImages: PortfolioImage[] =
                [];

            if (newImages.length > 0) {
                for (
                    let index = 0;
                    index <
                    newImages.length;
                    index++
                ) {
                    const item =
                        newImages[index];

                    const uploaded =
                        await uploadNewImage(
                            item,
                            images.length +
                                index
                        );

                    uploadedImages.push(
                        uploaded
                    );
                }
            }

            /*
             * 2. รวมรูปเดิม + รูปใหม่
             */
            const finalImages = [
                ...images,
                ...uploadedImages,
            ].map(
                (image, index) => ({
                    ...image,
                    order: index,
                })
            );

            /*
             * 3. กำหนด Cover
             */
            let finalCover =
                portfolio
                    ?.coverImage || "";

            const existingCoverStillExists =
                finalImages.some(
                    (image) =>
                        image.url ===
                        finalCover
                );

            if (
                !existingCoverStillExists
            ) {
                finalCover =
                    finalImages[0]
                        ?.url || "";
            }

            /*
             * 4. Update Firestore
             */
            await updatePortfolio(
                portfolioId,
                {
                    title:
                        title.trim(),

                    description:
                        description.trim(),

                    category:
                        category.trim(),

                    eventDate:
                        eventDate.trim(),

                    coverImage:
                        finalCover,

                    images:
                        finalImages,

                    featured,

                    status,
                }
            );

            /*
             * 5. Update local state
             */
            setImages(finalImages);

            setPortfolio((current) =>
                current
                    ? {
                          ...current,
                          title: title.trim(),
                          description:
                              description.trim(),
                          category:
                              category.trim(),
                          eventDate:
                              eventDate.trim(),
                          coverImage:
                              finalCover,
                          images:
                              finalImages,
                          featured,
                          status,
                      }
                    : current
            );

            /*
             * 6. ล้างรายการรูปใหม่
             */
            newImages.forEach(
                (item) => {
                    if (item.preview) {
                        URL.revokeObjectURL(
                            item.preview
                        );
                    }
                }
            );

            setNewImages([]);

            setSuccess(
                "บันทึก Portfolio เรียบร้อยแล้ว"
            );

            window.scrollTo({
                top: 0,
                behavior: "smooth",
            });
        } catch (err) {
            console.error(
                "[Portfolio Edit] Save failed:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "ไม่สามารถบันทึก Portfolio ได้"
            );
        } finally {
            setSaving(false);
        }
    }

    /* =========================================================
       Cleanup previews
    ========================================================= */

    useEffect(() => {
        return () => {
            newImages.forEach(
                (item) => {
                    if (item.preview) {
                        URL.revokeObjectURL(
                            item.preview
                        );
                    }
                }
            );
        };
    }, [newImages]);

    /* =========================================================
       Loading UI
    ========================================================= */

    if (loading) {
        return (
            <main className="mx-auto w-full max-w-6xl">
                <div className="flex min-h-[500px] items-center justify-center">
                    <div className="text-center">
                        <Loader2
                            size={32}
                            className="mx-auto animate-spin text-pink-500"
                        />

                        <p className="mt-4 text-sm font-semibold text-slate-500">
                            กำลังโหลด Portfolio...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    /* =========================================================
       Error / not found
    ========================================================= */

    if (!portfolio) {
        return (
            <main className="mx-auto w-full max-w-4xl space-y-6">
                <Link
                    href="/admin/portfolio"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-pink-500"
                >
                    <ArrowLeft size={16} />
                    กลับ Portfolio
                </Link>

                <section className="rounded-3xl border border-red-200 bg-red-50 p-10 text-center">
                    <h1 className="text-2xl font-black text-slate-900">
                        ไม่พบ Portfolio
                    </h1>

                    <p className="mt-3 text-sm text-slate-600">
                        {error ||
                            "Portfolio ที่คุณกำลังแก้ไขไม่มีอยู่แล้ว"}
                    </p>
                </section>
            </main>
        );
    }

    /* =========================================================
       Main UI
    ========================================================= */

    return (
        <main className="mx-auto w-full max-w-6xl space-y-8 pb-16">
            {/* -------------------------------------------------
                Header
            ------------------------------------------------- */}

            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <Link
                        href="/admin/portfolio"
                        className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-pink-500"
                    >
                        <ArrowLeft size={16} />
                        กลับ Portfolio
                    </Link>

                    <div className="mb-3 text-xs font-black uppercase tracking-[0.28em] text-pink-500">
                        Content Management
                    </div>

                    <h1 className="font-serif text-4xl font-black tracking-tight text-slate-900">
                        แก้ไข Portfolio
                    </h1>

                    <p className="mt-2 text-sm text-slate-500">
                        แก้ไขรายละเอียดและจัดการรูปภาพของผลงาน
                    </p>
                </div>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-500 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? (
                        <Loader2
                            size={18}
                            className="animate-spin"
                        />
                    ) : (
                        <Save size={18} />
                    )}

                    {saving
                        ? "กำลังบันทึก..."
                        : "บันทึกการแก้ไข"}
                </button>
            </div>

            {/* -------------------------------------------------
                Alerts
            ------------------------------------------------- */}

            {error && (
                <div className="flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-600">
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() =>
                            setError("")
                        }
                        className="shrink-0"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-600">
                    <Check size={18} />
                    {success}
                </div>
            )}

            {/* -------------------------------------------------
                Basic information
            ------------------------------------------------- */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="mb-7">
                    <h2 className="text-xl font-black text-slate-900">
                        ข้อมูล Portfolio
                    </h2>

                    <p className="mt-1 text-sm text-slate-400">
                        ข้อมูลหลักของผลงาน
                    </p>
                </div>

                <div className="grid gap-6">
                    {/* Title */}

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            ชื่อ Portfolio{" "}
                            <span className="text-pink-500">
                                *
                            </span>
                        </label>

                        <input
                            value={title}
                            onChange={(event) =>
                                setTitle(
                                    event.target
                                        .value
                                )
                            }
                            maxLength={150}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                            placeholder="เช่น Wedding Ceremony"
                        />

                        <div className="mt-2 text-right text-xs text-slate-400">
                            {title.length}/150
                        </div>
                    </div>

                    {/* Description */}

                    <div>
                        <label className="mb-2 block text-sm font-bold text-slate-700">
                            รายละเอียด
                        </label>

                        <textarea
                            value={
                                description
                            }
                            onChange={(event) =>
                                setDescription(
                                    event.target
                                        .value
                                )
                            }
                            rows={5}
                            className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                            placeholder="รายละเอียดเกี่ยวกับผลงาน..."
                        />
                    </div>

                    {/* Category + Date */}

                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                ประเภทงาน
                            </label>

                            <input
                                value={
                                    category
                                }
                                onChange={(
                                    event
                                ) =>
                                    setCategory(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                                placeholder="เช่น Wedding, Event, Party"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-bold text-slate-700">
                                วันที่จัดงาน
                            </label>

                            <input
                                type="date"
                                value={
                                    eventDate
                                }
                                onChange={(
                                    event
                                ) =>
                                    setEventDate(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-semibold text-slate-900 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-100"
                            />
                        </div>
                    </div>

                    {/* Status */}

                    <div className="grid gap-4 md:grid-cols-2">
                        <button
                            type="button"
                            onClick={() =>
                                setFeatured(
                                    (value) =>
                                        !value
                                )
                            }
                            className={`flex items-center justify-between rounded-2xl border p-5 text-left transition ${
                                featured
                                    ? "border-pink-300 bg-pink-50"
                                    : "border-slate-200 bg-slate-50 hover:border-pink-200"
                            }`}
                        >
                            <div className="flex items-center gap-4">
                                <div
                                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                                        featured
                                            ? "bg-pink-500 text-white"
                                            : "bg-white text-slate-400"
                                    }`}
                                >
                                    <Star
                                        size={20}
                                        fill={
                                            featured
                                                ? "currentColor"
                                                : "none"
                                        }
                                    />
                                </div>

                                <div>
                                    <div className="font-black text-slate-900">
                                        Featured
                                    </div>

                                    <div className="mt-1 text-xs text-slate-500">
                                        แสดงเป็นผลงานเด่น
                                    </div>
                                </div>
                            </div>

                            <div
                                className={`h-6 w-11 rounded-full p-1 transition ${
                                    featured
                                        ? "bg-pink-500"
                                        : "bg-slate-300"
                                }`}
                            >
                                <div
                                    className={`h-4 w-4 rounded-full bg-white transition ${
                                        featured
                                            ? "translate-x-5"
                                            : ""
                                    }`}
                                />
                            </div>
                        </button>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                            <label className="mb-3 block text-sm font-black text-slate-900">
                                สถานะ
                            </label>

                            <div className="relative">
                                <select
                                    value={
                                        status
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        setStatus(
                                            event
                                                .target
                                                .value as PortfolioStatus
                                        )
                                    }
                                    className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-100"
                                >
                                    <option value="active">
                                        Active — แสดงบนเว็บไซต์
                                    </option>

                                    <option value="inactive">
                                        Inactive — ซ่อนจากเว็บไซต์
                                    </option>
                                </select>

                                <ChevronDown
                                    size={17}
                                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* -------------------------------------------------
                Images
            ------------------------------------------------- */}

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-900">
                            รูปภาพ Portfolio
                        </h2>

                        <p className="mt-1 text-sm text-slate-400">
                            เลือก Cover จัดลำดับ และเพิ่มรูปใหม่
                        </p>
                    </div>

                    <div className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                        {totalImageCount} รูป
                    </div>
                </div>

                {/* Existing images */}

                {images.length > 0 ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {images.map(
                            (
                                image,
                                index
                            ) => {
                                const isCover =
                                    portfolio.coverImage ===
                                    image.url;

                                return (
                                    <div
                                        key={
                                            image.id ||
                                            image.key ||
                                            `${image.url}-${index}`
                                        }
                                        className={`group overflow-hidden rounded-2xl border bg-white transition ${
                                            isCover
                                                ? "border-pink-400 ring-2 ring-pink-100"
                                                : "border-slate-200"
                                        }`}
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                                            <img
                                                src={
                                                    image.url
                                                }
                                                alt={
                                                    image.alt ||
                                                    image.name ||
                                                    `Portfolio image ${index + 1}`
                                                }
                                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                            />

                                            <div className="absolute left-3 top-3 rounded-full bg-black/60 px-3 py-1.5 text-xs font-black text-white backdrop-blur">
                                                #{index +
                                                    1}
                                            </div>

                                            {isCover && (
                                                <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-pink-500 px-3 py-1.5 text-xs font-black text-white shadow-lg">
                                                    <Star
                                                        size={
                                                            13
                                                        }
                                                        fill="currentColor"
                                                    />
                                                    Cover
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setCover(
                                                        image.url
                                                    )
                                                }
                                                className={`absolute inset-x-3 bottom-3 rounded-xl px-4 py-2.5 text-xs font-black backdrop-blur transition ${
                                                    isCover
                                                        ? "bg-white/90 text-pink-600"
                                                        : "bg-black/60 text-white opacity-0 group-hover:opacity-100"
                                                }`}
                                            >
                                                {isCover
                                                    ? "รูป Cover ปัจจุบัน"
                                                    : "ตั้งเป็น Cover"}
                                            </button>
                                        </div>

                                        <div className="p-3">
                                            <div className="mb-3 truncate text-xs font-bold text-slate-500">
                                                {image.name ||
                                                    `รูปที่ ${
                                                        index +
                                                        1
                                                    }`}
                                            </div>

                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex gap-1">
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveImage(
                                                                index,
                                                                "up"
                                                            )
                                                        }
                                                        disabled={
                                                            index ===
                                                            0
                                                        }
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-pink-200 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-30"
                                                        title="เลื่อนขึ้น"
                                                    >
                                                        <ChevronUp
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            moveImage(
                                                                index,
                                                                "down"
                                                            )
                                                        }
                                                        disabled={
                                                            index ===
                                                            images.length -
                                                                1
                                                        }
                                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-pink-200 hover:text-pink-500 disabled:cursor-not-allowed disabled:opacity-30"
                                                        title="เลื่อนลง"
                                                    >
                                                        <ChevronDown
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        removeExistingImage(
                                                            index
                                                        )
                                                    }
                                                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-400 transition hover:bg-red-50 hover:text-red-500"
                                                    title="ลบรูป"
                                                >
                                                    <Trash2
                                                        size={
                                                            17
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-16 text-center">
                        <ImageIcon
                            size={40}
                            className="mx-auto text-slate-300"
                        />

                        <p className="mt-4 text-sm font-bold text-slate-500">
                            ยังไม่มีรูปภาพ
                        </p>
                    </div>
                )}

                {/* New images */}

                {newImages.length > 0 && (
                    <div className="mt-8 border-t border-slate-100 pt-8">
                        <div className="mb-4 flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-pink-500" />

                            <h3 className="text-sm font-black text-slate-900">
                                รูปใหม่ที่รอ Upload
                            </h3>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                            {newImages.map(
                                (
                                    image,
                                    index
                                ) => (
                                    <div
                                        key={`${image.name}-${index}`}
                                        className="overflow-hidden rounded-2xl border border-pink-200 bg-pink-50"
                                    >
                                        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                                            <img
                                                src={
                                                    image.preview
                                                }
                                                alt={
                                                    image.name
                                                }
                                                className="h-full w-full object-cover"
                                            />

                                            <div className="absolute left-3 top-3 rounded-full bg-pink-500 px-3 py-1.5 text-xs font-black text-white">
                                                NEW
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeNewImage(
                                                        index
                                                    )
                                                }
                                                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-red-500 shadow-lg backdrop-blur"
                                            >
                                                <X
                                                    size={
                                                        17
                                                    }
                                                />
                                            </button>
                                        </div>

                                        <div className="truncate px-4 py-3 text-xs font-bold text-slate-600">
                                            {
                                                image.name
                                            }
                                        </div>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                {/* Add images */}

                <div className="mt-8">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={(event) =>
                            handleSelectFiles(
                                event.target
                                    .files
                            )
                        }
                    />

                    <button
                        type="button"
                        onClick={() =>
                            fileInputRef.current?.click()
                        }
                        className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-10 transition hover:border-pink-300 hover:bg-pink-50/50"
                    >
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm">
                            <Upload size={24} />
                        </div>

                        <div className="mt-4 text-sm font-black text-slate-700">
                            เพิ่มรูปภาพ
                        </div>

                        <div className="mt-1 text-xs text-slate-400">
                            JPG, PNG หรือ WebP · ไม่เกิน 20MB ต่อรูป
                        </div>
                    </button>
                </div>
            </section>

            {/* -------------------------------------------------
                Bottom save
            ------------------------------------------------- */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <Link
                    href="/admin/portfolio"
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black text-slate-600 transition hover:bg-slate-50"
                >
                    ยกเลิก
                </Link>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-pink-500 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {saving ? (
                        <Loader2
                            size={18}
                            className="animate-spin"
                        />
                    ) : (
                        <Save size={18} />
                    )}

                    {saving
                        ? "กำลังบันทึก..."
                        : "บันทึกการแก้ไข"}
                </button>
            </div>
        </main>
    );
}