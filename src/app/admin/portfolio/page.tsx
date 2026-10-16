"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
    Archive,
    CalendarDays,
    CheckCircle2,
    Eye,
    FileImage,
    FolderOpen,
    Image as ImageIcon,
    Loader2,
    Pencil,
    Plus,
    RefreshCw,
    Search,
    Star,
    Trash2,
    X,
    XCircle,
} from "lucide-react";


import { auth } from "@/lib/firebase";
import { adminApiFetch } from "@/lib/admin-api-client";

/* =========================================================
   TYPES
========================================================= */

type PortfolioStatus =
    | "active"
    | "inactive";

type PortfolioImage = {
    id?: string;
    url: string;
    key?: string;
    name?: string;
    alt?: string;
    order?: number;
};

type PortfolioItem = {
    id: string;
    title: string;
    description: string;
    category: string;
    eventDate: string;
    coverImage: string;
    images: PortfolioImage[];
    featured: boolean;
    status: PortfolioStatus;
    createdAt?: unknown;
    updatedAt?: unknown;
};

/* =========================================================
   HELPERS
========================================================= */

function normalizePortfolio(
    id: string,
    data: Record<string, unknown>
): PortfolioItem {
    const rawImages = Array.isArray(
        data.images
    )
        ? data.images
        : [];

    const images: PortfolioImage[] =
        rawImages
            .filter(
                (
                    image
                ): image is Record<
                    string,
                    unknown
                > =>
                    Boolean(
                        image &&
                            typeof image ===
                                "object"
                    )
            )
            .map(
                (
                    image,
                    index
                ) => ({
                    id:
                        typeof image.id ===
                            "string"
                            ? image.id
                            : `${id}-${index}`,

                    url:
                        typeof image.url ===
                            "string"
                            ? image.url
                            : "",

                    key:
                        typeof image.key ===
                            "string"
                            ? image.key
                            : undefined,

                    name:
                        typeof image.name ===
                            "string"
                            ? image.name
                            : undefined,

                    alt:
                        typeof image.alt ===
                            "string"
                            ? image.alt
                            : undefined,

                    order:
                        typeof image.order ===
                            "number"
                            ? image.order
                            : index,
                })
            )
            .filter(
                (image) =>
                    Boolean(image.url)
            )
            .sort(
                (a, b) =>
                    (a.order ?? 0) -
                    (b.order ?? 0)
            );

    return {
        id,

        title:
            typeof data.title ===
            "string"
                ? data.title
                : "Untitled Portfolio",

        description:
            typeof data.description ===
            "string"
                ? data.description
                : "",

        category:
            typeof data.category ===
            "string"
                ? data.category
                : "",

        eventDate:
            typeof data.eventDate ===
            "string"
                ? data.eventDate
                : "",

        coverImage:
            typeof data.coverImage ===
            "string"
                ? data.coverImage
                : images[0]?.url ?? "",

        images,

        featured:
            data.featured === true,

        status:
            data.status === "inactive"
                ? "inactive"
                : "active",

        createdAt:
            data.createdAt,

        updatedAt:
            data.updatedAt,
    };
}

function formatDate(
    value: string
) {
    if (!value) {
        return "ไม่ระบุวันที่";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return value;
    }

    return new Intl.DateTimeFormat(
        "th-TH",
        {
            day: "numeric",
            month: "short",
            year: "numeric",
        }
    ).format(date);
}

function truncate(
    text: string,
    length = 110
) {
    if (
        text.length <=
        length
    ) {
        return text;
    }

    return `${text.slice(
        0,
        length
    )}...`;
}

/* =========================================================
   PAGE
========================================================= */

export default function AdminPortfolioPage() {
    const router = useRouter();

    /* -------------------------------------------------------
       State
    ------------------------------------------------------- */

    const [
        portfolios,
        setPortfolios,
    ] = useState<
        PortfolioItem[]
    >([]);

    const [
        loading,
        setLoading,
    ] = useState(true);

    const [
        refreshing,
        setRefreshing,
    ] = useState(false);

    const [
        search,
        setSearch,
    ] = useState("");

    const [
        categoryFilter,
        setCategoryFilter,
    ] = useState("all");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState<
        "all" | PortfolioStatus
    >("all");

    const [
        featuredOnly,
        setFeaturedOnly,
    ] = useState(false);

    const [
        error,
        setError,
    ] = useState("");

    const [
        actionError,
        setActionError,
    ] = useState("");

    const [
        deletingId,
        setDeletingId,
    ] = useState<string | null>(
        null
    );

    const [
        togglingId,
        setTogglingId,
    ] = useState<string | null>(
        null
    );

    const [
        previewItem,
        setPreviewItem,
    ] = useState<
        PortfolioItem | null
    >(null);

    /* -------------------------------------------------------
       Load realtime
    ------------------------------------------------------- */

    useEffect(() => {
        let cancelled = false;
        const loadPortfolios = () => adminApiFetch<{
            portfolios?: Array<Record<string, unknown> & { id: string }>;
        }>("/api/admin/portfolio")
            .then((result) => {
                if (cancelled) return;
                const items = (result.portfolios || [])
                    .map((item) => normalizePortfolio(item.id, item))
                    .sort((a, b) => (b.eventDate || "").localeCompare(a.eventDate || ""));
                setPortfolios(items);
                setLoading(false);
                setRefreshing(false);
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                console.error("Load portfolio error:", error);
                setError(error instanceof Error ? error.message : "ไม่สามารถโหลด Portfolio ได้");
                setLoading(false);
                setRefreshing(false);
            });

        void loadPortfolios();
        const refresh = () => { void loadPortfolios(); };
        window.addEventListener("koko:refresh-portfolio", refresh);
        return () => {
            cancelled = true;
            window.removeEventListener("koko:refresh-portfolio", refresh);
        };

        
    }, []);

    /* -------------------------------------------------------
       Refresh
    ------------------------------------------------------- */

    const handleRefresh =
        useCallback(() => {
            window.dispatchEvent(new Event("koko:refresh-portfolio"));
            setRefreshing(
                true
            );

            /*
             * onSnapshot จะอัปเดตเองอยู่แล้ว
             * เราใช้ state นี้เพื่อแสดง feedback
             */
            window.setTimeout(
                () => {
                    setRefreshing(
                        false
                    );
                },
                500
            );
        }, []);

    /* -------------------------------------------------------
       Categories
    ------------------------------------------------------- */

    const categories =
        useMemo(() => {
            const values =
                portfolios
                    .map(
                        (item) =>
                            item.category.trim()
                    )
                    .filter(
                        Boolean
                    );

            return Array.from(
                new Set(values)
            ).sort(
                (
                    a,
                    b
                ) =>
                    a.localeCompare(
                        b,
                        "th"
                    )
            );
        }, [
            portfolios,
        ]);

    /* -------------------------------------------------------
       Filter
    ------------------------------------------------------- */

    const filteredPortfolios =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return portfolios.filter(
                (item) => {
                    const matchesSearch =
                        !keyword ||
                        [
                            item.title,
                            item.description,
                            item.category,
                        ]
                            .join(" ")
                            .toLowerCase()
                            .includes(
                                keyword
                            );

                    const matchesCategory =
                        categoryFilter ===
                            "all" ||
                        item.category ===
                            categoryFilter;

                    const matchesStatus =
                        statusFilter ===
                            "all" ||
                        item.status ===
                            statusFilter;

                    const matchesFeatured =
                        !featuredOnly ||
                        item.featured;

                    return (
                        matchesSearch &&
                        matchesCategory &&
                        matchesStatus &&
                        matchesFeatured
                    );
                }
            );
        }, [
            portfolios,
            search,
            categoryFilter,
            statusFilter,
            featuredOnly,
        ]);

    /* -------------------------------------------------------
       Statistics
    ------------------------------------------------------- */

    const statistics =
        useMemo(() => {
            const total =
                portfolios.length;

            const active =
                portfolios.filter(
                    (item) =>
                        item.status ===
                        "active"
                ).length;

            const inactive =
                portfolios.filter(
                    (item) =>
                        item.status ===
                        "inactive"
                ).length;

            const featured =
                portfolios.filter(
                    (item) =>
                        item.featured
                ).length;

            const imageCount =
                portfolios.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        item.images
                            .length,
                    0
                );

            return {
                total,
                active,
                inactive,
                featured,
                imageCount,
            };
        }, [
            portfolios,
        ]);

    /* -------------------------------------------------------
       Toggle status
    ------------------------------------------------------- */

    const toggleStatus =
        async (
            item: PortfolioItem
        ) => {
            setActionError("");
            setTogglingId(
                item.id
            );

            try {
                await adminApiFetch(`/api/admin/portfolio/${encodeURIComponent(item.id)}`, {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: item.status === "active" ? "inactive" : "active",
                    }),
                });
            } catch (err) {
                console.error(
                    "Toggle portfolio status error:",
                    err
                );

                setActionError(
                    "ไม่สามารถเปลี่ยนสถานะ Portfolio ได้"
                );
            } finally {
                setTogglingId(
                    null
                );
            }
        };

    /* -------------------------------------------------------
       Delete R2 image
    ------------------------------------------------------- */

    const deleteR2Image =
        async (
            key: string,
            token: string
        ) => {
            try {
                const response =
                    await fetch(
                        "/api/portfolio/upload",
                        {
                            method: "DELETE",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                Authorization:
                                    `Bearer ${token}`,
                            },

                            body:
                                JSON.stringify(
                                    {
                                        key,
                                    }
                                ),
                        }
                    );

                /*
                 * อ่าน response แบบปลอดภัย
                 * เพราะ API อาจตอบ HTML ในกรณี
                 * server/build error
                 */
                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                let result:
                    | Record<
                          string,
                          unknown
                      >
                    | null =
                    null;

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {
                    result =
                        await response.json();
                } else {
                    const text =
                        await response.text();

                    throw new Error(
                        text.slice(
                            0,
                            200
                        )
                    );
                }

                if (
                    !response.ok
                ) {
                    throw new Error(
                        typeof result?.error ===
                            "string"
                            ? result.error
                            : "ลบไฟล์ R2 ไม่สำเร็จ"
                    );
                }
            } catch (err) {
                console.error(
                    "R2 delete error:",
                    err
                );

                throw err;
            }
        };

    /* -------------------------------------------------------
       Delete Portfolio
    ------------------------------------------------------- */

    const deletePortfolio =
        async (
            item: PortfolioItem
        ) => {
            const confirmed =
                window.confirm(
                    `ต้องการลบ Portfolio "${item.title}" ใช่หรือไม่?\n\nระบบจะพยายามลบรูปภาพจาก R2 ก่อนลบข้อมูล Portfolio`
                );

            if (!confirmed) {
                return;
            }

            setActionError("");
            setDeletingId(
                item.id
            );

            try {
                if (
                    !auth.currentUser
                ) {
                    throw new Error(
                        "กรุณาเข้าสู่ระบบ Admin ใหม่"
                    );
                }

                const token =
                    await auth.currentUser.getIdToken(
                        true
                    );

                /*
                 * ลบรูปจาก R2
                 *
                 * ถ้ารูปใดไม่มี key
                 * จะข้าม
                 */
                const imagesWithKeys =
                    item.images.filter(
                        (
                            image
                        ) =>
                            Boolean(
                                image.key
                            )
                    );

                for (
                    const image of imagesWithKeys
                ) {
                    if (
                        image.key
                    ) {
                        await deleteR2Image(
                            image.key,
                            token
                        );
                    }
                }

                /*
                 * ลบ Firestore Document
                 */
                await adminApiFetch(`/api/admin/portfolio/${encodeURIComponent(item.id)}`, {
                    method: "DELETE",
                });
            } catch (err) {
                console.error(
                    "Delete portfolio error:",
                    err
                );

                setActionError(
                    err instanceof Error
                        ? err.message
                        : "ไม่สามารถลบ Portfolio ได้"
                );
            } finally {
                setDeletingId(
                    null
                );
            }
        };

    /* -------------------------------------------------------
       Clear filters
    ------------------------------------------------------- */

    const clearFilters =
        () => {
            setSearch("");
            setCategoryFilter(
                "all"
            );
            setStatusFilter(
                "all"
            );
            setFeaturedOnly(
                false
            );
        };

    const hasFilters =
        Boolean(
            search ||
                categoryFilter !==
                    "all" ||
                statusFilter !==
                    "all" ||
                featuredOnly
        );

    /* =========================================================
       RENDER
    ========================================================= */

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6 pb-12">
            {/* =================================================
                Header
            ================================================= */}

            <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">
                        Content Management
                    </p>

                    <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                        Portfolio
                    </h1>

                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                        จัดการผลงานของ KOKOwedding
                        สำหรับแสดงบนเว็บไซต์
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={
                            handleRefresh
                        }
                        disabled={
                            refreshing ||
                            loading
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? "animate-spin"
                                    : ""
                            }
                        />
                        รีเฟรช
                    </button>

                    <Link
                        href="/admin/portfolio/new"
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white shadow-sm transition hover:bg-slate-800"
                    >
                        <Plus
                            size={18}
                        />
                        เพิ่ม Portfolio
                    </Link>
                </div>
            </header>

            {/* =================================================
                Error
            ================================================= */}

            {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    <XCircle
                        size={20}
                        className="mt-0.5 shrink-0"
                    />

                    <div>
                        <p>
                            {error}
                        </p>

                        <p className="mt-1 text-xs font-medium text-red-500">
                            ตรวจสอบ Firebase
                            Authentication และ
                            Firestore Rules
                        </p>
                    </div>
                </div>
            )}

            {actionError && (
                <div className="flex items-start justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                    <div className="flex items-start gap-3">
                        <XCircle
                            size={20}
                            className="mt-0.5 shrink-0"
                        />

                        <p>
                            {actionError}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setActionError(
                                ""
                            )
                        }
                        className="shrink-0 rounded-lg p-1 hover:bg-red-100"
                    >
                        <X
                            size={16}
                        />
                    </button>
                </div>
            )}

            {/* =================================================
                Statistics
            ================================================= */}

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
                <StatCard
                    icon={
                        <FolderOpen
                            size={20}
                        />
                    }
                    label="ทั้งหมด"
                    value={
                        statistics.total
                    }
                />

                <StatCard
                    icon={
                        <CheckCircle2
                            size={20}
                        />
                    }
                    label="Active"
                    value={
                        statistics.active
                    }
                    description="แสดงบนเว็บไซต์"
                />

                <StatCard
                    icon={
                        <Archive
                            size={20}
                        />
                    }
                    label="Inactive"
                    value={
                        statistics.inactive
                    }
                    description="ซ่อนไว้"
                />

                <StatCard
                    icon={
                        <Star
                            size={20}
                        />
                    }
                    label="Featured"
                    value={
                        statistics.featured
                    }
                    description="ผลงานเด่น"
                />

                <StatCard
                    icon={
                        <FileImage
                            size={20}
                        />
                    }
                    label="รูปภาพ"
                    value={
                        statistics.imageCount
                    }
                    description="รวมทั้งหมด"
                />
            </section>

            {/* =================================================
                Filters
            ================================================= */}

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    {/* Search */}

                    <div className="relative min-w-0 flex-1">
                        <Search
                            size={18}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                        />

                        <input
                            value={
                                search
                            }
                            onChange={(
                                event
                            ) =>
                                setSearch(
                                    event
                                        .target
                                        .value
                                )
                            }
                            placeholder="ค้นหาชื่อผลงาน รายละเอียด หรือ Category..."
                            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50"
                        />
                    </div>

                    {/* Category */}

                    <select
                        value={
                            categoryFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setCategoryFilter(
                                event
                                    .target
                                    .value
                            )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300 focus:bg-white"
                    >
                        <option value="all">
                            ทุก Category
                        </option>

                        {categories.map(
                            (
                                category
                            ) => (
                                <option
                                    key={
                                        category
                                    }
                                    value={
                                        category
                                    }
                                >
                                    {
                                        category
                                    }
                                </option>
                            )
                        )}
                    </select>

                    {/* Status */}

                    <select
                        value={
                            statusFilter
                        }
                        onChange={(
                            event
                        ) =>
                            setStatusFilter(
                                event
                                    .target
                                    .value as
                                    | "all"
                                    | PortfolioStatus
                            )
                        }
                        className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 outline-none focus:border-pink-300 focus:bg-white"
                    >
                        <option value="all">
                            ทุกสถานะ
                        </option>

                        <option value="active">
                            Active
                        </option>

                        <option value="inactive">
                            Inactive
                        </option>
                    </select>

                    {/* Featured */}

                    <button
                        type="button"
                        onClick={() =>
                            setFeaturedOnly(
                                (
                                    value
                                ) =>
                                    !value
                            )
                        }
                        className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-bold transition ${
                            featuredOnly
                                ? "border-amber-300 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                        }`}
                    >
                        <Star
                            size={16}
                            fill={
                                featuredOnly
                                    ? "currentColor"
                                    : "none"
                            }
                        />
                        Featured
                    </button>

                    {hasFilters && (
                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                        >
                            <X
                                size={16}
                            />
                            ล้าง
                        </button>
                    )}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-400">
                        แสดง{" "}
                        <span className="text-slate-700">
                            {
                                filteredPortfolios.length
                            }
                        </span>{" "}
                        จาก{" "}
                        <span className="text-slate-700">
                            {
                                portfolios.length
                            }
                        </span>{" "}
                        Portfolio
                    </p>

                    {hasFilters && (
                        <p className="text-xs font-semibold text-pink-500">
                            กำลังใช้ตัวกรอง
                        </p>
                    )}
                </div>
            </section>

            {/* =================================================
                Loading
            ================================================= */}

            {loading && (
                <section className="rounded-2xl border border-slate-200 bg-white py-20 text-center shadow-sm">
                    <Loader2
                        size={32}
                        className="mx-auto animate-spin text-pink-500"
                    />

                    <p className="mt-4 text-sm font-bold text-slate-600">
                        กำลังโหลด Portfolio...
                    </p>
                </section>
            )}

            {/* =================================================
                Empty
            ================================================= */}

            {!loading &&
                portfolios.length ===
                    0 && (
                    <section className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center shadow-sm">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50 text-pink-400">
                            <ImageIcon
                                size={
                                    30
                                }
                            />
                        </div>

                        <h2 className="mt-5 text-xl font-black text-slate-900">
                            ยังไม่มี Portfolio
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                            เริ่มสร้างผลงานแรกของ
                            KOKOwedding
                            เพื่อแสดงบนเว็บไซต์
                        </p>

                        <Link
                            href="/admin/portfolio/new"
                            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-black text-white transition hover:bg-slate-800"
                        >
                            <Plus
                                size={18}
                            />
                            เพิ่ม Portfolio
                        </Link>
                    </section>
                )}

            {/* =================================================
                Filter Empty
            ================================================= */}

            {!loading &&
                portfolios.length >
                    0 &&
                filteredPortfolios.length ===
                    0 && (
                    <section className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
                        <Search
                            size={32}
                            className="mx-auto text-slate-300"
                        />

                        <h2 className="mt-4 text-lg font-black text-slate-900">
                            ไม่พบ Portfolio
                        </h2>

                        <p className="mt-2 text-sm text-slate-500">
                            ลองเปลี่ยนคำค้นหาหรือตัวกรอง
                        </p>

                        <button
                            type="button"
                            onClick={
                                clearFilters
                            }
                            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 hover:bg-slate-50"
                        >
                            ล้างตัวกรอง
                        </button>
                    </section>
                )}

            {/* =================================================
                Portfolio Grid
            ================================================= */}

            {!loading &&
                filteredPortfolios.length >
                    0 && (
                    <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredPortfolios.map(
                            (
                                item
                            ) => (
                                <PortfolioCard
                                    key={
                                        item.id
                                    }
                                    item={
                                        item
                                    }
                                    deleting={
                                        deletingId ===
                                        item.id
                                    }
                                    toggling={
                                        togglingId ===
                                        item.id
                                    }
                                    onEdit={() =>
                                        router.push(
                                            `/admin/portfolio/${item.id}`
                                        )
                                    }
                                    onPreview={() =>
                                        setPreviewItem(
                                            item
                                        )
                                    }
                                    onToggle={() =>
                                        toggleStatus(
                                            item
                                        )
                                    }
                                    onDelete={() =>
                                        deletePortfolio(
                                            item
                                        )
                                    }
                                />
                            )
                        )}
                    </section>
                )}

            {/* =================================================
                Preview Modal
            ================================================= */}

            {previewItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
                    onMouseDown={(
                        event
                    ) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setPreviewItem(
                                null
                            );
                        }
                    }}
                >
                    <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
                            <div className="min-w-0">
                                <p className="text-xs font-black uppercase tracking-[0.15em] text-pink-500">
                                    Portfolio Preview
                                </p>

                                <h2 className="mt-1 truncate text-lg font-black text-slate-900">
                                    {
                                        previewItem.title
                                    }
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setPreviewItem(
                                        null
                                    )
                                }
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition hover:bg-slate-200"
                                aria-label="ปิด Preview"
                            >
                                <X
                                    size={
                                        18
                                    }
                                />
                            </button>
                        </div>

                        <div className="max-h-[calc(92vh-80px)] overflow-y-auto p-5 sm:p-6">
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {previewItem.images.map(
                                    (
                                        image,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                image.id ??
                                                `${previewItem.id}-${index}`
                                            }
                                            className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                                        >
                                            <div className="aspect-square">
                                                <img
                                                    src={
                                                        image.url
                                                    }
                                                    alt={
                                                        image.alt ||
                                                        previewItem.title
                                                    }
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between px-3 py-2">
                                                <span className="text-xs font-bold text-slate-500">
                                                    รูป{" "}
                                                    {index +
                                                        1}
                                                </span>

                                                {image.url ===
                                                    previewItem.coverImage && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-pink-500">
                                                        <Star
                                                            size={
                                                                11
                                                            }
                                                            fill="currentColor"
                                                        />
                                                        COVER
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
    icon,
    label,
    value,
    description,
}: {
    icon: React.ReactNode;
    label: string;
    value: number;
    description?: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                    {icon}
                </div>
            </div>

            <p className="mt-4 text-xs font-bold text-slate-400">
                {label}
            </p>

            <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">
                {value.toLocaleString(
                    "th-TH"
                )}
            </p>

            {description && (
                <p className="mt-1 text-[11px] font-semibold text-slate-400">
                    {description}
                </p>
            )}
        </div>
    );
}

/* =========================================================
   PORTFOLIO CARD
========================================================= */

function PortfolioCard({
    item,
    deleting,
    toggling,
    onEdit,
    onPreview,
    onToggle,
    onDelete,
}: {
    item: PortfolioItem;
    deleting: boolean;
    toggling: boolean;
    onEdit: () => void;
    onPreview: () => void;
    onToggle: () => void;
    onDelete: () => void;
}) {
    const cover =
        item.coverImage ||
        item.images[0]?.url ||
        "";

    return (
        <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            {/* Image */}

            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {cover ? (
                    <img
                        src={cover}
                        alt={
                            item.title
                        }
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center text-slate-300">
                        <ImageIcon
                            size={48}
                        />
                    </div>
                )}

                <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
                    <div className="flex flex-wrap gap-2">
                        <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-black shadow-sm backdrop-blur ${
                                item.status ===
                                "active"
                                    ? "bg-emerald-500/95 text-white"
                                    : "bg-slate-800/90 text-white"
                            }`}
                        >
                            {item.status ===
                            "active"
                                ? "ACTIVE"
                                : "INACTIVE"}
                        </span>

                        {item.featured && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 px-2.5 py-1 text-[10px] font-black text-white shadow-sm">
                                <Star
                                    size={
                                        11
                                    }
                                    fill="currentColor"
                                />
                                FEATURED
                            </span>
                        )}
                    </div>

                    <span className="rounded-full bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur">
                        {
                            item.images
                                .length
                        }{" "}
                        รูป
                    </span>
                </div>

                {/* Preview */}

                <button
                    type="button"
                    onClick={
                        onPreview
                    }
                    className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/95 text-slate-700 opacity-100 shadow-lg transition hover:bg-white sm:opacity-0 sm:group-hover:opacity-100"
                    aria-label="Preview Portfolio"
                >
                    <Eye
                        size={17}
                    />
                </button>
            </div>

            {/* Content */}

            <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        {item.category && (
                            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-pink-500">
                                {
                                    item.category
                                }
                            </p>
                        )}

                        <h2 className="mt-1 line-clamp-2 text-lg font-black leading-7 text-slate-900">
                            {
                                item.title
                            }
                        </h2>
                    </div>

                    {item.featured && (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                            <Star
                                size={
                                    17
                                }
                                fill="currentColor"
                            />
                        </div>
                    )}
                </div>

                <p className="mt-3 min-h-[42px] text-sm leading-6 text-slate-500">
                    {item.description
                        ? truncate(
                              item.description
                          )
                        : "ยังไม่มีรายละเอียด"}
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-400">
                    {item.eventDate && (
                        <span className="inline-flex items-center gap-1.5">
                            <CalendarDays
                                size={
                                    14
                                }
                            />
                            {formatDate(
                                item.eventDate
                            )}
                        </span>
                    )}

                    <span className="inline-flex items-center gap-1.5">
                        <FileImage
                            size={
                                14
                            }
                        />
                        {
                            item.images
                                .length
                        }{" "}
                        รูป
                    </span>
                </div>

                {/* Actions */}

                <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={
                            onEdit
                        }
                        disabled={
                            deleting ||
                            toggling
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-black text-white transition hover:bg-slate-800 disabled:opacity-50"
                    >
                        <Pencil
                            size={
                                15
                            }
                        />
                        แก้ไข
                    </button>

                    <button
                        type="button"
                        onClick={
                            onPreview
                        }
                        disabled={
                            deleting
                        }
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        <Eye
                            size={
                                15
                            }
                        />
                        ดูรูป
                    </button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={
                            onToggle
                        }
                        disabled={
                            deleting ||
                            toggling
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-bold text-slate-600 transition hover:bg-white disabled:opacity-50"
                    >
                        {toggling ? (
                            <Loader2
                                size={
                                    14
                                }
                                className="animate-spin"
                            />
                        ) : item.status ===
                          "active" ? (
                            <>
                                <XCircle
                                    size={
                                        14
                                    }
                                />
                                ซ่อน
                            </>
                        ) : (
                            <>
                                <CheckCircle2
                                    size={
                                        14
                                    }
                                />
                                เปิดแสดง
                            </>
                        )}
                    </button>

                    <button
                        type="button"
                        onClick={
                            onDelete
                        }
                        disabled={
                            deleting ||
                            toggling
                        }
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3 text-[11px] font-bold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                        {deleting ? (
                            <Loader2
                                size={
                                    14
                                }
                                className="animate-spin"
                            />
                        ) : (
                            <>
                                <Trash2
                                    size={
                                        14
                                    }
                                />
                                ลบ
                            </>
                        )}
                    </button>
                </div>
            </div>
        </article>
    );
}
