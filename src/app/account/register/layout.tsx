import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "สมัครสมาชิก | KOKO Memory",
    description: "สร้างบัญชี KOKO Memory เพื่อจองคิวและติดตามรายการของคุณ",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
