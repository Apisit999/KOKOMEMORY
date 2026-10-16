import type { Metadata } from "next";
import SoftwareContent from "@/components/studio/SoftwareContent";
export const metadata: Metadata = { title: "โปรแกรม Photobooth | KOKO Memory", description: "สอบถามโปรแกรม Photobooth อุปกรณ์ที่รองรับ ราคา สิทธิ์ใช้งาน และการสาธิตกับทีม KOKO" };
export default function PhotoboothSoftwarePage() { return <SoftwareContent photobooth />; }
