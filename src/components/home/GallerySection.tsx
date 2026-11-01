"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import GalleryCard from "@/components/gallery/GalleryCard";

type FeaturedPortfolio = {
    id: string;
    title: string;
    category: string;
    categoryLabel?: string;
    coverImage: string;
    featured: boolean;
    images: { url: string }[];
};

const FEATURED_LIMIT = 6;

function FeaturedPortfolioSkeleton() {
    return (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
                <div
                    key={index}
                    className="aspect-[4/5] animate-pulse rounded-[1.75rem] bg-slate-100"
                />
            ))}
        </div>
    );
}

export default function GallerySection() {
    const [portfolios, setPortfolios] = useState<FeaturedPortfolio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        async function loadFeaturedPortfolio() {
            try {
                const response = await fetch(
                    `/api/gallery/portfolio?featured=true&limit=${FEATURED_LIMIT}`,
                    { signal: controller.signal, cache: "no-store" }
                );

                if (!response.ok) {
                    throw new Error("Featured portfolio request failed");
                }

                const data = (await response.json()) as {
                    success?: boolean;
                    portfolios?: FeaturedPortfolio[];
                };

                if (data.success === true && Array.isArray(data.portfolios)) {
                    setPortfolios(data.portfolios);
                }
            } catch (error) {
                if (!(error instanceof DOMException && error.name === "AbortError")) {
                    setPortfolios([]);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        void loadFeaturedPortfolio();

        return () => controller.abort();
    }, []);

    return (
        <section
            className="bg-white py-16 sm:py-20 lg:py-24"
            aria-labelledby="featured-portfolio-heading"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6">
                <div className="mb-8 flex items-end justify-between gap-6 sm:mb-12">
                    <div className="max-w-2xl">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-pink-500">
                            Our work
                        </p>
                        <h2
                            id="featured-portfolio-heading"
                            className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl"
                        >
                            ผลงานที่เราอยากให้คุณได้เห็น
                        </h2>
                        <p className="mt-3 text-sm leading-7 text-gray-500 sm:mt-4 sm:text-base">
                            เรื่องราวและช่วงเวลาที่เราได้ร่วมสร้างความทรงจำให้เกิดขึ้นจริง
                        </p>
                    </div>

                    <Link
                        href="/gallery/portfolio"
                        className="hidden shrink-0 text-sm font-semibold text-slate-900 underline decoration-pink-400 decoration-2 underline-offset-8 transition-colors hover:text-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-4 sm:inline-block"
                    >
                        ดูผลงานทั้งหมด
                    </Link>
                </div>

                {loading ? (
                    <FeaturedPortfolioSkeleton />
                ) : portfolios.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        {portfolios.map((portfolio, index) => (
                            <GalleryCard
                                key={portfolio.id}
                                id={portfolio.id}
                                src={portfolio.coverImage || portfolio.images[0]?.url || ""}
                                category={portfolio.categoryLabel || portfolio.category}
                                title={portfolio.title}
                                imageCount={portfolio.images.length}
                                featured={index === 0}
                                index={index}
                                loading="lazy"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="border-y border-slate-200 py-12 text-center">
                        <p className="text-sm text-slate-500 sm:text-base">
                            กำลังเตรียมผลงานใหม่สำหรับคุณ
                        </p>
                    </div>
                )}

                <Link
                    href="/gallery/portfolio"
                    className="mt-8 inline-flex text-sm font-semibold text-slate-900 underline decoration-pink-400 decoration-2 underline-offset-8 transition-colors hover:text-pink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-4 sm:hidden"
                >
                    ดูผลงานทั้งหมด
                </Link>
            </div>
        </section>
    );
}