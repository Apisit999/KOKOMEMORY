// Existing Step 3 tariff, shared by the UI and the authoritative API.
export const travelFees: Record<string, number> = {
    "กรุงเทพมหานคร": 0, "สมุทรปราการ": 500, "นนทบุรี": 500,
    "ปทุมธานี": 500, "นครปฐม": 800, "พระนครศรีอยุธยา": 1000,
    "ชลบุรี": 1500, "ฉะเชิงเทรา": 1500, "นครนายก": 1500,
    "สระบุรี": 1500, "ราชบุรี": 1500, "กาญจนบุรี": 2000,
    "ระยอง": 2000, "เพชรบุรี": 2500, "ประจวบคีรีขันธ์": 3500,
    "นครราชสีมา": 3000, "ขอนแก่น": 4500, "เชียงใหม่": 5000,
    "เชียงราย": 6000, "ภูเก็ต": 6000, "สุราษฎร์ธานี": 6000,
    "สงขลา": 7000, "อื่น ๆ": 0,
};

export function getTravelFee(province: string): number {
    // Preserve Step 3's existing fallback for provinces without a tariff.
    return Object.hasOwn(travelFees, province) ? travelFees[province] : 0;
}

export function getBookingDeposit(packageId: string): number {
    // Legacy package deposits; canonical packages use payment-slip's existing 3000 default.
    if (packageId === "premium") return 5000;
    if (packageId === "luxury") return 10000;
    return 3000;
}
