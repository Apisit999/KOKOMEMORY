"use client";

/**
 * ============================================================
 * KOKO Memory - Home Package Section
 * ============================================================
 *
 * หน้าที่:
 * ------------------------------------------------------------
 * ส่วนแนะนำแพ็กเกจบนหน้า Home
 *
 * สำคัญ:
 * ------------------------------------------------------------
 * หน้านี้เป็น "หน้าโฆษณา"
 * ไม่ใช่หน้าสำหรับกรอกข้อมูลการจองโดยตรง
 *
 * Flow:
 *
 * Home
 *   ↓
 * Package Section
 *   ↓
 * กด "จองแพ็กเกจนี้"
 *   ↓
 * /booking/package
 *   ↓
 * ระบบจองจริง
 *
 * Responsive:
 * ------------------------------------------------------------
 * Mobile  → 1 column
 * Tablet  → 2 columns
 * Desktop → 3 columns
 *
 * TODO ในอนาคต:
 * ------------------------------------------------------------
 * [ ] ดึง Package จาก Firebase
 * [ ] แสดงโปรโมชั่น
 * [ ] แสดงส่วนลด
 * [ ] แสดงราคาเริ่มต้น
 * [ ] Package Compare
 * ============================================================
 */

import Link from "next/link";
import {
    Check,
    ArrowRight,
    Sparkles,
    Clock3,
    Camera,
} from "lucide-react";


/* ============================================================
   PACKAGE DATA
   ------------------------------------------------------------
   ตอนนี้ใช้ข้อมูลชั่วคราว
   ภายหลังสามารถย้ายไป Firebase ได้
============================================================ */

const packages = [

    {
        id: "starter",

        name: "Starter",

        price: "7,900",

        time: "2 ชั่วโมง",

        description:
            "แพ็กเกจเริ่มต้นสำหรับงานเล็ก ๆ ที่ต้องการเก็บทุกช่วงเวลาสำคัญ",

        popular: false,

        features: [
            "Photobooth",
            "Photo Strip",
            "พร็อพถ่ายรูป",
            "ทีมงานดูแล",
            "Live Gallery",
        ],
    },


    {
        id: "premium",

        name: "Premium",

        price: "9,900",

        time: "3 ชั่วโมง",

        description:
            "แพ็กเกจยอดนิยมสำหรับงานแต่ง งานเลี้ยง และ Event ที่ต้องการความครบ",

        popular: true,

        features: [
            "Photobooth",
            "Photo Strip",
            "Live Gallery",
            "QR Download",
            "DSLR Full Frame",
            "Backdrop",
            "ไฟ Studio",
        ],
    },


    {
        id: "vip",

        name: "VIP",

        price: "12,900",

        time: "4 ชั่วโมง",

        description:
            "ประสบการณ์ระดับ VIP พร้อมทีมงานและอุปกรณ์แบบจัดเต็มสำหรับงานสำคัญ",

        popular: false,

        features: [
            "Photobooth",
            "Unlimited Print",
            "Live Gallery",
            "QR Download",
            "DSLR Full Frame",
            "Backdrop Premium",
            "Prop Premium",
            "ทีมงาน 2 คน",
        ],
    },

];


/* ============================================================
   COMPONENT
============================================================ */

export default function PackageSection() {

    return (

        <section
            id="packages"
            className="overflow-hidden bg-slate-50 py-16 sm:py-20 lg:py-28"
        >

            {/* =================================================
                MAIN CONTAINER
            ================================================= */}

            <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">


                {/* =================================================
                    SECTION HEADER
                ================================================= */}

                <div className="mx-auto max-w-3xl text-center">

                    {/* Badge */}

                    <div className="inline-flex items-center gap-2 rounded-full bg-pink-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-pink-600 sm:px-5 sm:text-sm">

                        <Sparkles
                            size={15}
                        />

                        Packages

                    </div>


                    {/* Title */}

                    <h2 className="mt-5 text-3xl font-black leading-tight tracking-tight text-slate-900 sm:mt-6 sm:text-4xl lg:text-5xl">

                        แพ็กเกจที่เหมาะกับ
                        <span className="text-pink-500">
                            {" "}ทุกงานของคุณ
                        </span>

                    </h2>


                    {/* Description */}

                    <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:mt-6 sm:text-base sm:leading-8 lg:text-lg">

                        เลือกแพ็กเกจ Photobooth
                        ที่เหมาะกับรูปแบบงานของคุณ
                        พร้อมทีมงานมืออาชีพ
                        และอุปกรณ์คุณภาพสูง

                    </p>

                </div>


                {/* =================================================
                    PACKAGE GRID
                    -------------------------------------------------
                    Mobile  = 1
                    Tablet  = 2
                    Desktop = 3
                ================================================= */}

                <div className="mt-10 grid grid-cols-1 gap-6 sm:mt-14 sm:grid-cols-2 sm:gap-7 lg:mt-16 lg:grid-cols-3 lg:gap-8">


                    {packages.map((pkg) => (

                        <article
                            key={pkg.id}
                            className={`
                                group
                                relative
                                flex
                                h-full
                                flex-col
                                overflow-hidden
                                rounded-3xl
                                bg-white
                                p-6
                                shadow-lg
                                ring-1
                                ring-slate-100
                                transition-all
                                duration-300

                                sm:p-7
                                lg:p-8

                                hover:-translate-y-2
                                hover:shadow-2xl

                                ${pkg.popular
                                    ? "ring-2 ring-pink-500"
                                    : ""
                                }
                            `}
                        >


                            {/* =================================================
                                POPULAR BADGE
                            ================================================= */}

                            {pkg.popular && (

                                <div className="absolute right-4 top-4 z-10 sm:right-6 sm:top-6">

                                    <div className="inline-flex items-center gap-1.5 rounded-full bg-pink-500 px-3 py-1.5 text-xs font-bold text-white shadow-md sm:px-4 sm:text-sm">

                                        <Sparkles
                                            size={13}
                                        />

                                        แนะนำ

                                    </div>

                                </div>

                            )}


                            {/* =================================================
                                PACKAGE ICON
                            ================================================= */}

                            <div
                                className={`
                                    flex
                                    h-12
                                    w-12
                                    items-center
                                    justify-center
                                    rounded-2xl

                                    sm:h-14
                                    sm:w-14

                                    ${pkg.popular
                                        ? "bg-pink-100 text-pink-500"
                                        : "bg-slate-100 text-slate-500"
                                    }
                                `}
                            >

                                <Camera
                                    size={24}
                                />

                            </div>


                            {/* =================================================
                                PACKAGE NAME
                            ================================================= */}

                            <h3 className="mt-6 text-2xl font-black text-slate-900 sm:text-3xl">

                                {pkg.name}

                            </h3>


                            {/* =================================================
                                DESCRIPTION
                            ================================================= */}

                            <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-500">

                                {pkg.description}

                            </p>


                            {/* =================================================
                                TIME
                            ================================================= */}

                            <div className="mt-5 flex items-center gap-2 text-sm font-medium text-slate-500">

                                <Clock3
                                    size={17}
                                    className="text-pink-500"
                                />

                                {pkg.time}

                            </div>


                            {/* =================================================
                                PRICE
                            ================================================= */}

                            <div className="mt-6 border-t border-slate-100 pt-6">

                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">

                                    เริ่มต้นเพียง

                                </p>


                                <div className="mt-1 flex flex-wrap items-baseline gap-2">

                                    <span className="text-4xl font-black tracking-tight text-pink-500 sm:text-5xl">

                                        ฿{pkg.price}

                                    </span>


                                    <span className="text-sm text-slate-400">

                                        / งาน

                                    </span>

                                </div>

                            </div>


                            {/* =================================================
                                FEATURES
                            ================================================= */}

                            <div className="mt-7 flex-1">

                                <p className="mb-4 text-sm font-bold text-slate-900">

                                    สิ่งที่ได้รับ

                                </p>


                                <ul className="space-y-3">

                                    {pkg.features.map(
                                        (
                                            feature,
                                            index
                                        ) => (

                                            <li
                                                key={`${pkg.id}-${index}`}
                                                className="flex items-start gap-3 text-sm leading-5 text-slate-600"
                                            >

                                                <span
                                                    className={`
                                                        mt-0.5
                                                        flex
                                                        h-5
                                                        w-5
                                                        shrink-0
                                                        items-center
                                                        justify-center
                                                        rounded-full

                                                        ${pkg.popular
                                                            ? "bg-pink-100 text-pink-500"
                                                            : "bg-slate-100 text-slate-500"
                                                        }
                                                    `}
                                                >

                                                    <Check
                                                        size={13}
                                                        strokeWidth={3}
                                                    />

                                                </span>


                                                <span>
                                                    {feature}
                                                </span>

                                            </li>

                                        )
                                    )}

                                </ul>

                            </div>


                            {/* =================================================
                                BOOK BUTTON
                                -------------------------------------------------
                                เชื่อมไปยังระบบจองจริง
                                
                                /booking/package
                                
                                เราส่ง package ID ไปด้วย
                                เพื่อให้หน้าจองรู้ว่าลูกค้าสนใจแพ็กเกจไหน
                            ================================================= */}

                            <Link
                                href={`/booking/package?package=${pkg.id}`}
                                className={`
                                    mt-8
                                    flex
                                    min-h-12
                                    w-full
                                    items-center
                                    justify-center
                                    gap-2
                                    rounded-full
                                    px-5
                                    py-3.5
                                    text-center
                                    text-sm
                                    font-bold
                                    transition-all
                                    duration-300

                                    sm:mt-10
                                    sm:min-h-14
                                    sm:text-base

                                    ${pkg.popular
                                        ? "bg-pink-500 text-white shadow-lg shadow-pink-200 hover:bg-pink-400 hover:shadow-xl"
                                        : "bg-slate-900 text-white hover:bg-pink-500"
                                    }
                                `}
                            >

                                จองแพ็กเกจนี้

                                <ArrowRight
                                    size={18}
                                    className="transition-transform duration-300 group-hover:translate-x-1"
                                />

                            </Link>

                        </article>

                    ))}

                </div>


                {/* =================================================
                    BOTTOM CTA
                    -------------------------------------------------
                    สำหรับคนที่ยังไม่รู้ว่าจะเลือก Package ไหน
                ================================================= */}

                <div className="mx-auto mt-10 max-w-3xl text-center sm:mt-14">

                    <p className="text-sm text-slate-500 sm:text-base">

                        ไม่แน่ใจว่าแพ็กเกจไหนเหมาะกับงานของคุณ?

                    </p>


                    <Link
                        href="/booking/package"
                        className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-pink-500 transition hover:text-pink-600 sm:text-base"
                    >

                        ดูแพ็กเกจทั้งหมดและเปรียบเทียบ

                        <ArrowRight
                            size={18}
                        />

                    </Link>

                </div>

            </div>

        </section>
    );
}