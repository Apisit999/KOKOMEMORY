"use client";

import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import {
    ArrowRight,
    Box,
    Check,
    ChevronRight,
    Clock3,
    Layers3,
    Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

export default function ThreeDPrintingPage() {
    const [products, setProducts] = useState<
        ThreeDProduct[]
    >([]);

    const [loading, setLoading] =
        useState(true);

    const [error, setError] =
        useState("");

    const [category, setCategory] =
        useState("ทั้งหมด");

    useEffect(() => {
        let active = true;

        async function loadProducts() {
            try {
                setLoading(true);
                setError("");

                const response =
                    await fetch(
                        "/api/3d-printing/products",
                        {
                            cache: "no-store",
                        }
                    );

                const result =
                    await response.json();

                if (!response.ok) {
                    throw new Error(
                        result?.error ||
                            "ไม่สามารถโหลดสินค้าได้"
                    );
                }

                if (!active) return;

                setProducts(
                    Array.isArray(
                        result?.products
                    )
                        ? result.products
                        : []
                );
            } catch (cause) {
                if (!active) return;

                setError(
                    cause instanceof Error
                        ? cause.message
                        : "ไม่สามารถโหลดสินค้า 3D Printing ได้"
                );
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadProducts();

        return () => {
            active = false;
        };
    }, []);

    const categories = useMemo(() => {
        const values =
            products
                .map(
                    (product) =>
                        product.category.trim()
                )
                .filter(Boolean);

        return [
            "ทั้งหมด",
            ...Array.from(
                new Set(values)
            ),
        ];
    }, [products]);

    const filteredProducts =
        useMemo(() => {
            if (
                category === "ทั้งหมด"
            ) {
                return products;
            }

            return products.filter(
                (product) =>
                    product.category ===
                    category
            );
        }, [
            products,
            category,
        ]);

    return (
        <>
            <Navbar />
        <main className="min-h-screen bg-[#fffafb] text-slate-900">

            {/* =====================================================
                HERO
            ===================================================== */}

            <section className="relative overflow-hidden bg-[#101426]">

                <div className="absolute -left-32 top-10 h-80 w-80 rounded-full bg-pink-500/20 blur-3xl" />

                <div className="absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />

                <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)] [background-size:48px_48px]" />

                <div className="relative mx-auto max-w-7xl px-5 py-24 sm:px-6 sm:py-32 lg:px-8">

                    <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">

                        <div>

                            <div className="inline-flex items-center gap-2 rounded-full border border-pink-300/20 bg-white/5 px-4 py-2 text-xs font-bold tracking-[0.2em] text-pink-300 backdrop-blur">
                                <Sparkles size={14} />
                                KOKO 3D PRINTING
                            </div>

                            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                เปลี่ยนไอเดีย
                                <br />
                                <span className="text-pink-400">
                                    ให้เป็นชิ้นงานจริง
                                </span>
                            </h1>

                            <p className="mt-7 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                                บริการ 3D Printing
                                สำหรับงานแต่ง งาน Event
                                ของขวัญ ของชำร่วย
                                และชิ้นงาน Custom
                                ที่ออกแบบให้เข้ากับงานของคุณ
                            </p>

                            <div className="mt-9 flex flex-wrap gap-3">

                                <a
                                    href="#products"
                                    className="inline-flex h-12 items-center gap-2 rounded-full bg-pink-500 px-6 text-sm font-bold text-white shadow-lg shadow-pink-500/20 transition hover:bg-pink-400"
                                >
                                    ดูสินค้า
                                    <ArrowRight size={17} />
                                </a>

                                <Link
                                    href="/contact"
                                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 text-sm font-bold text-white backdrop-blur transition hover:bg-white/10"
                                >
                                    สั่งทำ Custom
                                </Link>

                            </div>

                        </div>

                        {/* HERO VISUAL */}

                        <div className="relative">

                            <div className="absolute -inset-5 rounded-[40px] bg-pink-500/10 blur-2xl" />

                            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-white/5 p-3 shadow-2xl backdrop-blur">

                                <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-pink-100 via-white to-violet-100">

                                    {products[0]?.previewImage ? (
                                        <Image
                                            src={
                                                products[0]
                                                    .previewImage
                                            }
                                            alt={
                                                products[0]
                                                    .name ||
                                                "KOKO 3D Printing"
                                            }
                                            fill
                                            priority
                                            sizes="(max-width: 1024px) 100vw, 50vw"
                                            className="object-cover"
                                        />
                                    ) : (
                                        <div className="text-center">

                                            <Box
                                                size={72}
                                                strokeWidth={1}
                                                className="mx-auto text-pink-400"
                                            />

                                            <p className="mt-4 text-sm font-semibold text-slate-500">
                                                KOKO 3D PRINTING
                                            </p>

                                        </div>
                                    )}

                                </div>

                                <div className="grid grid-cols-3 gap-2 p-3">

                                    <HeroMini
                                        icon={
                                            <Layers3 size={16} />
                                        }
                                        text="หลายวัสดุ"
                                    />

                                    <HeroMini
                                        icon={
                                            <Sparkles size={16} />
                                        }
                                        text="Custom"
                                    />

                                    <HeroMini
                                        icon={
                                            <Box size={16} />
                                        }
                                        text="งานคุณภาพ"
                                    />

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* =====================================================
                INTRO
            ===================================================== */}

            <section className="bg-white px-5 py-20 sm:px-6 sm:py-28 lg:px-8">

                <div className="mx-auto max-w-6xl">

                    <div className="grid gap-12 lg:grid-cols-2 lg:items-end">

                        <div>

                            <p className="text-xs font-black tracking-[0.25em] text-pink-500">
                                WHY 3D PRINTING
                            </p>

                            <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                สร้างชิ้นงานที่
                                <br />
                                มีความหมายเฉพาะคุณ
                            </h2>

                        </div>

                        <p className="text-sm leading-8 text-slate-500 sm:text-base">
                            ไม่ว่าจะเป็นของชำร่วย
                            ป้ายชื่อ โมเดลตกแต่ง
                            หรือของขวัญสำหรับคนพิเศษ
                            เราสามารถผลิตชิ้นงาน
                            ให้ตรงกับ Concept
                            ของงานของคุณได้
                        </p>

                    </div>

                    <div className="mt-12 grid gap-4 sm:grid-cols-3">

                        <Feature
                            icon={
                                <Sparkles size={22} />
                            }
                            title="Custom Design"
                            text="ออกแบบและผลิตชิ้นงานตามไอเดียของคุณ"
                        />

                        <Feature
                            icon={
                                <Layers3 size={22} />
                            }
                            title="เลือกวัสดุ"
                            text="รองรับวัสดุสำหรับงานหลากหลายรูปแบบ"
                        />

                        <Feature
                            icon={
                                <Check size={22} />
                            }
                            title="ใส่ใจทุกชิ้นงาน"
                            text="ตรวจสอบรายละเอียดก่อนส่งมอบ"
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                PRODUCTS
            ===================================================== */}

            <section
                id="products"
                className="scroll-mt-20 bg-[#fffafb] px-5 py-20 sm:px-6 sm:py-28 lg:px-8"
            >

                <div className="mx-auto max-w-7xl">

                    <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">

                        <div>

                            <p className="text-xs font-black tracking-[0.25em] text-pink-500">
                                OUR COLLECTION
                            </p>

                            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                3D Products
                            </h2>

                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                                เลือกดูโมเดลที่พร้อมให้บริการ
                                หรือใช้เป็นไอเดียสำหรับงาน Custom
                            </p>

                        </div>

                    </div>

                    {/* CATEGORY */}

                    {!loading &&
                        categories.length > 1 && (
                            <div className="mt-8 flex gap-2 overflow-x-auto pb-2">

                                {categories.map(
                                    (item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            onClick={() =>
                                                setCategory(
                                                    item
                                                )
                                            }
                                            className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                                                category ===
                                                item
                                                    ? "bg-slate-900 text-white shadow-lg"
                                                    : "border border-slate-200 bg-white text-slate-600 hover:border-pink-200 hover:text-pink-500"
                                            }`}
                                        >
                                            {item}
                                        </button>
                                    )
                                )}

                            </div>
                        )}

                    {/* ERROR */}

                    {error && (
                        <div className="mt-10 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* LOADING */}

                    {loading ? (
                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                            {Array.from({
                                length: 6,
                            }).map(
                                (_, index) => (
                                    <div
                                        key={index}
                                        className="overflow-hidden rounded-[28px] border border-slate-100 bg-white"
                                    >
                                        <div className="aspect-[4/3] animate-pulse bg-slate-100" />

                                        <div className="space-y-3 p-6">
                                            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                                            <div className="h-6 w-3/4 animate-pulse rounded bg-slate-100" />
                                            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                                        </div>
                                    </div>
                                )
                            )}

                        </div>
                    ) : filteredProducts.length ===
                      0 ? (
                        <div className="mt-10 rounded-[30px] border border-dashed border-slate-200 bg-white px-6 py-20 text-center">

                            <Box
                                size={42}
                                className="mx-auto text-slate-300"
                            />

                            <h3 className="mt-5 text-xl font-black text-slate-800">
                                ยังไม่มี Product
                            </h3>

                            <p className="mt-2 text-sm text-slate-400">
                                กรุณากลับมาใหม่ภายหลัง
                            </p>

                        </div>
                    ) : (
                        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">

                            {filteredProducts.map(
                                (product) => (
                                    <ProductCard
                                        key={
                                            product.id
                                        }
                                        product={
                                            product
                                        }
                                    />
                                )
                            )}

                        </div>
                    )}

                </div>

            </section>

            {/* =====================================================
                CUSTOM
            ===================================================== */}

            <section className="relative overflow-hidden bg-[#101426] px-5 py-20 sm:px-6 sm:py-28 lg:px-8">

                <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-pink-500/15 blur-3xl" />

                <div className="relative mx-auto max-w-6xl">

                    <div className="overflow-hidden rounded-[36px] border border-white/10 bg-white/[0.04] p-8 backdrop-blur sm:p-12 lg:p-16">

                        <div className="max-w-3xl">

                            <p className="text-xs font-black tracking-[0.25em] text-pink-300">
                                CUSTOM 3D PRINTING
                            </p>

                            <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                                มีแบบอยู่แล้ว?
                                <br />
                                ให้ KOKO ช่วยผลิตให้
                            </h2>

                            <p className="mt-6 text-sm leading-8 text-slate-300 sm:text-base">
                                ส่งรายละเอียดหรือไฟล์โมเดล
                                มาให้เราเพื่อประเมิน
                                ความเป็นไปได้ วัสดุ
                                และราคาในการผลิต
                            </p>

                            <Link
                                href="/contact"
                                className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-pink-500 px-7 text-sm font-bold text-white transition hover:bg-pink-400"
                            >
                                ติดต่อเรา
                                <ArrowRight
                                    size={17}
                                />
                            </Link>

                        </div>

                    </div>

                </div>

            </section>

            {/* =====================================================
                PROCESS
            ===================================================== */}

            <section className="bg-white px-5 py-20 sm:px-6 sm:py-28 lg:px-8">

                <div className="mx-auto max-w-6xl">

                    <div className="text-center">

                        <p className="text-xs font-black tracking-[0.25em] text-pink-500">
                            HOW IT WORKS
                        </p>

                        <h2 className="mt-3 text-3xl font-black text-slate-900 sm:text-4xl">
                            ขั้นตอนการสั่งงาน
                        </h2>

                    </div>

                    <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">

                        <Process
                            number="01"
                            title="ส่งแบบ"
                            text="ส่งภาพ แบบ หรือไฟล์ 3D ที่ต้องการ"
                        />

                        <Process
                            number="02"
                            title="ประเมิน"
                            text="ตรวจสอบรายละเอียดและประเมินราคา"
                        />

                        <Process
                            number="03"
                            title="ผลิต"
                            text="เริ่มพิมพ์และตรวจสอบชิ้นงาน"
                        />

                        <Process
                            number="04"
                            title="ส่งมอบ"
                            text="รับงานหรือจัดส่งตามที่ตกลง"
                        />

                    </div>

                </div>

            </section>

            {/* =====================================================
                CTA
            ===================================================== */}

            <section className="px-5 pb-20 sm:px-6 sm:pb-28 lg:px-8">

                <div className="mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-pink-400 via-pink-500 to-pink-600 px-6 py-16 text-center shadow-[0_30px_90px_rgba(236,72,153,0.2)] sm:px-10">

                    <p className="text-xs font-black tracking-[0.25em] text-pink-100">
                        KOKO MEMORY
                    </p>

                    <h2 className="mt-4 text-3xl font-black text-white sm:text-5xl">
                        พร้อมสร้างชิ้นงาน
                        <br />
                        ของคุณหรือยัง?
                    </h2>

                    <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-pink-50">
                        บอกไอเดียของคุณกับเรา
                        แล้วให้ KOKO ช่วยเปลี่ยน
                        ให้กลายเป็นชิ้นงานจริง
                    </p>

                    <Link
                        href="/contact"
                        className="mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-black text-pink-600 transition hover:bg-pink-50"
                    >
                        เริ่มต้นพูดคุย
                        <ArrowRight
                            size={17}
                        />
                    </Link>

                </div>

            </section>

        </main>
        <Footer />
        </>
    );
}

/* =========================================================
   PRODUCT CARD
========================================================= */

function ProductCard({
    product,
}: {
    product: ThreeDProduct;
}) {
    return (
        <Link
            href={`/3d-printing/${encodeURIComponent(
                product.id
            )}`}
            className="group overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(15,23,42,0.10)]"
        >

            <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">

                {product.previewImage ? (
                    <Image
                        src={product.previewImage}
                        alt={
                            product.name ||
                            "3D Product"
                        }
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <Box
                            size={48}
                            strokeWidth={1}
                            className="text-slate-300"
                        />
                    </div>
                )}

                <div className="absolute left-4 top-4 rounded-full border border-white/40 bg-white/85 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm backdrop-blur">
                    {product.category ||
                        "3D Product"}
                </div>

            </div>

            <div className="p-6">

                <h3 className="text-xl font-black text-slate-900">
                    {product.name ||
                        "3D Product"}
                </h3>

                {product.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
                        {product.description}
                    </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">

                    {product.material && (
                        <InfoPill
                            icon={
                                <Layers3
                                    size={14}
                                />
                            }
                            text={
                                product.material
                            }
                        />
                    )}

                    {product.printTime && (
                        <InfoPill
                            icon={
                                <Clock3
                                    size={14}
                                />
                            }
                            text={
                                product.printTime
                            }
                        />
                    )}

                </div>

                <div className="mt-6 flex items-end justify-between gap-4 border-t border-slate-100 pt-5">

                    <div>
                        <p className="text-xs text-slate-400">
                            เริ่มต้น
                        </p>

                        <p className="mt-1 text-xl font-black text-pink-600">
                            ฿
                            {Number(
                                product.price || 0
                            ).toLocaleString(
                                "th-TH"
                            )}
                        </p>
                    </div>

                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white transition group-hover:bg-pink-500">
                        <ChevronRight
                            size={18}
                        />
                    </span>

                </div>

            </div>

        </Link>
    );
}

/* =========================================================
   COMPONENTS
========================================================= */

function HeroMini({
    icon,
    text,
}: {
    icon: React.ReactNode;
    text: string;
}) {
    return (
        <div className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 px-3 py-3 text-xs font-semibold text-white/80">
            {icon}
            {text}
        </div>
    );
}

function Feature({
    icon,
    title,
    text,
}: {
    icon: React.ReactNode;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                {icon}
            </div>

            <h3 className="mt-5 font-black text-slate-900">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {text}
            </p>
        </div>
    );
}

function InfoPill({
    icon,
    text,
}: {
    icon: React.ReactNode;
    text: string;
}) {
    return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-500">
            {icon}
            {text}
        </span>
    );
}

function Process({
    number,
    title,
    text,
}: {
    number: string;
    title: string;
    text: string;
}) {
    return (
        <div className="rounded-[26px] border border-slate-100 bg-[#fffafb] p-6">

            <span className="text-sm font-black tracking-[0.2em] text-pink-500">
                {number}
            </span>

            <h3 className="mt-5 text-lg font-black text-slate-900">
                {title}
            </h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
                {text}
            </p>

        </div>
    );
}