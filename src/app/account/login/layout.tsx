import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "เข้าสู่ระบบ | KOKO Memory",
    description: "เข้าสู่ระบบเพื่อดูและจัดการการจองของคุณ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
