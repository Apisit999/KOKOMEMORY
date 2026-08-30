"use client";

/**
 * ============================================================
 * KOKO Memory
 * Services Content
 * ============================================================
 *
 * หน้าที่
 * ------------------------------------------------------------
 * แสดงรายการบริการของ KOKO Memory
 *
 * หมายเหตุ
 * ------------------------------------------------------------
 * Component นี้เป็น Client Component
 * เพื่อรองรับ Hover / Interactive UI
 * ============================================================
 */

import Link from "next/link";


interface Service {

    icon: string;

    title: string;

    description: string;

    detail: string;

    color: string;

    iconBackground: string;

    href: string;

}


const services: Service[] = [

    /* ========================================================
       PHOTOBOOTH
       ======================================================== */

    {
        icon: "📸",

        title: "Photobooth",

        description:
            "บริการ Photobooth สำหรับงานแต่ง งานเลี้ยง งานอีเวนต์ และโอกาสพิเศษ",

        detail:
            "เลือกบริการและรูปแบบ Photobooth ให้เหมาะกับงานของคุณ",

        color:
            "from-pink-500 to-rose-400",

        iconBackground:
            "bg-pink-50",

        href:
            "/booking/package",
    },


    /* ========================================================
       3D PRINTING
       ======================================================== */

    {
        icon: "🖨️",

        title: "3D Printing",

        description:
            "บริการออกแบบและพิมพ์ชิ้นงาน 3D สำหรับโปรเจกต์ งานต้นแบบ และชิ้นงานเฉพาะ",

        detail:
            "พูดคุยรายละเอียดไฟล์ ขนาด วัสดุ และรูปแบบชิ้นงานก่อนผลิต",

        color:
            "from-blue-500 to-cyan-400",

        iconBackground:
            "bg-sky-50",

        href:
            "/3d-printing",
    },


    /* ========================================================
       EVENT
       ======================================================== */

    {
        icon: "🎉",

        title: "Event",

        description:
            "เติมสีสันให้กับงานอีเวนต์และกิจกรรมต่าง ๆ ด้วยบริการของ KOKO Memory",

        detail:
            "เหมาะสำหรับ Event, Party และกิจกรรมพิเศษ",

        color:
            "from-violet-500 to-purple-400",

        iconBackground:
            "bg-violet-50",

        href:
            "/booking/package",
    },


    /* ========================================================
       WEDDING
       ======================================================== */

    {
        icon: "💍",

        title: "Wedding",

        description:
            "สร้างความทรงจำในวันสำคัญด้วย Photobooth และบริการที่เข้ากับบรรยากาศงาน",

        detail:
            "ออกแบบประสบการณ์ให้เหมาะกับวันพิเศษของคุณ",

        color:
            "from-rose-500 to-pink-400",

        iconBackground:
            "bg-rose-50",

        href:
            "/booking/package",
    },


    /* ========================================================
       CORPORATE
       ======================================================== */

    {
        icon: "🏢",

        title: "Corporate Event",

        description:
            "บริการสำหรับงานบริษัท กิจกรรมองค์กร และงานเปิดตัวต่าง ๆ",

        detail:
            "ออกแบบบริการให้เหมาะกับรูปแบบและวัตถุประสงค์ขององค์กร",

        color:
            "from-sky-500 to-blue-400",

        iconBackground:
            "bg-sky-50",

        href:
            "/booking/package",
    },


    /* ========================================================
       CUSTOM
       ======================================================== */

    {
        icon: "💫",

        title: "Custom Service",

        description:
            "มีไอเดียหรือโปรเจกต์พิเศษที่ต้องการให้เราช่วยดูแล",

        detail:
            "สามารถพูดคุยรายละเอียดกับทีมงานเพื่อหาแนวทางที่เหมาะสม",

        color:
            "from-fuchsia-500 to-pink-400",

        iconBackground:
            "bg-fuchsia-50",

        href:
            "/contact",
    },

];


export default function ServicesContent() {

    return (

        <section
            className="
                relative
                px-5
                pb-24
                sm:px-6
                sm:pb-28
                lg:pb-32
            "
        >

            <div
                className="
                    mx-auto
                    max-w-7xl
                "
            >

                {/* ==================================================
                    SECTION HEADER
                ================================================== */}

                <div
                    className="
                        mx-auto
                        max-w-2xl
                        text-center
                    "
                >

                    <span
                        className="
                            inline-flex
                            rounded-full
                            bg-slate-100
                            px-4
                            py-2
                            text-xs
                            font-bold
                            uppercase
                            tracking-[0.2em]
                            text-slate-500
                        "
                    >
                        What We Do
                    </span>


                    <h2
                        className="
                            mt-5
                            text-3xl
                            font-extrabold
                            tracking-tight
                            text-slate-900
                            sm:text-4xl
                        "
                    >
                        บริการที่เราดูแล
                    </h2>


                    <p
                        className="
                            mt-4
                            text-sm
                            leading-7
                            text-slate-500
                            sm:text-base
                        "
                    >
                        เลือกบริการที่เหมาะกับรูปแบบงานของคุณ
                        และสร้างช่วงเวลาที่น่าจดจำไปพร้อมกับเรา
                    </p>

                </div>


                {/* ==================================================
                    SERVICE GRID
                ================================================== */}

                <div
                    className="
                        mt-12
                        grid
                        gap-5
                        sm:grid-cols-2
                        lg:grid-cols-3
                    "
                >

                    {services.map((service) => (

                        <article
                            key={service.title}
                            className="
                                group
                                relative
                                overflow-hidden
                                rounded-[2rem]
                                border
                                border-slate-100
                                bg-white
                                shadow-sm
                                transition
                                duration-500
                                hover:-translate-y-2
                                hover:shadow-2xl
                            "
                        >

                            {/* Top Gradient */}

                            <div
                                className={`
                                    h-1.5
                                    w-full
                                    bg-gradient-to-r
                                    ${service.color}
                                `}
                            />


                            <div className="p-6 sm:p-7">

                                {/* Icon */}

                                <div
                                    className={`
                                        flex
                                        h-16
                                        w-16
                                        items-center
                                        justify-center
                                        rounded-2xl
                                        ${service.iconBackground}
                                        text-3xl
                                        shadow-sm
                                        transition
                                        duration-500
                                        group-hover:scale-110
                                        group-hover:rotate-3
                                    `}
                                >
                                    {service.icon}
                                </div>


                                {/* Title */}

                                <h3
                                    className="
                                        mt-6
                                        text-xl
                                        font-extrabold
                                        text-slate-900
                                    "
                                >
                                    {service.title}
                                </h3>


                                {/* Description */}

                                <p
                                    className="
                                        mt-3
                                        text-sm
                                        leading-7
                                        text-slate-500
                                    "
                                >
                                    {service.description}
                                </p>


                                {/* Detail */}

                                <div
                                    className="
                                        mt-5
                                        rounded-2xl
                                        bg-slate-50
                                        px-4
                                        py-3
                                    "
                                >

                                    <p
                                        className="
                                            text-xs
                                            font-medium
                                            leading-6
                                            text-slate-500
                                        "
                                    >
                                        {service.detail}
                                    </p>

                                </div>


                                {/* Button */}

                                <Link
                                    href={service.href}
                                    className="
                                        mt-6
                                        inline-flex
                                        items-center
                                        gap-2
                                        text-sm
                                        font-bold
                                        text-pink-500
                                        transition
                                        hover:gap-3
                                        hover:text-pink-600
                                    "
                                >
                                    ดูรายละเอียด

                                    <span
                                        aria-hidden="true"
                                        className="
                                            transition
                                            group-hover:translate-x-1
                                        "
                                    >
                                        →
                                    </span>

                                </Link>

                            </div>


                            {/* Hover Glow */}

                            <div
                                aria-hidden="true"
                                className="
                                    pointer-events-none
                                    absolute
                                    -bottom-20
                                    -right-20
                                    h-40
                                    w-40
                                    rounded-full
                                    bg-pink-100/50
                                    opacity-0
                                    blur-3xl
                                    transition
                                    duration-500
                                    group-hover:opacity-100
                                "
                            />

                        </article>

                    ))}

                </div>


                {/* ==================================================
                    BOTTOM INFO
                ================================================== */}

                <div
                    className="
                        mt-12
                        overflow-hidden
                        rounded-[2rem]
                        border
                        border-pink-100
                        bg-gradient-to-r
                        from-pink-50
                        via-white
                        to-sky-50
                        p-6
                        sm:p-8
                    "
                >

                    <div
                        className="
                            flex
                            flex-col
                            gap-6
                            md:flex-row
                            md:items-center
                            md:justify-between
                        "
                    >

                        <div className="max-w-2xl">

                            <div
                                className="
                                    flex
                                    items-center
                                    gap-3
                                "
                            >

                                <span
                                    className="
                                        flex
                                        h-10
                                        w-10
                                        items-center
                                        justify-center
                                        rounded-xl
                                        bg-white
                                        text-lg
                                        shadow-sm
                                    "
                                >
                                    💗
                                </span>


                                <h3
                                    className="
                                        font-extrabold
                                        text-slate-900
                                    "
                                >
                                    ไม่แน่ใจว่าบริการไหนเหมาะกับงานของคุณ?
                                </h3>

                            </div>


                            <p
                                className="
                                    mt-3
                                    text-sm
                                    leading-7
                                    text-slate-500
                                "
                            >
                                สามารถพูดคุยกับทีมงาน KOKO Memory
                                เพื่อช่วยแนะนำรูปแบบบริการ
                                ที่เหมาะกับงานของคุณได้
                            </p>

                        </div>


                        <Link
                            href="/contact"
                            className="
                                inline-flex
                                shrink-0
                                items-center
                                justify-center
                                rounded-full
                                bg-slate-900
                                px-7
                                py-3.5
                                text-sm
                                font-bold
                                text-white
                                shadow-lg
                                transition
                                hover:-translate-y-0.5
                                hover:bg-slate-800
                            "
                        >
                            ปรึกษาทีมงาน
                        </Link>

                    </div>

                </div>

            </div>

        </section>

    );
}