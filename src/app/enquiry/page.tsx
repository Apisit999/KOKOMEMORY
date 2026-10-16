import type { Metadata } from "next";
import { Suspense } from "react";
import Navbar from "@/components/layout/Navbar";
import EnquiryForm from "@/components/studio/EnquiryForm";
import "@/components/studio/studio.css";
import "@/components/studio/enquiry-status.css";
export const metadata: Metadata = { title: "สอบถามบริการ | KOKO Memory", description: "ติดต่อทีม KOKO Memory เรื่อง Photobooth, ซอฟต์แวร์ และงาน 3D Print" };
export default function EnquiryPage() { return <div className="koko-studio"><Navbar /><main className="studio-enquiry-page"><Suspense><EnquiryForm /></Suspense></main></div>; }
