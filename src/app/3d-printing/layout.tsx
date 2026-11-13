import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "บริการพิมพ์ 3D | KOKO Memory",
    description: "สินค้า 3D พร้อมสั่ง และรับพิมพ์งาน Custom จากไฟล์ STL / 3MF พร้อมคำแนะนำจากทีม KOKO",
};

export default function Layout({ children }: { children: React.ReactNode }) {
    return children;
}
