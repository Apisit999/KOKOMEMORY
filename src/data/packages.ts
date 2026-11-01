/**
 * ============================================================
 * KOKO Memory
 * Central Package Data
 * ============================================================
 *
 * Package ทุกหน้าของ Booking ต้องใช้ข้อมูลจากไฟล์นี้
 *
 * Step 1 → Package
 * Step 2 → Schedule
 * Step 3 → Customer
 * Step 4 → Review
 * Step 5 → Payment
 * Step 6 → Success
 *
 * หากแก้ราคา / ชื่อ / ชั่วโมง
 * ให้แก้ที่ไฟล์นี้ที่เดียว
 * ============================================================
 */

export type PackageCategory =
    | "photobooth"
    | "360";

export type PackageGroup =
    | "starter"
    | "standard"
    | "premium"
    | "360";

export type PackageItem = {
    id: string;

    category: PackageCategory;

    group: PackageGroup;

    name: string;

    title: string;

    price: number;

    hours: number;

    paperSize?: string;

    popular?: boolean;

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
   360 FEATURES
============================================================ */

const features360 = [
    "360 Photobooth",
    "ถ่ายภาพ / วิดีโอ 360 องศา",
    "ไฟ Studio",
    "รับไฟล์ผ่าน QR Code",
    "ทีมงานดูแลตลอดงาน",
];


/* ============================================================
   PACKAGES
============================================================ */

export const packages: PackageItem[] = [

    /* ========================================================
       STARTER
    ======================================================== */

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
        popular: true,
        paperSize: "2x6",
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


    /* ========================================================
       STANDARD
    ======================================================== */

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
        popular: true,
        paperSize: "4x6",
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


    /* ========================================================
       PREMIUM
    ======================================================== */

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
        popular: true,
        paperSize: "3x4",
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


    /* ========================================================
       360 PHOTOBOOTH
    ======================================================== */

    {
        id: "360-2h",
        category: "360",
        group: "360",
        name: "2 HR",
        title: "360 Photobooth 2 ชั่วโมง",
        price: 5900,
        hours: 2,
        features: features360,
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
        features: features360,
    },

    {
        id: "360-4h",
        category: "360",
        group: "360",
        name: "4 HR",
        title: "360 Photobooth 4 ชั่วโมง",
        price: 7590,
        hours: 4,
        features: features360,
    },
];


/* ============================================================
   GET PACKAGE
============================================================ */

export function getPackage(
    packageId: string | null | undefined
): PackageItem | null {

    if (!packageId) {
        return null;
    }

    return (
        packages.find(
            (item) =>
                item.id === packageId
        ) ?? null
    );
}


/* ============================================================
   GROUP
============================================================ */

export const packageGroups = {
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