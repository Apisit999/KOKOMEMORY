import { FREE_FEATURES } from "../lib/studio/types";
export type KokoStudioFeature = "capture" | "templates" | "printing" | "cloud_sync";
export const kokoStudioPlans = {
  free: { id: "free", name: "Free", amountMinor: 0, currency: "THB", billingPeriod: "lifetime", deviceLimit: 1, features: FREE_FEATURES },
} as const;
export const kokoStudioFeatureLabels: Record<KokoStudioFeature, { th: string; en: string }> = {
  capture: { th: "ถ่ายภาพ (Capture)", en: "Capture" },
  templates: { th: "เทมเพลต (Templates)", en: "Templates" },
  printing: { th: "พิมพ์ในเครื่อง (Local printing)", en: "Local printing" },
  cloud_sync: { th: "พื้นที่และอัลบั้ม Cloud", en: "Cloud storage and albums" },
};
