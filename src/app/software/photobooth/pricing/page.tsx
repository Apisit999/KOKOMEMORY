import type { Metadata } from "next";
import PricingContent from "@/components/studio/PricingContent";
export const metadata: Metadata = { title: "แผนราคา KOKO Studio Cloud | KOKO Memory", description: "โปรแกรม Photobooth ใช้ฟรี และเลือกแผนเก็บรูปออนไลน์พร้อมลิงก์แชร์ให้แขกดาวน์โหลดรูปของตัวเอง" };
export default function PhotoboothPricingPage() { return <PricingContent />; }
