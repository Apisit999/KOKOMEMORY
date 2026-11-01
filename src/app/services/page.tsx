import type { Metadata } from "next";
import ServicesLanding from "@/components/studio/ServicesLanding";
export const metadata: Metadata = {
  title: "บริการทั้งหมด | KOKO Memory",
  description: "เลือกบริการเช่า Photobooth โปรแกรม Photobooth งานออกแบบและพิมพ์ 3D หรือซอฟต์แวร์ธุรกิจ",
};
export default function ServicesPage() { return <ServicesLanding />; }
