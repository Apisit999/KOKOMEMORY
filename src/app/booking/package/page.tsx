/**
 * ============================================================
 * KOKO Memory
 * Booking Step 1 : Package Selection
 * ============================================================
 *
 * Responsive:
 * Mobile  → 1 Card
 * Tablet  → 2 Cards
 * Desktop → 3 Cards
 *
 * รองรับ:
 * 📱 Mobile
 * 📱 Tablet
 * 💻 Laptop
 * 🖥️ Desktop
 * ============================================================
 */

"use client";

import Link from "next/link";
import {
    Suspense,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { useSearchParams } from "next/navigation";

import {
    ArrowRight,
    Camera,
    CheckCircle,
    Clock,
    Images,
    Loader2,
    Sparkles,
    Video,
} from "lucide-react";

import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useI18n } from "@/i18n";


/* ============================================================
   TYPE
============================================================ */

type PackageItem = {
    id: string;
    category: "photobooth" | "360";
    group: string;
    name: string;
    title: string;
    price: number;
    hours: number;
    popular?: boolean;
    paperSize?: string;
    features: string[];
};


/* ============================================================
   COMMON FEATURES
============================================================ */

const photoboothFeatures = [
    "ถ่ายภาพด้วยกล้อง DSLR Full Frame",
    "Print ภาพไม่จำกัด",
    "ออกแบบ Template ฟรี",
    "Backdrop หลากหลาย",
    "Props สำหรับถ่ายภาพ",
    "Studio Lighting",
    "QR Code สำหรับรับไฟล์",
    "Online Gallery",
];


/* ============================================================
   PACKAGE DATA
============================================================ */

const packages: PackageItem[] = [

    /* STARTER */

    {
        id: "photobooth-s",
        category: "photobooth",
        group: "starter",
        name: "S",
        title: "แพ็กเกจเริ่มต้น S",
        price: 7900,
        hours: 2,
        paperSize: "2x6",
        features: photoboothFeatures,
    },

    {
        id: "photobooth-m",
        category: "photobooth",
        group: "starter",
        name: "M",
        title: "แพ็กเกจเริ่มต้น M",
        price: 8900,
        hours: 3,
        paperSize: "2x6",
        popular: true,
        features: photoboothFeatures,
    },

    {
        id: "photobooth-l",
        category: "photobooth",
        group: "starter",
        name: "L",
        title: "แพ็กเกจเริ่มต้น L",
        price: 9900,
        hours: 4,
        paperSize: "2x6",
        features: photoboothFeatures,
    },


    /* STANDARD */

    {
        id: "photobooth-ss",
        category: "photobooth",
        group: "standard",
        name: "SS",
        title: "แพ็กเกจมาตรฐาน SS",
        price: 11900,
        hours: 2,
        paperSize: "4x6",
        features: photoboothFeatures,
    },

    {
        id: "photobooth-mm",
        category: "photobooth",
        group: "standard",
        name: "MM",
        title: "แพ็กเกจมาตรฐาน MM",
        price: 13900,
        hours: 3,
        paperSize: "4x6",
        popular: true,
        features: photoboothFeatures,
    },

    {
        id: "photobooth-ll",
        category: "photobooth",
        group: "standard",
        name: "LL",
        title: "แพ็กเกจมาตรฐาน LL",
        price: 15900,
        hours: 4,
        paperSize: "4x6",
        features: photoboothFeatures,
    },


    /* PREMIUM */

    {
        id: "photobooth-s1",
        category: "photobooth",
        group: "premium",
        name: "S1",
        title: "แพ็กเกจพรีเมียม S1",
        price: 12400,
        hours: 2,
        paperSize: "3x4",
        features: photoboothFeatures,
    },

    {
        id: "photobooth-m1",
        category: "photobooth",
        group: "premium",
        name: "M1",
        title: "แพ็กเกจพรีเมียม M1",
        price: 14400,
        hours: 3,
        paperSize: "3x4",
        popular: true,
        features: photoboothFeatures,
    },

    {
        id: "photobooth-l1",
        category: "photobooth",
        group: "premium",
        name: "L1",
        title: "แพ็กเกจพรีเมียม L1",
        price: 16400,
        hours: 4,
        paperSize: "3x4",
        features: photoboothFeatures,
    },


    /* 360 */

    {
        id: "360-2h",
        category: "360",
        group: "360",
        name: "2 HR",
        title: "360 Photobooth 2 ชั่วโมง",
        price: 5900,
        hours: 2,
        features: [
            "360 Photobooth",
            "ถ่ายภาพ / วิดีโอ 360 องศา",
            "ไฟ Studio",
            "รับไฟล์ผ่าน QR Code",
            "ทีมงานดูแลตลอดงาน",
        ],
    },

    {
        id: "360-3h",
        category: "360",
        group: "360",
        name: "3 HR",
        title: "360 Photobooth 3 ชั่วโมง",
        price: 6590,
        hours: 3,
        popular: true,
        features: [
            "360 Photobooth",
            "ถ่ายภาพ / วิดีโอ 360 องศา",
            "ไฟ Studio",
            "รับไฟล์ผ่าน QR Code",
            "ทีมงานดูแลตลอดงาน",
        ],
    },

    {
        id: "360-4h",
        category: "360",
        group: "360",
        name: "4 HR",
        title: "360 Photobooth 4 ชั่วโมง",
        price: 7590,
        hours: 4,
        features: [
            "360 Photobooth",
            "ถ่ายภาพ / วิดีโอ 360 องศา",
            "ไฟ Studio",
            "รับไฟล์ผ่าน QR Code",
            "ทีมงานดูแลตลอดงาน",
        ],
    },
];


/* ============================================================
   GROUP INFORMATION
============================================================ */

const groupInfo = {
    starter: {
        title: "แพ็กเกจเริ่มต้น",
        description:
            "เหมาะสำหรับงานขนาดเล็กและงานที่ต้องการความคุ้มค่า",
    },

    standard: {
        title: "แพ็กเกจมาตรฐาน",
        description:
            "ตัวเลือกยอดนิยมสำหรับงานแต่งงานและงานอีเวนต์",
    },

    premium: {
        title: "แพ็กเกจพรีเมียม",
        description:
            "สำหรับงานที่ต้องการภาพและบริการระดับพรีเมียม",
    },

    "360": {
        title: "360 Photobooth",
        description:
            "สร้างวิดีโอ 360 องศา ให้แขกสนุกกับงานมากยิ่งขึ้น",
    },
};


/* ============================================================
   PACKAGE ALIAS
============================================================ */

const packageAliases: Record<string, string> = {
    starter: "photobooth-s",
    premium: "photobooth-m",
    vip: "photobooth-m1",
};


/* ============================================================
   PACKAGE CARD
============================================================ */

function PackageCard({
    item,
    selected,
}: {
    item: PackageItem;
    selected: boolean;
}) {
    const { translate } = useI18n();
    return (
        <article
            id={`package-${item.id}`}
            className={`
                group
                relative
                flex
                min-w-0
                h-full
                flex-col
                overflow-hidden
                rounded-3xl
                border
                bg-white
                p-4
                shadow-sm
                transition-all
                duration-300

                sm:rounded-[2rem]
                sm:p-6

                lg:p-7

                hover:-translate-y-1
                hover:shadow-xl

                ${selected
                    ? "border-pink-500 ring-4 ring-pink-100 shadow-xl shadow-pink-100"
                    : item.popular
                        ? "border-pink-400 ring-2 ring-pink-100"
                        : "border-slate-200"
                }
            `}
        >

            {/* Selected */}

            {selected && (
                <div className="absolute left-3 top-3 z-10 rounded-full bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg sm:left-5 sm:top-5 sm:text-xs">
                    ✓ {translate("แพ็กเกจที่เลือก")}
                </div>
            )}


            {/* Popular */}

            {item.popular && (
                <div className="absolute right-3 top-3 z-10 rounded-full bg-pink-500 px-3 py-1.5 text-[11px] font-bold text-white shadow-lg sm:right-5 sm:top-5 sm:text-xs">
                    ⭐ {translate("แนะนำ")}
                </div>
            )}


            {/* Icon */}

            <div
                className={`
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-2xl

                    sm:h-14
                    sm:w-14

                    ${item.category === "360"
                        ? "bg-orange-100 text-orange-500"
                        : "bg-pink-100 text-pink-500"
                    }
                `}
            >
                {item.category === "360" ? (
                    <Video size={24} />
                ) : (
                    <Camera size={24} />
                )}
            </div>


            {/* Category */}

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-pink-500 sm:mt-6 sm:text-sm sm:tracking-[0.18em]">
                {item.category === "360"
                    ? "360 PHOTOBOOTH"
                    : translate(item.group).toUpperCase()}
            </p>


            {/* Name */}

            <h2 className="mt-2 text-3xl font-black leading-tight text-slate-900 sm:text-4xl">
                {item.name}
            </h2>


            {/* Title */}

            <p className="mt-2 min-h-[42px] text-sm leading-6 text-slate-500">
                {translate(item.title)}
            </p>


            {/* Price */}

            <div className="mt-6 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-2xl font-black text-pink-500 sm:text-3xl lg:text-4xl">
                    ฿{item.price.toLocaleString()}
                </span>

                <span className="text-xs text-slate-400 sm:text-sm">
                    / {translate("แพ็กเกจ")}
                </span>
            </div>


            {/* Duration */}

            <div className="mt-5 flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 sm:px-4">
                <Clock
                    size={18}
                    className="shrink-0 text-pink-500"
                />

                <span className="min-w-0 truncate">
                    {translate("ระยะเวลา")} {item.hours} {translate("ชั่วโมง")}
                </span>
            </div>


            {/* Paper */}

            {item.paperSize && (
                <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-sm text-slate-600 sm:px-4">
                    <Images
                        size={18}
                        className="shrink-0 text-pink-500"
                    />

                    <span className="min-w-0 truncate">
                        {translate("ขนาดรูป")} {item.paperSize}
                    </span>
                </div>
            )}


            {/* Features */}

            <div className="mt-7 flex-1">

                <p className="mb-4 font-bold text-slate-900">
                    {translate("สิ่งที่ได้รับ")}
                </p>

                <div className="space-y-3">

                    {item.features.map((feature) => (
                        <div
                            key={feature}
                            className="flex min-w-0 items-start gap-3 text-sm leading-6 text-slate-600"
                        >
                            <CheckCircle
                                size={18}
                                className="mt-0.5 shrink-0 text-green-500"
                            />

                            <span className="min-w-0 break-words">
                                {translate(feature)}
                            </span>
                        </div>
                    ))}

                </div>

            </div>


            {/* Button */}

            <Link
                href={`/booking/schedule?package=${item.id}`}
                className="
                    mt-8
                    flex
                    min-h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    bg-pink-500
                    px-5
                    py-3.5
                    text-center
                    text-sm
                    font-bold
                    text-white
                    shadow-lg
                    shadow-pink-100
                    transition-all
                    duration-300

                    hover:bg-pink-600
                    hover:shadow-xl

                    active:scale-[0.98]

                    sm:min-h-14
                    sm:text-base
                "
            >
                เลือกแพ็กเกจ

                <ArrowRight
                    size={18}
                    className="shrink-0"
                />
            </Link>

        </article>
    );
}


/* ============================================================
   GROUP HEADER
============================================================ */

function GroupHeader({
    icon,
    title,
    description,
}: {
    icon: ReactNode;
    title: string;
    description: string;
}) {
    const { translate } = useI18n();
    return (
        <div className="mb-8 flex items-start gap-3 sm:mb-10 sm:items-center sm:gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-100 text-pink-500 sm:h-12 sm:w-12">
                {icon}
            </div>

            <div className="min-w-0">

                <h2 className="text-2xl font-black leading-tight text-slate-900 sm:text-3xl">
                    {translate(title)}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500 sm:text-base">
                    {translate(description)}
                </p>

            </div>

        </div>
    );
}


/* ============================================================
   MAIN PAGE
============================================================ */

function PackageContent() {

    const { translate } = useI18n();

    const searchParams = useSearchParams();

    const packageFromUrl = searchParams.get("package");

    const [authChecking, setAuthChecking] =
        useState(true);

    const [isAuthenticated, setIsAuthenticated] =
        useState(false);

    const selectedPackageId = packageFromUrl
        ? packageAliases[packageFromUrl] || packageFromUrl
        : null;


    /* ========================================================
       BOOKING AUTH SECURITY
       --------------------------------------------------------
       Guest:
       → /account/login?redirect=/booking/package

       Logged in but Email not verified:
       → /account/security?redirect=/booking/package

       Verified:
       → Continue booking normally
    ======================================================== */

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                if (!user) {
                    setIsAuthenticated(false);
                    setAuthChecking(false);

                    const redirect =
                        encodeURIComponent(
                            "/booking/package",
                        );

                    window.location.replace(
                        `/account/login?redirect=${redirect}`,
                    );

                    return;
                }

                if (!user.emailVerified) {
                    setIsAuthenticated(false);
                    setAuthChecking(false);

                    const redirect =
                        encodeURIComponent(
                            "/booking/package",
                        );

                    window.location.replace(
                        `/account/security?redirect=${redirect}`,
                    );

                    return;
                }

                setIsAuthenticated(true);
                setAuthChecking(false);
            },
        );

        return () => unsubscribe();
    }, []);


    /* ========================================================
       AUTO SCROLL
    ======================================================== */

    useEffect(() => {

        if (!selectedPackageId) {
            return;
        }

        const timer = window.setTimeout(() => {

            const element = document.getElementById(
                `package-${selectedPackageId}`
            );

            if (!element) {
                return;
            }

            element.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });

        }, 350);

        return () => {
            window.clearTimeout(timer);
        };

    }, [selectedPackageId]);


    /* ========================================================
       GROUPS
    ======================================================== */

    const starterPackages = packages.filter(
        (item) => item.group === "starter"
    );

    const standardPackages = packages.filter(
        (item) => item.group === "standard"
    );

    const premiumPackages = packages.filter(
        (item) => item.group === "premium"
    );

    const packages360 = packages.filter(
        (item) => item.group === "360"
    );


    /* ========================================================
       RESPONSIVE GRID
       --------------------------------------------------------
       Mobile  → 1
       Tablet  → 2
       Desktop → 3
    ======================================================== */

    const packageGrid =
        "grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8";


    if (authChecking || !isAuthenticated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="flex flex-col items-center text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-pink-100 text-pink-500">
                        <Loader2
                            size={24}
                            className="animate-spin"
                        />
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-700">
                        กำลังตรวจสอบบัญชี...
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                        กรุณารอสักครู่
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen overflow-x-hidden bg-slate-50">


            {/* =================================================
                HERO
            ================================================= */}

            <section className="relative overflow-hidden bg-white">

                {/* Background */}

                <div className="pointer-events-none absolute -left-32 top-16 h-64 w-64 rounded-full bg-pink-100/70 blur-3xl sm:h-80 sm:w-80" />

                <div className="pointer-events-none absolute -right-32 top-10 h-72 w-72 rounded-full bg-purple-100/60 blur-3xl sm:h-96 sm:w-96" />


                <div className="relative mx-auto w-full max-w-7xl px-4 pb-12 pt-24 text-center sm:px-6 sm:pb-16 sm:pt-28 lg:px-8 lg:pt-32">

                    <span className="inline-flex max-w-full items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-pink-600 sm:px-5 sm:text-sm sm:tracking-[0.25em]">

                        <Sparkles
                            size={15}
                            className="shrink-0"
                        />

                        {translate("ขั้นตอนที่ 1")}

                    </span>


                    <h1 className="mt-6 text-3xl font-black tracking-tight text-slate-900 sm:mt-7 sm:text-5xl lg:text-6xl">

                        {translate("เลือกแพ็กเกจ")}

                    </h1>


                    <p className="mx-auto mt-5 max-w-2xl px-2 text-sm leading-7 text-slate-500 sm:mt-6 sm:px-0 sm:text-base sm:leading-8 lg:text-lg">

                        {translate("เลือกแพ็กเกจ Photobooth ที่เหมาะกับงานของคุณ จากนั้นระบบจะพาไปเลือกวันที่ต้องการจัดงาน")}

                    </p>


                    {/* Selected Notice */}

                    {selectedPackageId && (

                        <div className="mx-auto mt-7 inline-flex max-w-full items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-xs font-semibold text-pink-600 sm:text-sm">

                            <CheckCircle
                                size={16}
                                className="shrink-0"
                            />

                            {translate("กำลังแสดงแพ็กเกจที่คุณเลือกจากหน้า Home")}

                        </div>

                    )}

                </div>

            </section>


            {/* =================================================
                STARTER
            ================================================= */}

            <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">

                <GroupHeader
                    icon={<Camera size={24} />}
                    title={groupInfo.starter.title}
                    description={groupInfo.starter.description}
                />

                <div className={packageGrid}>

                    {starterPackages.map((item) => (
                        <PackageCard
                            key={item.id}
                            item={item}
                            selected={
                                selectedPackageId === item.id
                            }
                        />
                    ))}

                </div>

            </section>


            {/* =================================================
                STANDARD
            ================================================= */}

            <section className="bg-white">

                <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">

                    <GroupHeader
                        icon={<Camera size={24} />}
                        title={groupInfo.standard.title}
                        description={groupInfo.standard.description}
                    />

                    <div className={packageGrid}>

                        {standardPackages.map((item) => (
                            <PackageCard
                                key={item.id}
                                item={item}
                                selected={
                                    selectedPackageId === item.id
                                }
                            />
                        ))}

                    </div>

                </div>

            </section>


            {/* =================================================
                PREMIUM
            ================================================= */}

            <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">

                <GroupHeader
                    icon={<Sparkles size={24} />}
                    title={groupInfo.premium.title}
                    description={groupInfo.premium.description}
                />

                <div className={packageGrid}>

                    {premiumPackages.map((item) => (
                        <PackageCard
                            key={item.id}
                            item={item}
                            selected={
                                selectedPackageId === item.id
                            }
                        />
                    ))}

                </div>

            </section>


            {/* =================================================
                360 PHOTOBOOTH
            ================================================= */}

            <section className="bg-gradient-to-b from-orange-50 to-white">

                <div className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">

                    <GroupHeader
                        icon={<Video size={24} />}
                        title={groupInfo["360"].title}
                        description={groupInfo["360"].description}
                    />

                    <div className={packageGrid}>

                        {packages360.map((item) => (
                            <PackageCard
                                key={item.id}
                                item={item}
                                selected={
                                    selectedPackageId === item.id
                                }
                            />
                        ))}

                    </div>

                </div>

            </section>


            {/* =================================================
                IMPORTANT INFORMATION
            ================================================= */}

            <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-16">

                <div className="rounded-3xl border border-pink-100 bg-pink-50 p-5 sm:p-7 md:p-10">

                    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-500 shadow-sm sm:h-12 sm:w-12">

                            <Sparkles size={22} />

                        </div>


                        <div className="min-w-0">

                            <h3 className="text-lg font-black text-slate-900 sm:text-xl">

                                {translate("หมายเหตุเกี่ยวกับราคา")}

                            </h3>


                            <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">

                                <p>
                                    • ราคานี้เป็นราคาสำหรับพื้นที่กรุงเทพฯ
                                </p>

                                <p>
                                    • พื้นที่ปริมณฑลและต่างจังหวัดมีค่าเดินทางเพิ่มเติมตามระยะทาง
                                </p>

                                <p>
                                    • เพิ่มเวลาหน้างาน คิดเพิ่มชั่วโมงละ 1,500 บาท
                                </p>

                                <p>
                                    • ค่าเดินทางจะถูกคำนวณอีกครั้งในขั้นตอนกรอกสถานที่จัดงาน
                                </p>

                                <p>
                                    • ราคามัดจำจะแสดงในขั้นตอนตรวจสอบการจอง หลังจากกำหนดเงื่อนไขการมัดจำในระบบ
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </section>


            {/* =================================================
                BOTTOM CTA
            ================================================= */}

            <section className="border-t bg-white">

                <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-center sm:px-6 sm:py-10 md:flex-row md:items-center md:justify-between md:text-left lg:px-8">

                    <div className="min-w-0">

                        <p className="font-bold text-slate-900">

                            {translate("พร้อมแล้วสำหรับวันพิเศษของคุณ?")}

                        </p>

                        <p className="mt-1 text-sm leading-6 text-slate-500">

                            {translate("เลือกแพ็กเกจ แล้วไปเลือกวันที่ต้องการจัดงาน")}

                        </p>

                    </div>


                    <div className="inline-flex shrink-0 items-center justify-center gap-2 text-sm font-semibold text-pink-500">

                        <CheckCircle size={18} />

                        {translate("1 วัน = 1 คิว")}

                    </div>

                </div>

            </section>

        </main>
    );
}

export default function PackagePage() {
    return (
        <Suspense fallback={null}>
            <PackageContent />
        </Suspense>
    );
}
