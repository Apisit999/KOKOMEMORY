export const THREE_D_QUOTE_MATERIALS = [
    {
        value: "PLA",
        label: "PLA",
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
] as const;

export const CUSTOM_COLOR_VALUE = "__custom_color__";

export function findThreeDQuoteMaterial(value: string) {
    return THREE_D_QUOTE_MATERIALS.find((material) => material.value === value);
}

export function isThreeDQuoteColor(materialValue: string, color: string) {
    const material = findThreeDQuoteMaterial(materialValue);
    return Boolean(material && material.colors.some((option) => option === color));
}
