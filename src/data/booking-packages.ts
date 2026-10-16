export type PackageItem = {
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

const photoboothFeatures = [
    "Photobooth",
    "Unlimited shots",
    "ไฟ Studio",
    "รับไฟล์ผ่าน QR Code",
    "ทีมงานดูแลตลอดงาน",
];

export const packages: PackageItem[] = [
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

export const packageAliases: Record<string, string> = {
    starter: "photobooth-s",
    premium: "photobooth-m",
    vip: "photobooth-m1",
};

export function resolvePackageId(
    packageId: string | null
) {
    if (!packageId) {
        return null;
    }

    return (
        packageAliases[packageId] ??
        packageId
    );
}

export function getPackageById(
    packageId: string | null
) {
    if (!packageId) {
        return null;
    }

    return (
        packages.find(
            (item) => item.id === packageId
        ) ?? null
    );
}
