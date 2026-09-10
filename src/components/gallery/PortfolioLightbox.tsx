"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

type LightboxImage = {
    id?: string;
    url: string;
    alt?: string;
    name?: string;
};

interface PortfolioLightboxProps {
    images: LightboxImage[];
    title: string;
    activeIndex: number;
    onClose: () => void;
    onPrevious: () => void;
    onNext: () => void;
    onSelect: (index: number) => void;
}

export default function PortfolioLightbox({
    images,
    title,
    activeIndex,
    onClose,
    onPrevious,
    onNext,
    onSelect,
}: PortfolioLightboxProps) {
    useEffect(() => {
            const scrollY = window.scrollY;
            const previousBodyStyle = {
                overflow: document.body.style.overflow,
                position: document.body.style.position,
                top: document.body.style.top,
                width: document.body.style.width,
            };

        document.body.style.overflow = "hidden";
            document.body.style.position = "fixed";
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = "100%";

        return () => {
                document.body.style.overflow = previousBodyStyle.overflow;
                document.body.style.position = previousBodyStyle.position;
                document.body.style.top = previousBodyStyle.top;
                document.body.style.width = previousBodyStyle.width;
                window.scrollTo(0, scrollY);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") onClose();
            if (event.key === "ArrowLeft") onPrevious();
            if (event.key === "ArrowRight") onNext();
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [onClose, onNext, onPrevious]);

    const image = images[activeIndex];

    if (!image) return null;

    return (
        <div
            className="lightbox-backdrop fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/95 p-4 opacity-100 backdrop-blur-sm transition-opacity duration-200 motion-reduce:transition-none sm:p-8"
            role="dialog"
            aria-modal="true"
            aria-label={`${title} image viewer`}
            onClick={onClose}
        >
            <button
                type="button"
                onClick={onClose}
                aria-label="ปิดรูปภาพ"
                className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-7 sm:top-7"
            >
                <X size={22} />
            </button>

            {images.length > 1 && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onPrevious();
                    }}
                    aria-label="รูปก่อนหน้า"
                    className="absolute left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-7"
                >
                    <ChevronLeft size={24} />
                </button>
            )}

            <div
                className="lightbox-image flex max-h-full max-w-6xl scale-100 flex-col items-center gap-4 transition-transform duration-200 ease-out motion-reduce:transition-none"
                onClick={(event) => event.stopPropagation()}
            >
                <img
                    src={image.url}
                    alt={image.alt || image.name || title}
                    className="max-h-[78vh] max-w-full object-contain"
                    decoding="async"
                />
                <p className="text-xs text-white/60">
                    {activeIndex + 1} / {images.length}
                </p>
            </div>

            {images.length > 1 && (
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onNext();
                    }}
                    aria-label="รูปถัดไป"
                    className="absolute right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-7"
                >
                    <ChevronRight size={24} />
                </button>
            )}

            {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 flex max-w-[90vw] -translate-x-1/2 gap-2 overflow-x-auto rounded-full bg-black/30 p-2 sm:bottom-7">
                    {images.map((thumbnail, index) => (
                        <button
                            key={thumbnail.id || thumbnail.url || index}
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onSelect(index);
                            }}
                            aria-label={`เปิดรูปที่ ${index + 1}`}
                            className={`h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                                index === activeIndex
                                    ? "border-pink-400"
                                    : "border-transparent opacity-60 hover:opacity-100"
                            }`}
                        >
                            <img
                                src={thumbnail.url}
                                alt=""
                                className="h-full w-full object-cover"
                                loading="lazy"
                                decoding="async"
                            />
                        </button>
                    ))}
                </div>
            )}

            <style jsx>{`
                @keyframes portfolioLightboxFadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes portfolioLightboxImageIn {
                    from { opacity: 0; transform: scale(0.97); }
                    to { opacity: 1; transform: scale(1); }
                }

                .lightbox-backdrop {
                    animation: portfolioLightboxFadeIn 220ms ease-out both;
                }

                .lightbox-image {
                    animation: portfolioLightboxImageIn 260ms ease-out both;
                }

                @media (prefers-reduced-motion: reduce) {
                    .lightbox-backdrop,
                    .lightbox-image {
                        animation: none;
                    }
                }
            `}</style>
        </div>
    );
}
