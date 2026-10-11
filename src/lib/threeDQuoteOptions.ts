export const THREE_D_QUOTE_MATERIALS = [
    {
        value: "PLA",
        label: "PLA",
        description: "เหมาะกับโมเดลต้นแบบ งานตกแต่ง และชิ้นงานทั่วไป",
        availability: "พร้อมประเมิน",
        colors: [
            "ดำ",
            "ขาว",
            "เทา",
            "แดง",
            "น้ำเงิน",
            "เขียว",
            "เหลือง",
            "ส้ม",
            "ชมพู",
            "ม่วง",
            "น้ำตาล",
        ],
    },
    { value: "PETG", label: "PETG", description: "เหมาะกับชิ้นงานใช้งานทั่วไปที่ต้องการความทนทานเพิ่มขึ้น", availability: "ขอให้ทีมงานตรวจสอบ", colors: [] },
    { value: "ABS", label: "ABS", description: "วัสดุวิศวกรรมสำหรับงานที่ต้องการคุณสมบัติเฉพาะ", availability: "ขอให้ทีมงานตรวจสอบ", colors: [] },
    { value: "ASA", label: "ASA", description: "พิจารณาสำหรับชิ้นงานที่ใช้งานกลางแจ้ง", availability: "ขอให้ทีมงานตรวจสอบ", colors: [] },
    { value: "TPU", label: "TPU", description: "วัสดุยืดหยุ่นสำหรับชิ้นงานที่ต้องการความนิ่ม", availability: "ขอให้ทีมงานตรวจสอบ", colors: [] },
] as const;

export const CUSTOM_COLOR_VALUE = "__custom_color__";

export function findThreeDQuoteMaterial(value: string) {
    return THREE_D_QUOTE_MATERIALS.find((material) => material.value === value);
}

export function isThreeDQuoteColor(materialValue: string, color: string) {
    const material = findThreeDQuoteMaterial(materialValue);
    return Boolean(material && material.colors.some((option) => option === color));
}
