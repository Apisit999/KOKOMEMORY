"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Box,
    Check,
    Clock3,
    Layers3,
    Sparkles,
    Weight,
} from "lucide-react";
import { useEffect, useState } from "react";

type ThreeDProduct = {
    id: string;
    name: string;
    description: string;
    category: string;
    material: string;
    price: number;
    weight: number;
    printTime: string;
    previewImage: string;
    images: { url: string; order: number }[];
    status: "active" | "inactive";
};

export default function ThreeDProductDetailPage() {
    const params =
        useParams<{ id: string }>();

    const id =
        typeof params?.id === "string"
            ? params.id
            : "";

    const [product, setProduct] =
        useState<ThreeDProduct | null>(
            null
        );

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [selectedImage, setSelectedImage] =
        useState("");

    useEffect(() => {
        if (!id) return;

        let active = true;

        async function loadProduct() {
            try {
                setLoading(true);
                setError("");

                const response =
                    await fetch(
                        `/api/3d-printing/products?id=${encodeURIComponent(id)}`,
                        {
                            cache: "no-store",
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.error ||
                            "ไม่สามารถโหลด Product ได้"
                    );
                }

                const found = result?.product as ThreeDProduct | undefined;

                if (!active) return;

                if (!found) {
                    setError(
                        "ไม่พบ Product นี้ หรือ Product ถูกปิดการใช้งาน"
                    );
                } else {
                    setProduct(found);
                    setSelectedImage(found.previewImage);
                }
            } catch (cause) {
                if (!active) return;

                setError(
                    cause instanceof Error
                        ? cause.message
                        : "ไม่สามารถโหลด Product ได้"
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadProduct();

        return () => {
            active = false;
        };
    }, [id]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-[#fffafb]">
                <div className="text-sm font-semibold text-slate-500">
                    กำลังโหลด Product...
                </div>
            </main>
        );
    }

    if (!product) {
        return (
            <main className="min-h-screen bg-[#fffafb] px-5 py-24">
                <div className="mx-auto max-w-3xl text-center">

                    <Box
                        size={50}
                        className="mx-auto text-slate-300"
                    />

                    <h1 className="mt-6 text-2xl font-black text-slate-900">
                        {error ||
                            "ไม่พบ Product"}
                    </h1>

                    <Link
                        href="/3d-printing"
                        className="mt-7 inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-bold text-white"
                    >
                        <ArrowLeft size={16} />
                        กลับไป 3D Printing
                    </Link>

                </div>
            </main>
        );
    }

    return (
        <>
            <Navbar />
        <main className="min-h-screen bg-[#fffafb]">

            {/* =================================================
                TOP
            ================================================= */}

            <section className="border-b border-slate-100 bg-white">

                <div className="mx-auto max-w-7xl px-5 py-5 sm:px-6 lg:px-8">

                    <Link
                        href="/3d-printing"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-pink-500"
                    >
                        <ArrowLeft size={17} />
                        กลับไป 3D Printing
                    </Link>

                </div>

            </section>

            {/* =================================================
                PRODUCT
            ================================================= */}

            <section className="px-5 py-12 sm:px-6 sm:py-20 lg:px-8">

                <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-start">

                    {/* IMAGE */}

                    <div className="relative overflow-hidden rounded-[34px] border border-slate-100 bg-white p-2 shadow-sm">

                        <div className="relative aspect-square overflow-hidden rounded-[28px] bg-slate-100">

                            {selectedImage || product.previewImage ? (
                                <Image
                                    src={selectedImage || product.previewImage}
                                    alt={
                                        product.name
                                    }
                                    fill
                                    priority
                                    sizes="(max-width: 1024px) 100vw, 55vw"
                                    className="object-cover"
                                />
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <Box
                                        size={72}
                                        strokeWidth={
                                            1
                                        }
                                        className="text-slate-300"
                                    />
                                </div>
                            )}

                        </div>

                        {product.images.length > 1 && (
                            <div className="grid grid-cols-4 gap-2 p-3">
                                {product.images.map((image) => (
                                    <button key={image.url} type="button" onClick={() => setSelectedImage(image.url)} className={`relative aspect-square overflow-hidden rounded-xl border focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 ${selectedImage === image.url ? "border-pink-500" : "border-slate-100"}`} aria-label={`ดูรูปที่ ${image.order + 1}`}>
                                        <Image src={image.url} alt={product.name} fill sizes="120px" className="object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                    </div>

                    {/* INFO */}

                    <div>

                        <div className="inline-flex items-center gap-2 rounded-full bg-pink-50 px-4 py-2 text-xs font-black tracking-[0.18em] text-pink-600">
                            <Sparkles
                                size={14}
                            />
                            3D PRODUCT
                        </div>

                        <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-slate-900 sm:text-5xl">
                            {product.name}
                        </h1>

                        {product.category && (
                            <p className="mt-4 text-sm font-semibold text-pink-500">
                                {product.category}
                            </p>
                        )}

                        {product.description && (
                            <p className="mt-7 text-base leading-8 text-slate-500">
                                {
                                    product.description
                                }
                            </p>
                        )}

                        {/* PRICE */}

                        <div className="mt-8 rounded-[26px] bg-slate-900 p-6 text-white">

                            <p className="text-xs font-semibold text-slate-400">
                                ราคาเริ่มต้น
                            </p>

                            <p className="mt-2 text-3xl font-black">
                                ฿
                                {Number(
                                    product.price ||
                                        0
                                ).toLocaleString(
                                    "th-TH"
                                )}
                            </p>

                        </div>

                        {/* SPECS */}

                        <div className="mt-6 grid gap-3 sm:grid-cols-2">

                            <Spec
                                icon={
                                    <Layers3
                                        size={18}
                                    />
                                }
                                label="วัสดุ"
                                value={
                                    product.material ||
                                    "ไม่ระบุ"
                                }
                            />

                            <Spec
                                icon={
                                    <Weight
                                        size={18}
                                    />
                                }
                                label="น้ำหนัก"
                                value={
                                    product.weight
                                        ? `${product.weight} g`
                                        : "ไม่ระบุ"
                                }
                            />

                            <Spec
                                icon={
                                    <Clock3
                                        size={18}
                                    />
                                }
                                label="เวลา Print"
                                value={
                                    product.printTime ||
                                    "ไม่ระบุ"
                                }
                            />

                            <Spec
                                icon={
                                    <Check
                                        size={18}
                                    />
                                }
                                label="สถานะ"
                                value="พร้อมสั่งผลิต"
                            />

                        </div>

                        {/* CTA */}

                        <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                            <Link
                                href="/contact"
                                className="inline-flex h-13 flex-1 items-center justify-center gap-2 rounded-full bg-pink-500 px-7 py-3.5 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600"
                            >
                                สอบถาม / สั่งผลิต
                            </Link>

                            <Link
                                href="/3d-printing"
                                className="inline-flex h-13 items-center justify-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-600 transition hover:border-pink-200 hover:text-pink-500"
                            >
                                ดูสินค้าอื่น
                            </Link>

                        </div>

                    </div>

                </div>

            </section>

            {/* =================================================
                CUSTOM CTA
            ================================================= */}

            <section className="px-5 pb-20 sm:px-6 sm:pb-28 lg:px-8">

                <div className="mx-auto max-w-6xl overflow-hidden rounded-[34px] bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 px-7 py-14 text-center sm:px-12">

                    <p className="text-xs font-black tracking-[0.25em] text-pink-100">
                        CUSTOM 3D PRINTING
                    </p>

                    <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                        ต้องการปรับขนาด
                        <br />
                        หรือออกแบบใหม่?
                    </h2>

                    <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-pink-50">
                        ติดต่อ KOKO
                        เพื่อพูดคุยรายละเอียด
                        และประเมินงานที่เหมาะกับคุณ
                    </p>

                    <Link
                        href="/contact"
                        className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-pink-600"
                    >
                        ติดต่อเรา
                    </Link>

                </div>

            </section>

        </main>
        <Footer />
        </>
    );
}

function Spec({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">

            <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-500">
                    {icon}
                </div>

                <div>
                    <p className="text-xs text-slate-400">
                        {label}
                    </p>

                    <p className="mt-1 text-sm font-bold text-slate-800">
                        {value}
                    </p>
                </div>

            </div>

        </div>
    );
}