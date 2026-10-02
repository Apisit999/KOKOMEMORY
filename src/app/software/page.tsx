import type { Metadata } from "next";
import SoftwareContent from "@/components/studio/SoftwareContent";
export const metadata: Metadata = { title: "ซอฟต์แวร์ | KOKO Memory", description: "สอบถามซอฟต์แวร์สำหรับธุรกิจและโปรแกรม Photobooth พร้อมรายละเอียดก่อนตัดสินใจซื้อ" };
export default function SoftwarePage() { return <SoftwareContent />; }
