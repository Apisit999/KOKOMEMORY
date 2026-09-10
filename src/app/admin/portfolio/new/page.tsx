"use client";

import {
    ChangeEvent,
    DragEvent,
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
    ArrowLeft,
    Check,
    Image as ImageIcon,
    Loader2,
    Star,
    Upload,
    X,
} from "lucide-react";

import {
    createPortfolio,
    updatePortfolio,
    type PortfolioImage,
} from "@/services/portfolio.service";

import { auth } from "@/lib/firebase";


/* =========================================================
   Types
========================================================= */

type ImageItem = {
    id: string;
    file: File;
    preview: string;
    isCover: boolean;
};

type FormState = {
    title: string;
    description: string;
    category: string;
    eventDate: string;
    featured: boolean;
    status: "active" | "inactive";
};

type UploadResult = {
    success?: boolean;
    id?: string;
    url?: string;
    key?: string;
    name?: string;
    error?: string;
    code?: string;
};


/* =========================================================
   Constants
========================================================= */

const MAX_IMAGES = 30;

const MAX_FILE_SIZE =
    20 * 1024 * 1024;

const ACCEPTED_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
];


/* =========================================================
   Page
========================================================= */

export default function NewAdminPortfolioPage() {
    const router = useRouter();

    /* -------------------------------------------------------
       Form
    ------------------------------------------------------- */

    const [form, setForm] =
        useState<FormState>({
            title: "",
            description: "",
            category: "",
            eventDate: "",
            featured: false,
            status: "active",
        });


    /* -------------------------------------------------------
       Images
    ------------------------------------------------------- */

    const [images, setImages] =
        useState<ImageItem[]>([]);


    /* -------------------------------------------------------
       UI State
    ------------------------------------------------------- */

    const [dragActive, setDragActive] =
        useState(false);

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    const [success, setSuccess] =
        useState("");

    const [uploadProgress, setUploadProgress] =
        useState(0);

    const [currentUpload, setCurrentUpload] =
        useState(0);


    /* =====================================================
       Cover
    ===================================================== */

    const coverImage = useMemo(() => {
        return (
            images.find(
                (image) =>
                    image.isCover
            ) ??
            images[0] ??
            null
        );
    }, [images]);


    /* =====================================================
       Cleanup Preview URLs
    ===================================================== */

    useEffect(() => {
        return () => {
            images.forEach(
                (image) => {
                    URL.revokeObjectURL(
                        image.preview
                    );
                }
            );
        };
    }, []);


    /* =====================================================
       Form Helper
    ===================================================== */

    const updateField = <
        K extends keyof FormState
    >(
        field: K,
        value: FormState[K]
    ) => {
        setForm((current) => ({
            ...current,
            [field]: value,
        }));
    };


    /* =====================================================
       Error Helper
    ===================================================== */

    const showError = (
        message: string
    ) => {
        setError(message);
        setSuccess("");
    };


    /* =====================================================
       Validate File
    ===================================================== */

    const validateFile = (
        file: File
    ): string | null => {
        if (
            !ACCEPTED_TYPES.includes(
                file.type
            )
        ) {
            return (
                `${file.name} ไม่ใช่ไฟล์รูปภาพที่รองรับ ` +
                `(รองรับ JPG, PNG, WebP)`
            );
        }

        if (
            file.size >
            MAX_FILE_SIZE
        ) {
            return `${file.name} มีขนาดเกิน 20MB`;
        }

        if (
            file.size <= 0
        ) {
            return `${file.name} เป็นไฟล์ว่างเปล่า`;
        }

        return null;
    };


    /* =====================================================
       Add Files
    ===================================================== */

    const addFiles = (
        fileList: FileList | File[]
    ) => {
        showError("");

        const incoming =
            Array.from(
                fileList
            );

        if (
            incoming.length ===
            0
        ) {
            return;
        }

        const remaining =
            MAX_IMAGES -
            images.length;

        if (
            remaining <= 0
        ) {
            showError(
                `สามารถเพิ่มรูปได้สูงสุด ${MAX_IMAGES} รูป`
            );

            return;
        }

        const selected =
            incoming.slice(
                0,
                remaining
            );

        const validFiles: File[] =
            [];

        const invalidFiles: string[] =
            [];

        for (
            const file of selected
        ) {
            const validation =
                validateFile(
                    file
                );

            if (validation) {
                invalidFiles.push(
                    validation
                );
                continue;
            }

            validFiles.push(
                file
            );
        }

        if (
            invalidFiles.length >
            0
        ) {
            showError(
                invalidFiles[0]
            );
        }

        if (
            validFiles.length ===
            0
        ) {
            return;
        }

        const shouldSetCover =
            images.length === 0;

        const newImages =
            validFiles.map(
                (
                    file,
                    index
                ) => ({
                    id:
                        `${Date.now()}-${index}-${Math.random()
                            .toString(36)
                            .slice(2)}`,

                    file,

                    preview:
                        URL.createObjectURL(
                            file
                        ),

                    isCover:
                        shouldSetCover &&
                        index === 0,
                })
            );

        setImages(
            (current) => [
                ...current,
                ...newImages,
            ]
        );
    };


    /* =====================================================
       File Input
    ===================================================== */

    const handleFileChange = (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        if (
            event.target.files
        ) {
            addFiles(
                event.target.files
            );
        }

        /*
         * Reset input เพื่อให้สามารถ
         * เลือกไฟล์เดิมซ้ำได้
         */
        event.target.value = "";
    };


    /* =====================================================
       Drag & Drop
    ===================================================== */

    const handleDragEnter = (
        event: DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        event.stopPropagation();

        setDragActive(true);
    };


    const handleDragLeave = (
        event: DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        event.stopPropagation();

        /*
         * ป้องกัน dragleave ตอนลากผ่าน
         * child element
         */
        if (
            event.currentTarget ===
            event.target
        ) {
            setDragActive(false);
        }
    };


    const handleDragOver = (
        event: DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        event.stopPropagation();

        setDragActive(true);
    };


    const handleDrop = (
        event: DragEvent<HTMLDivElement>
    ) => {
        event.preventDefault();
        event.stopPropagation();

        setDragActive(false);

        if (
            event.dataTransfer.files
                ?.length
        ) {
            addFiles(
                event.dataTransfer.files
            );
        }
    };


    /* =====================================================
       Remove Image
    ===================================================== */

    const removeImage = (
        id: string
    ) => {
        if (saving) {
            return;
        }

        setImages((current) => {
            const target =
                current.find(
                    (image) =>
                        image.id ===
                        id
                );

            if (target) {
                URL.revokeObjectURL(
                    target.preview
                );
            }

            const next =
                current.filter(
                    (image) =>
                        image.id !==
                        id
                );

            /*
             * ถ้าลบ Cover
             * ให้รูปแรกเป็น Cover
             */
            if (
                target?.isCover &&
                next.length > 0
            ) {
                next[0] = {
                    ...next[0],
                    isCover: true,
                };
            }

            return next;
        });
    };


    /* =====================================================
       Set Cover
    ===================================================== */

    const setCover = (
        id: string
    ) => {
        if (saving) {
            return;
        }

        setImages((current) =>
            current.map(
                (image) => ({
                    ...image,
                    isCover:
                        image.id ===
                        id,
                })
            )
        );
    };


    /* =====================================================
       Move Image
    ===================================================== */

    const moveImage = (
        from: number,
        to: number
    ) => {
        if (saving) {
            return;
        }

        setImages((current) => {
            if (
                from < 0 ||
                from >=
                    current.length ||
                to < 0 ||
                to >=
                    current.length
            ) {
                return current;
            }

            const next = [
                ...current,
            ];

            const [
                moved,
            ] =
                next.splice(
                    from,
                    1
                );

            next.splice(
                to,
                0,
                moved
            );

            return next;
        });
    };


    /* =====================================================
       Safe JSON Parser
       
       สำคัญมาก:
       ป้องกัน error:
       Unexpected token '<'
       Unexpected token 'S'
       
       เพราะ API อาจตอบ HTML/Text
       แทน JSON ตอน Server Error
    ===================================================== */

    const parseApiResponse =
        async (
            response: Response
        ): Promise<UploadResult> => {
            const text =
                await response.text();

            if (!text) {
                return {
                    success:
                        response.ok,
                    error:
                        response.ok
                            ? undefined
                            : `Server Error (${response.status})`,
                };
            }

            try {
                const parsed =
                    JSON.parse(
                        text
                    );

                return (
                    parsed ??
                    {}
                );
            } catch {
                console.error(
                    "[Portfolio] API returned non-JSON:",
                    {
                        status:
                            response.status,
                        contentType:
                            response.headers.get(
                                "content-type"
                            ),
                        body:
                            text.slice(
                                0,
                                500
                            ),
                    }
                );

                return {
                    success:
                        response.ok,

                    error:
                        response.ok
                            ? "Server ส่งข้อมูลกลับมาไม่ถูกต้อง"
                            : `Server Error (${response.status})`,
                };
            }
        };


    /* =====================================================
       Upload Single Image
    ===================================================== */

    const uploadImage = async (
        portfolioId: string,
        image: ImageItem,
        index: number,
        token: string
    ): Promise<PortfolioImage> => {
        const body =
            new FormData();

        body.append(
            "file",
            image.file
        );

        body.append(
            "portfolioId",
            portfolioId
        );

        body.append(
            "order",
            String(index)
        );

        /*
         * ไม่กำหนด Content-Type เอง
         *
         * Browser จะสร้าง multipart boundary
         * ให้กับ FormData อัตโนมัติ
         */

        const response =
            await fetch(
                "/api/portfolio/upload",
                {
                    method: "POST",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },

                    body,

                    cache: "no-store",
                }
            );

        const result =
            await parseApiResponse(
                response
            );

        if (
            !response.ok
        ) {
            if (
                response.status ===
                401
            ) {
                throw new Error(
                    "เซสชัน Admin หมดอายุ กรุณาเข้าสู่ระบบใหม่"
                );
            }

            if (
                response.status ===
                403
            ) {
                throw new Error(
                    result.code ===
                        "NOT_ADMIN"
                        ? "บัญชีนี้ไม่มีสิทธิ์ Admin"
                        : result.error ||
                          "ไม่มีสิทธิ์ดำเนินการ"
                );
            }

            throw new Error(
                result.error ||
                    `Upload รูปที่ ${
                        index + 1
                    } ไม่สำเร็จ`
            );
        }

        if (
            !result.url ||
            !result.key
        ) {
            throw new Error(
                `Server Upload รูปที่ ${
                    index + 1
                } สำเร็จแต่ไม่ได้ส่ง URL กลับมา`
            );
        }

        return {
            id:
                result.id ||
                `${portfolioId}-${index}`,

            url:
                result.url,

            key:
                result.key,

            name:
                result.name ||
                image.file.name,

            alt:
                form.title.trim(),

            order:
                index,
        };
    };


    /* =====================================================
       Submit
    ===================================================== */

    const handleSubmit = async (
        event: FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault();

        if (saving) {
            return;
        }

        setError("");
        setSuccess("");
        setUploadProgress(0);
        setCurrentUpload(0);


        /* -------------------------------------------------
           Validate Title
        ------------------------------------------------- */

        const title =
            form.title.trim();

        if (!title) {
            showError(
                "กรุณากรอกชื่อ Portfolio"
            );

            return;
        }

        if (
            title.length >
            150
        ) {
            showError(
                "ชื่อ Portfolio ยาวเกิน 150 ตัวอักษร"
            );

            return;
        }


        /* -------------------------------------------------
           Validate Description
        ------------------------------------------------- */

        const description =
            form.description.trim();

        if (
            description.length >
            5000
        ) {
            showError(
                "รายละเอียด Portfolio ยาวเกิน 5,000 ตัวอักษร"
            );

            return;
        }


        /* -------------------------------------------------
           Validate Images
        ------------------------------------------------- */

        if (
            images.length ===
            0
        ) {
            showError(
                "กรุณาเพิ่มรูปภาพอย่างน้อย 1 รูป"
            );

            return;
        }

        if (
            images.length >
            MAX_IMAGES
        ) {
            showError(
                `สามารถเพิ่มรูปได้สูงสุด ${MAX_IMAGES} รูป`
            );

            return;
        }


        /* -------------------------------------------------
           Validate Auth
        ------------------------------------------------- */

        const currentUser =
            auth.currentUser;

        if (!currentUser) {
            showError(
                "กรุณาเข้าสู่ระบบ Admin ก่อน"
            );

            return;
        }


        /* =================================================
           Start
        ================================================= */

        let portfolioId:
            string | null = null;

        try {
            setSaving(true);


            /* -------------------------------------------------
               Refresh Token
            ------------------------------------------------- */

            const token =
                await currentUser.getIdToken(
                    true
                );

            if (!token) {
                throw new Error(
                    "ไม่สามารถสร้าง Firebase ID Token ได้"
                );
            }


            /* -------------------------------------------------
               1. Create Portfolio Document
            ------------------------------------------------- */

            portfolioId =
                await createPortfolio({
                    title,

                    description,

                    category:
                        form.category.trim(),

                    eventDate:
                        form.eventDate,

                    coverImage:
                        "",

                    images:
                        [],

                    featured:
                        form.featured,

                    status:
                        form.status,
                });


            if (
                !portfolioId
            ) {
                throw new Error(
                    "ไม่สามารถสร้าง Portfolio ID ได้"
                );
            }


            /* -------------------------------------------------
               2. Upload Images
            ------------------------------------------------- */

            const uploadedImages:
                PortfolioImage[] =
                [];

            for (
                let index = 0;
                index <
                images.length;
                index++
            ) {
                const image =
                    images[index];

                setCurrentUpload(
                    index + 1
                );

                setUploadProgress(
                    Math.round(
                        (index /
                            images.length) *
                            100
                    )
                );

                const uploaded =
                    await uploadImage(
                        portfolioId,
                        image,
                        index,
                        token
                    );

                uploadedImages.push(
                    uploaded
                );

                setUploadProgress(
                    Math.round(
                        ((index + 1) /
                            images.length) *
                            100
                    )
                );
            }


            /* -------------------------------------------------
               3. Cover
            ------------------------------------------------- */

            const coverIndex =
                Math.max(
                    0,
                    images.findIndex(
                        (
                            image
                        ) =>
                            image.isCover
                    )
                );

            const finalCover =
                uploadedImages[
                    coverIndex
                ]?.url ||
                uploadedImages[0]
                    ?.url ||
                "";


            if (
                !finalCover
            ) {
                throw new Error(
                    "ไม่พบ URL ของ Cover Image"
                );
            }


            /* -------------------------------------------------
               4. Update Portfolio
            ------------------------------------------------- */

            await updatePortfolio(
                portfolioId,
                {
                    coverImage:
                        finalCover,

                    images:
                        uploadedImages,
                }
            );


            /* -------------------------------------------------
               5. Success
            ------------------------------------------------- */

            setUploadProgress(
                100
            );

            setSuccess(
                "สร้าง Portfolio สำเร็จ"
            );


            /*
             * เปลี่ยนหน้าเล็กน้อยหลังจาก
             * Firestore update สำเร็จ
             */

            window.setTimeout(
                () => {
                    router.push(
                        `/admin/portfolio/${portfolioId}`
                    );

                    router.refresh();
                },
                700
            );
        } catch (err) {
            console.error(
                "[Portfolio] Create error:",
                err
            );


            /* -------------------------------------------------
               Friendly Error
            ------------------------------------------------- */

            let message =
                "ไม่สามารถสร้าง Portfolio ได้";

            if (
                err instanceof Error
            ) {
                message =
                    err.message;
            }


            /*
             * ถ้าเป็น error จาก API
             * ไม่แสดง HTML / stack trace
             */

            if (
                message.includes(
                    "<!DOCTYPE"
                ) ||
                message.includes(
                    "<html"
                )
            ) {
                message =
                    "Server เกิดข้อผิดพลาดระหว่าง Upload รูป กรุณาตรวจสอบ Terminal";
            }


            showError(
                message
            );


            /*
             * สำคัญ:
             *
             * ถ้าสร้าง Firestore document
             * แล้ว Upload ล้มเหลว
             *
             * ตอนนี้เราจะไม่ redirect
             * เพื่อให้ผู้ใช้เห็น Error
             *
             * Document ที่สร้างไว้ยังอยู่
             * และสามารถใช้หน้า Edit
             * จัดการต่อได้
             *
             * ไม่เรียก deletePortfolio
             * แบบสุ่ม เพราะอาจทำลายข้อมูล
             * ที่ Upload สำเร็จไปแล้วบางส่วน
             */
        } finally {
            setSaving(false);
        }
    };


    /* =====================================================
       Render
    ===================================================== */

    return (
        <main className="mx-auto w-full max-w-6xl space-y-6 pb-12">

            {/* =================================================
                Header
            ================================================= */}

            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                <div>
                    <Link
                        href="/admin/portfolio"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-pink-500"
                    >
                        <ArrowLeft
                            size={16}
                        />

                        กลับ Portfolio
                    </Link>

                    <div className="mt-5">

                        <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">
                            Content Management
                        </p>

                        <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                            เพิ่ม Portfolio
                        </h1>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                            สร้างผลงานใหม่สำหรับแสดงบนเว็บไซต์ KOKOwedding
                        </p>

                    </div>
                </div>

            </header>


            {/* =================================================
                Error
            ================================================= */}

            {error && (
                <div
                    role="alert"
                    className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
                >
                    {error}
                </div>
            )}


            {/* =================================================
                Success
            ================================================= */}

            {success && (
                <div
                    role="status"
                    className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-700"
                >
                    {success}
                </div>
            )}


            {/* =================================================
                Upload Progress
            ================================================= */}

            {saving && images.length > 0 && (
                <div className="rounded-2xl border border-pink-100 bg-pink-50 p-4">

                    <div className="flex items-center justify-between gap-4">

                        <div className="flex items-center gap-3">

                            <Loader2
                                size={18}
                                className="animate-spin text-pink-500"
                            />

                            <div>
                                <p className="text-sm font-black text-slate-900">
                                    กำลังบันทึก Portfolio
                                </p>

                                <p className="mt-1 text-xs text-slate-500">
                                    Upload รูป{" "}
                                    {currentUpload} /{" "}
                                    {images.length}
                                </p>
                            </div>

                        </div>

                        <span className="text-sm font-black text-pink-500">
                            {uploadProgress}%
                        </span>

                    </div>

                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">

                        <div
                            className="h-full rounded-full bg-pink-500 transition-all duration-300"
                            style={{
                                width: `${uploadProgress}%`,
                            }}
                        />

                    </div>

                </div>
            )}


            <form
                onSubmit={
                    handleSubmit
                }
                className="space-y-6"
            >

                {/* =================================================
                    Basic Information
                ================================================= */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-6">

                        <h2 className="text-lg font-black text-slate-900">
                            ข้อมูล Portfolio
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            ข้อมูลหลักของผลงาน
                        </p>

                    </div>


                    <div className="grid gap-5">

                        {/* Title */}

                        <div>

                            <label
                                htmlFor="portfolio-title"
                                className="mb-2 block text-sm font-bold text-slate-700"
                            >
                                ชื่อ Portfolio
                                <span className="ml-1 text-red-500">
                                    *
                                </span>
                            </label>

                            <input
                                id="portfolio-title"
                                value={
                                    form.title
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateField(
                                        "title",
                                        event.target.value
                                    )
                                }
                                maxLength={150}
                                disabled={saving}
                                autoComplete="off"
                                placeholder="เช่น Wedding Ceremony — KOKO Memory"
                                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            <div className="mt-1 text-right text-[11px] text-slate-400">
                                {form.title.length}/150
                            </div>

                        </div>


                        {/* Description */}

                        <div>

                            <label
                                htmlFor="portfolio-description"
                                className="mb-2 block text-sm font-bold text-slate-700"
                            >
                                รายละเอียด
                            </label>

                            <textarea
                                id="portfolio-description"
                                value={
                                    form.description
                                }
                                onChange={(
                                    event
                                ) =>
                                    updateField(
                                        "description",
                                        event.target.value
                                    )
                                }
                                maxLength={5000}
                                rows={5}
                                disabled={saving}
                                placeholder="รายละเอียดเกี่ยวกับงานนี้..."
                                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                            />

                            <div className="mt-1 text-right text-[11px] text-slate-400">
                                {form.description.length}/5000
                            </div>

                        </div>


                        {/* Category + Date */}

                        <div className="grid gap-5 sm:grid-cols-2">

                            <div>

                                <label
                                    htmlFor="portfolio-category"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    Category
                                </label>

                                <input
                                    id="portfolio-category"
                                    value={
                                        form.category
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "category",
                                            event.target.value
                                        )
                                    }
                                    disabled={saving}
                                    placeholder="Wedding / Pre-Wedding / Event"
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                                />

                            </div>


                            <div>

                                <label
                                    htmlFor="portfolio-event-date"
                                    className="mb-2 block text-sm font-bold text-slate-700"
                                >
                                    วันที่จัดงาน
                                </label>

                                <input
                                    id="portfolio-event-date"
                                    type="date"
                                    value={
                                        form.eventDate
                                    }
                                    onChange={(
                                        event
                                    ) =>
                                        updateField(
                                            "eventDate",
                                            event.target.value
                                        )
                                    }
                                    disabled={saving}
                                    className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white focus:ring-4 focus:ring-pink-50 disabled:cursor-not-allowed disabled:opacity-60"
                                />

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    Image Upload
                ================================================= */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">

                        <div>

                            <h2 className="text-lg font-black text-slate-900">
                                รูปภาพ Portfolio
                            </h2>

                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                เพิ่มรูปได้สูงสุด{" "}
                                {MAX_IMAGES} รูป
                                และเลือก Cover
                                สำหรับแสดงเป็นรูปหลัก
                            </p>

                        </div>

                        <div className="text-xs font-bold text-slate-400">
                            {images.length} / {MAX_IMAGES} รูป
                        </div>

                    </div>


                    {/* Upload Zone */}

                    <div
                        onDragEnter={
                            handleDragEnter
                        }
                        onDragLeave={
                            handleDragLeave
                        }
                        onDragOver={
                            handleDragOver
                        }
                        onDrop={
                            handleDrop
                        }
                        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition sm:p-12 ${
                            dragActive
                                ? "border-pink-400 bg-pink-50"
                                : "border-slate-200 bg-slate-50 hover:border-pink-300 hover:bg-pink-50/40"
                        }`}
                    >

                        <input
                            id="portfolio-images"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            multiple
                            onChange={
                                handleFileChange
                            }
                            disabled={
                                saving ||
                                images.length >=
                                    MAX_IMAGES
                            }
                            className="hidden"
                        />

                        <label
                            htmlFor="portfolio-images"
                            className={`block ${
                                saving
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer"
                            }`}
                        >

                            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm">
                                <Upload
                                    size={28}
                                />
                            </div>

                            <h3 className="mt-5 text-base font-black text-slate-900">
                                คลิกเพื่อเลือกรูป
                            </h3>

                            <p className="mt-2 text-sm text-slate-500">
                                หรือลากรูปมาวางที่นี่
                            </p>

                            <p className="mt-3 text-xs text-slate-400">
                                JPG, PNG, WebP
                                • สูงสุด 20MB ต่อรูป
                            </p>

                        </label>

                    </div>


                    {/* Image List */}

                    {images.length > 0 && (
                        <div className="mt-6">

                            <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">

                                <h3 className="text-sm font-black text-slate-800">
                                    รูปที่เลือก
                                </h3>

                                <span className="text-xs text-slate-400">
                                    เลือก Cover ได้ 1 รูป
                                </span>

                            </div>


                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

                                {images.map(
                                    (
                                        image,
                                        index
                                    ) => (
                                        <div
                                            key={
                                                image.id
                                            }
                                            className={`group relative overflow-hidden rounded-2xl border-2 bg-slate-100 ${
                                                image.isCover
                                                    ? "border-pink-400"
                                                    : "border-slate-200"
                                            }`}
                                        >

                                            <div className="aspect-square">

                                                <img
                                                    src={
                                                        image.preview
                                                    }
                                                    alt={
                                                        image.file.name
                                                    }
                                                    className="h-full w-full object-cover"
                                                />

                                            </div>


                                            {/* Number */}

                                            <div className="absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs font-black text-white backdrop-blur">
                                                {index + 1}
                                            </div>


                                            {/* Cover */}

                                            {image.isCover && (
                                                <div className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-pink-500 px-2.5 py-1 text-[10px] font-black text-white shadow">
                                                    <Star
                                                        size={11}
                                                        fill="currentColor"
                                                    />
                                                    COVER
                                                </div>
                                            )}


                                            {/* Delete */}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeImage(
                                                        image.id
                                                    )
                                                }
                                                disabled={
                                                    saving
                                                }
                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-red-500 opacity-100 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
                                                aria-label={`ลบรูป ${index + 1}`}
                                            >
                                                <X
                                                    size={15}
                                                />
                                            </button>


                                            {/* Controls */}

                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-10">

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setCover(
                                                            image.id
                                                        )
                                                    }
                                                    disabled={
                                                        saving ||
                                                        image.isCover
                                                    }
                                                    className={`flex h-8 w-full items-center justify-center gap-1 rounded-lg text-[10px] font-black transition ${
                                                        image.isCover
                                                            ? "bg-pink-500 text-white"
                                                            : "bg-white/90 text-slate-700 hover:bg-white"
                                                    } disabled:cursor-default`}
                                                >

                                                    <Star
                                                        size={12}
                                                        fill={
                                                            image.isCover
                                                                ? "currentColor"
                                                                : "none"
                                                        }
                                                    />

                                                    {image.isCover
                                                        ? "Cover"
                                                        : "ตั้ง Cover"}

                                                </button>

                                            </div>

                                        </div>
                                    )
                                )}

                            </div>

                        </div>
                    )}


                    {/* Empty */}

                    {images.length === 0 && (
                        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 px-5 py-10 text-center">

                            <ImageIcon
                                size={32}
                                className="mx-auto text-slate-300"
                            />

                            <p className="mt-3 text-sm font-semibold text-slate-500">
                                ยังไม่มีรูปภาพ
                            </p>

                        </div>
                    )}


                    {/* Reorder */}

                    {images.length > 1 && (
                        <div className="mt-5 rounded-xl bg-slate-50 p-4">

                            <div className="flex flex-col gap-3">

                                <div>

                                    <p className="text-xs font-black text-slate-700">
                                        ลำดับรูป
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        ใช้ปุ่ม ← → เพื่อจัดลำดับรูป
                                    </p>

                                </div>


                                <div className="flex flex-wrap gap-2">

                                    {images.map(
                                        (
                                            image,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    image.id
                                                }
                                                className="flex items-center gap-1"
                                            >

                                                <button
                                                    type="button"
                                                    disabled={
                                                        saving ||
                                                        index ===
                                                            0
                                                    }
                                                    onClick={() =>
                                                        moveImage(
                                                            index,
                                                            index -
                                                                1
                                                        )
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                                    aria-label={`เลื่อนรูป ${index + 1} ขึ้น`}
                                                >
                                                    ←
                                                </button>

                                                <span className="min-w-6 text-center text-xs font-black text-slate-600">
                                                    {index + 1}
                                                </span>

                                                <button
                                                    type="button"
                                                    disabled={
                                                        saving ||
                                                        index ===
                                                            images.length -
                                                                1
                                                    }
                                                    onClick={() =>
                                                        moveImage(
                                                            index,
                                                            index +
                                                                1
                                                        )
                                                    }
                                                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                                                    aria-label={`เลื่อนรูป ${index + 1} ลง`}
                                                >
                                                    →
                                                </button>

                                            </div>
                                        )
                                    )}

                                </div>

                            </div>

                        </div>
                    )}

                </section>


                {/* =================================================
                    Settings
                ================================================= */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-6">

                        <h2 className="text-lg font-black text-slate-900">
                            การแสดงผล
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            กำหนดวิธีการแสดง Portfolio
                        </p>

                    </div>


                    <div className="grid gap-4 sm:grid-cols-2">

                        {/* Featured */}

                        <button
                            type="button"
                            disabled={
                                saving
                            }
                            onClick={() =>
                                updateField(
                                    "featured",
                                    !form.featured
                                )
                            }
                            className={`flex items-start gap-4 rounded-2xl border p-5 text-left transition ${
                                form.featured
                                    ? "border-amber-300 bg-amber-50"
                                    : "border-slate-200 bg-slate-50 hover:bg-white"
                            } disabled:cursor-not-allowed disabled:opacity-60`}
                        >

                            <div
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                                    form.featured
                                        ? "bg-amber-400 text-white"
                                        : "bg-white text-slate-400"
                                }`}
                            >
                                <Star
                                    size={20}
                                    fill={
                                        form.featured
                                            ? "currentColor"
                                            : "none"
                                    }
                                />
                            </div>

                            <div className="min-w-0">

                                <p className="font-black text-slate-900">
                                    Featured
                                </p>

                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    ทำให้ผลงานนี้เป็นผลงานเด่น
                                </p>

                                <div className="mt-2 text-xs font-black text-slate-700">
                                    {form.featured
                                        ? "เปิดใช้งาน"
                                        : "ปิดใช้งาน"}
                                </div>

                            </div>

                        </button>


                        {/* Status */}

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">

                            <div className="flex items-center gap-4">

                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500">
                                    {form.status ===
                                    "active" ? (
                                        <Check
                                            size={20}
                                        />
                                    ) : (
                                        <EyeOffIcon />
                                    )}
                                </div>


                                <div className="min-w-0 flex-1">

                                    <p className="font-black text-slate-900">
                                        Status
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        สถานะการแสดงผลงาน
                                    </p>

                                    <select
                                        value={
                                            form.status
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateField(
                                                "status",
                                                event.target.value as
                                                    | "active"
                                                    | "inactive"
                                            )
                                        }
                                        disabled={
                                            saving
                                        }
                                        className="mt-3 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-pink-300 disabled:opacity-60"
                                    >
                                        <option value="active">
                                            Active — แสดงบนเว็บไซต์
                                        </option>

                                        <option value="inactive">
                                            Inactive — ซ่อนไว้
                                        </option>

                                    </select>

                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    Preview
                ================================================= */}

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

                    <div className="mb-6">

                        <h2 className="text-lg font-black text-slate-900">
                            Preview
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                            ตัวอย่างข้อมูลก่อนบันทึก
                        </p>

                    </div>


                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">

                        <div className="grid lg:grid-cols-[1.1fr_1fr]">

                            <div className="aspect-[4/3] bg-slate-100 lg:aspect-auto lg:min-h-[320px]">

                                {coverImage ? (
                                    <img
                                        src={
                                            coverImage.preview
                                        }
                                        alt={
                                            form.title ||
                                            "Portfolio preview"
                                        }
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-slate-300">

                                        <ImageIcon
                                            size={48}
                                        />

                                        <p className="mt-3 text-xs font-semibold">
                                            Cover Preview
                                        </p>

                                    </div>
                                )}

                            </div>


                            <div className="flex flex-col justify-center p-6 sm:p-8">

                                <div className="flex flex-wrap gap-2">

                                    {form.category && (
                                        <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-500">
                                            {
                                                form.category
                                            }
                                        </span>
                                    )}

                                    {form.featured && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-600">

                                            <Star
                                                size={12}
                                                fill="currentColor"
                                            />

                                            Featured

                                        </span>
                                    )}

                                </div>


                                <h3 className="mt-4 text-2xl font-black text-slate-900">

                                    {form.title ||
                                        "ชื่อ Portfolio"}

                                </h3>


                                <p className="mt-3 text-sm leading-6 text-slate-500">

                                    {form.description ||
                                        "รายละเอียด Portfolio จะแสดงตรงนี้"}

                                </p>


                                {form.eventDate && (
                                    <p className="mt-4 text-xs font-semibold text-slate-400">
                                        Event Date:{" "}
                                        {
                                            form.eventDate
                                        }
                                    </p>
                                )}


                                <div className="mt-5 text-xs font-bold text-slate-400">
                                    {images.length}{" "}
                                    รูปภาพ
                                </div>

                            </div>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    Bottom Actions
                ================================================= */}

                <div className="sticky bottom-4 z-20">

                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:flex-row sm:justify-end">

                        <Link
                            href="/admin/portfolio"
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                        >
                            <X
                                size={17}
                            />

                            ยกเลิก
                        </Link>


                        <button
                            type="submit"
                            disabled={
                                saving
                            }
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >

                            {saving ? (
                                <>
                                    <Loader2
                                        size={17}
                                        className="animate-spin"
                                    />

                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Check
                                        size={17}
                                    />

                                    สร้าง Portfolio
                                </>
                            )}

                        </button>

                    </div>

                </div>

            </form>

        </main>
    );
}


/* =========================================================
   Eye Off Icon
========================================================= */

function EyeOffIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />

            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c5 0 8.27 4.17 9 7-.2.77-.57 1.53-1.1 2.23" />

            <path d="M6.61 6.61C4.62 7.93 3.3 9.75 3 12c.73 2.83 4 7 9 7a10.43 10.43 0 0 0 3.39-.61" />

            <line
                x1="3"
                y1="3"
                x2="21"
                y2="21"
            />
        </svg>
    );
}