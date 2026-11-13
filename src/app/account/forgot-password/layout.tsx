import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ลืมรหัสผ่าน | KOKO Memory",
    description: "ขอรับลิงก์รีเซ็ตรหัสผ่านทางอีเมล",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
