"use client";

/**
 * ============================================================
 * KOKO Memory - Booking Step 3
 * ============================================================
 *
 * หน้าที่:
 * ------------------------------------------------------------
 * 1. รับข้อมูลลูกค้า
 * 2. รับรายละเอียดงาน
 * 3. รับสถานที่จัดงาน
 * 4. ตรวจสอบพื้นที่
 * 5. คำนวณค่าเดินทางเบื้องต้น
 * 6. คำนวณยอดรวม
 * 7. ส่งข้อมูลไป Step 4
 *
 * ============================================================
 *
 * FLOW
 * ------------------------------------------------------------
 *
 * Step 1
 * เลือกแพ็กเกจ
 *       ↓
 * Step 2
 * เลือกวัน
 *       ↓
 * Step 3
 * ข้อมูลลูกค้า + สถานที่
 *       ↓
 * Step 4
 * ตรวจสอบข้อมูล
 *       ↓
 * Step 5
 * ชำระเงิน
 *       ↓
 * Step 6
 * สำเร็จ
 *
 * ============================================================
 *
 * IMPORTANT
 * ------------------------------------------------------------
 *
 * ตอนนี้ Package / Travel Fee อยู่ใน Code ก่อน
 *
 * ภายหลังจะย้ายไป:
 *
 * Firebase
 *    ↓
 * Admin Dashboard
 *    ↓
 * Packages
 * Travel Zones
 * Promotions
 * Booking
 *
 * เพื่อให้ Admin สามารถแก้ข้อมูลได้โดยไม่ต้องแก้ Code
 *
 * ============================================================
 */

import {
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { travelFees } from "@/data/booking-pricing";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";


import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Clock3,
    CheckCircle2,
    ExternalLink,
    Mail,
    MapPin,
    Phone,
    Search,
    User,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { provinces } from "@/data/thailand/provinces";
import {
    getPackageById,
    resolvePackageId,
} from "@/data/booking-packages";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

/* ============================================================
   EVENT TYPES
   ------------------------------------------------------------
   ประเภทงานที่ลูกค้าสามารถเลือกได้
============================================================ */

const eventTypes = [
    {
        value: "งานแต่งงาน",
        label: "งานแต่งงาน",
    },
    {
        value: "งานวันเกิด",
        label: "งานวันเกิด",
    },
    {
        value: "งานบริษัท",
        label: "งานบริษัท",
    },
    {
        value: "งานรับปริญญา",
        label: "งานรับปริญญา",
    },
    {
        value: "งานเลี้ยง",
        label: "งานเลี้ยง",
    },
    {
        value: "อื่น ๆ",
        label: "อื่น ๆ",
    },
];

/* ============================================================
   TRAVEL FEE
   ------------------------------------------------------------
   ค่าเดินทางตัวอย่าง
 *
 * IMPORTANT
 * ------------------------------------------------------------
 * ตัวเลขตรงนี้เป็น "ข้อมูลตัวอย่าง"
 *
 * ภายหลังจะเปลี่ยนเป็น:
 *
 * Admin
 *   ↓
 * Travel Zone
 *   ↓
 * Province
 *   ↓
 * Travel Fee
 *
 * เพื่อให้ Admin แก้ราคาเองได้
============================================================ */



/* ============================================================
   PACKAGE DATA
   ------------------------------------------------------------
   ต้องตรงกับ Step 1 และ Step 2
 *
 * packageId ที่ส่งมาจาก Step 1:
 *
 * photobooth-s
 * photobooth-m
 * photobooth-l
 * photobooth-ss
 * photobooth-mm
 * photobooth-ll
 * photobooth-s1
 * photobooth-m1
 * photobooth-l1
 * 360-2h
 * 360-tegory: "360 Photo Booth",
        price: 7590,
        hours: 4,
    },

} as const;

/* ============================================================
   PROVINCE COMBOBOX
   ------------------------------------------------------------
   ช่องเลือกจังหวัดแบบมือโปร:
   - ครบ 77 จังหวัด
   - พิมพ์ค้นหาได้
   - เลื่อนดูรายการได้
   - กด Escape ปิด
   - คลิกข้างนอกเพื่อปิด
   - ไม่ต้องติดตั้ง Library เพิ่ม
============================================================ */

function ProvinceCombobox({
    value,
    onChange,
    error,
}: {
    value: string;
    onChange: (value: string) => void;
    error?: string;
}) {

    const containerRef = useRef<HTMLDivElement>(null);

    const [open, setOpen] = useState(false);

    const [query, setQuery] = useState("");

    /* --------------------------------------------------------
       ปิด Dropdown เมื่อคลิกนอกกล่อง
    -------------------------------------------------------- */

    useEffect(() => {

        const handleOutsideClick = (
            event: MouseEvent
        ) => {

            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(false);
                setQuery("");
            }

        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };

    }, []);

    /* --------------------------------------------------------
       กรองจังหวัดจากคำค้น
    -------------------------------------------------------- */

    const filteredProvinces = useMemo(() => {

        const keyword =
            query.trim().toLocaleLowerCase("th");

        if (!keyword) {
            return provinces;
        }

        return provinces.filter(
            (province) =>
                province
                    .toLocaleLowerCase("th")
                    .includes(keyword)
        );

    }, [query]);

    /* --------------------------------------------------------
       เลือกจังหวัด
    -------------------------------------------------------- */

    const selectProvince = (
        province: string
    ) => {

        onChange(province);

        setQuery("");

        setOpen(false);
    };

    return (
        <div
            ref={containerRef}
            className="relative"
        >

            {/* =================================================
                Input
            ================================================= */}

            <div
                className={`mt-2 flex h-12 items-center rounded-xl border bg-white transition-all ${open
                    ? "border-pink-400 ring-4 ring-pink-100"
                    : error
                        ? "border-red-300"
                        : "border-slate-200"
                    }`}
            >

                <Search
                    size={18}
                    className="ml-4 shrink-0 text-slate-400"
                />

                <input
                    value={
                        open
                            ? query
                            : value
                    }
                    onFocus={() => {
                        setOpen(true);
                        setQuery("");
                    }}
                    onChange={(event) => {
                        setQuery(
                            event.target.value
                        );
                        setOpen(true);
                    }}
                    onKeyDown={(event) => {

                        if (
                            event.key === "Escape"
                        ) {
                            setOpen(false);
                            setQuery("");
                        }

                    }}
                    placeholder={
                        value
                            ? value
                            : "ค้นหาหรือเลือกจังหวัด..."
                    }
                    className="h-full w-full bg-transparent px-3 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    autoComplete="off"
                    aria-label="ค้นหาจังหวัด"
                    aria-expanded={open}
                />

            </div>

            {/* =================================================
                Dropdown
            ================================================= */}

            {open && (

                <div className="absolute left-0 right-0 top-full z-[60] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

                    {/* Header */}

                    <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">

                        <p className="text-xs font-semibold text-slate-500">

                            {query
                                ? `พบ ${filteredProvinces.length} จังหวัด`
                                : "ประเทศไทย · 77 จังหวัด"}

                        </p>

                        {query && (

                            <button
                                type="button"
                                onClick={() =>
                                    setQuery("")
                                }
                                className="text-xs font-medium text-pink-500 hover:text-pink-600"
                            >
                                ล้างการค้นหา
                            </button>

                        )}

                    </div>

                    {/* List */}

                    <div className="max-h-72 overflow-y-auto overscroll-contain p-2">

                        {filteredProvinces.length > 0 ? (

                            filteredProvinces.map(
                                (province) => (

                                    <button
                                        key={province}
                                        type="button"
                                        onClick={() =>
                                            selectProvince(
                                                province
                                            )
                                        }
                                        className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm transition ${value ===
                                            province
                                            ? "bg-pink-50 font-semibold text-pink-600"
                                            : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                    >

                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${value ===
                                                province
                                                ? "bg-pink-100 text-pink-500"
                                                : "bg-slate-100 text-slate-400"
                                                }`}
                                        >
                                            <MapPin
                                                size={16}
                                            />
                                        </span>

                                        <span>
                                            {province}
                                        </span>

                                        {value ===
                                            province && (

                                                <CheckCircle2
                                                    size={17}
                                                    className="ml-auto text-pink-500"
                                                />

                                            )}

                                    </button>

                                )

                            )) : (

                            <div className="px-4 py-10 text-center">

                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">

                                    <Search
                                        size={20}
                                        className="text-slate-400"
                                    />

                                </div>

                                <p className="mt-3 font-semibold text-slate-700">
                                    ไม่พบจังหวัด
                                </p>

                                <p className="mt-1 text-xs text-slate-400">
                                    ลองพิมพ์ชื่อจังหวัดใหม่อีกครั้ง
                                </p>

                            </div>

                        )}

                    </div>

                </div>

            )}

            {/* Error */}

            {error && (

                <p className="mt-2 text-sm text-red-500">
                    {error}
                </p>

            )}

        </div>
    );
}


/* ============================================================
   THAI ADDRESS COMBOBOX
   ------------------------------------------------------------
   ใช้สำหรับ:
   - เขต / อำเภอ
   - แขวง / ตำบล
   - พิมพ์ค้นหาได้
   - เลื่อนรายการได้
   - กรองตามจังหวัด / อำเภออัตโนมัติ
   - ใช้ฐานข้อมูลจริงจาก thai-address-select
============================================================ */

/* ============================================================
   THAI ADDRESS DATA LOADER
   ------------------------------------------------------------
   โหลด thai-address-select แบบ Dynamic Import

   จุดสำคัญ:
   ------------------------------------------------------------
   - ไม่โหลด Library ตอน SSR
   - โหลดข้อมูลเมื่อจำเป็น
   - ใช้ Promise เดียวร่วมกันทั้งหน้า
   - ลดการโหลดข้อมูลซ้ำ
============================================================ */

let thaiAddressModulePromise:
    Promise<typeof import("thai-address-select")> | null = null;

async function loadThaiAddressModule() {
    if (!thaiAddressModulePromise) {
        thaiAddressModulePromise =
            import("thai-address-select").then(
                async (address) => {
                    await address.loadData();
                    return address;
                }
            );
    }

    return thaiAddressModulePromise;
}

function ThaiAddressCombobox({
    label,
    value,
    onChange,
    province,
    district,
    level,
    error,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    province: string;
    district?: string;
    level: "district" | "subdistrict";
    error?: string;
    disabled?: boolean;
}) {
    /* ========================================================
       REF
       --------------------------------------------------------
       ใช้ตรวจสอบว่าลูกค้าคลิกนอก Dropdown หรือไม่
    ======================================================== */

    const containerRef = useRef<HTMLDivElement>(null);

    /* ========================================================
       STATE
    ======================================================== */

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [items, setItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    /* --------------------------------------------------------
       index ของรายการที่กำลัง Focus จากแป้นพิมพ์
       ลูกค้าสามารถใช้ ↑ ↓ Enter ได้
    -------------------------------------------------------- */

    const [highlightedIndex, setHighlightedIndex] = useState(-1);

    /* ========================================================
       LOAD THAI ADDRESS DATA
       --------------------------------------------------------
       ใช้ Promise กลางเพื่อให้ thai-address-select
       โหลดข้อมูลเพียงครั้งเดียวต่อหน้าเว็บ

       ช่วยลดการโหลดซ้ำระหว่าง:
       - เขต / อำเภอ
       - แขวง / ตำบล
       - รหัสไปรษณีย์
    ======================================================== */

    useEffect(() => {
        let cancelled = false;

        const loadAddressData = async () => {
            /* ------------------------------------------------
               ถ้าช่องถูกล็อก ไม่ต้องโหลดข้อมูล
            ------------------------------------------------ */

            if (disabled) {
                setItems([]);
                setLoading(false);
                setOpen(false);
                setQuery("");
                setHighlightedIndex(-1);
                return;
            }

            /* ------------------------------------------------
               เขต / อำเภอ ต้องมีจังหวัดก่อน
            ------------------------------------------------ */

            if (level === "district" && !province) {
                setItems([]);
                return;
            }

            /* ------------------------------------------------
               แขวง / ตำบล ต้องมีจังหวัด + เขต/อำเภอ
            ------------------------------------------------ */

            if (
                level === "subdistrict" &&
                (!province || !district)
            ) {
                setItems([]);
                return;
            }

            setLoading(true);

            try {
                const address = await loadThaiAddressModule();

                let result: string[] = [];

                /* ------------------------------------------------
                   ระดับอำเภอ / เขต
                ------------------------------------------------ */

                if (level === "district") {
                    result = address.getDistricts(province) ?? [];
                }

                /* ------------------------------------------------
                   ระดับตำบล / แขวง
                ------------------------------------------------ */

                if (level === "subdistrict") {
                    result =
                        address.getSubDistricts(
                            province,
                            district ?? ""
                        ) ?? [];
                }

                /* ------------------------------------------------
                   ลบรายการซ้ำ
                ------------------------------------------------ */

                const uniqueItems = Array.from(
                    new Set(result)
                );

                if (!cancelled) {
                    setItems(uniqueItems);
                    setHighlightedIndex(-1);
                }
            } catch (error) {
                console.error(
                    "ไม่สามารถโหลดข้อมูลที่อยู่ไทยได้:",
                    error
                );

                if (!cancelled) {
                    setItems([]);
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        loadAddressData();

        return () => {
            cancelled = true;
        };
    }, [
        province,
        district,
        level,
        disabled,
    ]);

    /* ========================================================
       CLOSE WHEN CLICK OUTSIDE
    ======================================================== */

    useEffect(() => {
        const handleOutsideClick = (event: MouseEvent) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setOpen(false);
                setQuery("");
                setHighlightedIndex(-1);
            }
        };

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    /* ========================================================
       FILTER
       --------------------------------------------------------
       ค้นหาแบบภาษาไทย
    ======================================================== */

    const filteredItems = useMemo(() => {
        const keyword = query
            .trim()
            .toLocaleLowerCase("th");

        if (!keyword) {
            return items;
        }

        return items.filter((item) =>
            item
                .toLocaleLowerCase("th")
                .includes(keyword)
        );
    }, [items, query]);

    /* ========================================================
       SELECT ITEM
    ======================================================== */

    const selectItem = (item: string) => {
        onChange(item);

        setQuery("");
        setOpen(false);
        setHighlightedIndex(-1);
    };

    /* ========================================================
       KEYBOARD NAVIGATION
       --------------------------------------------------------
       ↑ ↓ = เลื่อนรายการ
       Enter = เลือก
       Escape = ปิด
    ======================================================== */

    const handleKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        if (disabled) {
            return;
        }

        if (event.key === "Escape") {
            event.preventDefault();

            setOpen(false);
            setQuery("");
            setHighlightedIndex(-1);

            return;
        }

        if (event.key === "ArrowDown") {
            event.preventDefault();

            if (!open) {
                setOpen(true);
                return;
            }

            setHighlightedIndex((previous) => {
                if (filteredItems.length === 0) {
                    return -1;
                }

                return previous >= filteredItems.length - 1
                    ? 0
                    : previous + 1;
            });

            return;
        }

        if (event.key === "ArrowUp") {
            event.preventDefault();

            if (!open) {
                setOpen(true);
                return;
            }

            setHighlightedIndex((previous) => {
                if (filteredItems.length === 0) {
                    return -1;
                }

                return previous <= 0
                    ? filteredItems.length - 1
                    : previous - 1;
            });

            return;
        }

        if (event.key === "Enter") {
            event.preventDefault();

            if (
                open &&
                highlightedIndex >= 0 &&
                highlightedIndex < filteredItems.length
            ) {
                selectItem(
                    filteredItems[highlightedIndex]
                );
            }

            return;
        }
    };

    /* ========================================================
       AREA TYPE
       --------------------------------------------------------
       กรุงเทพฯ:
       เขต → แขวง

       จังหวัดอื่น:
       อำเภอ → ตำบล
    ======================================================== */

    const isBangkok =
        province === "กรุงเทพมหานคร";

    const areaName =
        level === "district"
            ? isBangkok
                ? "เขต"
                : "อำเภอ"
            : isBangkok
                ? "แขวง"
                : "ตำบล";

    const placeholder = disabled
        ? level === "district"
            ? "กรุณาเลือกจังหวัดก่อน"
            : "กรุณาเลือกเขต / อำเภอก่อน"
        : `ค้นหาหรือเลือก${areaName}...`;

    return (
        <div
            ref={containerRef}
            className="relative"
        >
            {/* =================================================
                LABEL
            ================================================= */}

            <Label>
                {label}

                <span className="ml-1 text-pink-500">
                    *
                </span>
            </Label>

            {/* =================================================
                SEARCH INPUT
            ================================================= */}

            <div
                className={`mt-2 flex h-12 items-center rounded-xl border bg-white transition-all ${disabled
                    ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60"
                    : error
                        ? "border-red-300"
                        : open
                            ? "border-pink-400 ring-4 ring-pink-100"
                            : "border-slate-200 hover:border-pink-300"
                    }`}
            >
                <Search
                    size={18}
                    className="ml-4 shrink-0 text-slate-400"
                />

                <input
                    value={open ? query : value}
                    disabled={disabled}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={
                        value
                            ? value
                            : placeholder
                    }
                    onFocus={() => {
                        if (disabled) {
                            return;
                        }

                        setOpen(true);
                        setQuery("");
                        setHighlightedIndex(-1);
                    }}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                        setHighlightedIndex(
                            event.target.value
                                ? 0
                                : -1
                        );
                    }}
                    onKeyDown={handleKeyDown}
                    className="h-full w-full bg-transparent px-3 pr-4 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                    aria-label={`ค้นหา${areaName}`}
                    aria-expanded={open}
                    aria-autocomplete="list"
                />
            </div>

            {/* =================================================
                DROPDOWN
            ================================================= */}

            {open && !disabled && (
                <div className="absolute left-0 right-0 top-full z-[70] mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    {/* ------------------------------------------------
                        Dropdown Header
                    ------------------------------------------------ */}

                    <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-3">
                        <div>
                            <p className="text-xs font-semibold text-slate-700">
                                {areaName}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-400">
                                {loading
                                    ? "กำลังโหลดข้อมูล..."
                                    : query
                                        ? `พบ ${filteredItems.length} รายการ`
                                        : `${items.length} รายการ`}
                            </p>
                        </div>

                        {query && !loading && (
                            <button
                                type="button"
                                onClick={() => {
                                    setQuery("");
                                    setHighlightedIndex(-1);
                                }}
                                className="text-xs font-medium text-pink-500 hover:text-pink-600"
                            >
                                ล้างการค้นหา
                            </button>
                        )}
                    </div>

                    {/* ------------------------------------------------
                        Loading
                    ------------------------------------------------ */}

                    {loading && (
                        <div className="px-4 py-10 text-center">
                            <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-pink-500" />

                            <p className="mt-3 text-sm text-slate-400">
                                กำลังโหลดข้อมูลพื้นที่...
                            </p>
                        </div>
                    )}

                    {/* ------------------------------------------------
                        Result List
                    ------------------------------------------------ */}

                    {!loading && (
                        <div className="max-h-72 overflow-y-auto overscroll-contain p-2">
                            {filteredItems.length > 0 ? (
                                filteredItems.map(
                                    (item, index) => {
                                        const selected =
                                            item === value;

                                        const highlighted =
                                            index ===
                                            highlightedIndex;

                                        return (
                                            <button
                                                key={item}
                                                type="button"
                                                onMouseEnter={() =>
                                                    setHighlightedIndex(
                                                        index
                                                    )
                                                }
                                                onClick={() =>
                                                    selectItem(
                                                        item
                                                    )
                                                }
                                                className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${selected
                                                    ? "bg-pink-50 font-semibold text-pink-600"
                                                    : highlighted
                                                        ? "bg-slate-50 text-slate-900"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                    }`}
                                            >
                                                <div className="flex min-w-0 items-center gap-3">
                                                    <span
                                                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected
                                                            ? "bg-pink-100 text-pink-500"
                                                            : "bg-slate-100 text-slate-400"
                                                            }`}
                                                    >
                                                        <MapPin
                                                            size={16}
                                                        />
                                                    </span>

                                                    <span className="truncate">
                                                        {item}
                                                    </span>
                                                </div>

                                                {selected && (
                                                    <CheckCircle2
                                                        size={18}
                                                        className="shrink-0 text-pink-500"
                                                    />
                                                )}
                                            </button>
                                        );
                                    }
                                )
                            ) : (
                                <div className="px-4 py-10 text-center">
                                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                                        <Search
                                            size={20}
                                            className="text-slate-400"
                                        />
                                    </div>

                                    <p className="mt-3 font-semibold text-slate-700">
                                        ไม่พบ{areaName}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        ลองพิมพ์ชื่อพื้นที่ใหม่อีกครั้ง
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ------------------------------------------------
                        Keyboard Hint
                    ------------------------------------------------ */}

                    {!loading &&
                        filteredItems.length > 0 && (
                            <div className="border-t bg-slate-50 px-4 py-2 text-[11px] text-slate-400">
                                ↑ ↓ เลื่อนรายการ&nbsp;&nbsp;·&nbsp;&nbsp;
                                Enter เลือก&nbsp;&nbsp;·&nbsp;&nbsp;
                                Esc ปิด
                            </div>
                        )}
                </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
                <p className="mt-2 text-sm text-red-500">
                    {error}
                </p>
            )}
        </div>
    );
}

/* ============================================================
   DATE FORMAT
   ------------------------------------------------------------
   YYYY-MM-DD
============================================================ */

function formatThaiDate(dateString: string | null) {

    if (!dateString) {

        return "ไม่ได้เลือกวันที่";

    }

    const date = new Date(
        `${dateString}T00:00:00`
    );

    return new Intl.DateTimeFormat(
        "th-TH",
        {
            dateStyle: "long",
        }
    ).format(date);
}

/* ============================================================
   MONEY FORMAT
============================================================ */

function formatMoney(value: number) {

    return new Intl.NumberFormat(
        "th-TH"
    ).format(value);

}

/* ============================================================
   TIME HELPERS
   ------------------------------------------------------------
   ระยะเวลางานดึงจากแพ็กเกจโดยตรง
   ลูกค้าเลือกเวลาเริ่มงาน และระบบคำนวณเวลาสิ้นสุดอัตโนมัติ
============================================================ */

function formatTimeFromMinutes(totalMinutes: number) {
    const normalized =
        ((totalMinutes % 1440) + 1440) % 1440;

    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;

    return `${String(hours).padStart(2, "0")}:${String(
        minutes
    ).padStart(2, "0")}`;
}

function timeToMinutes(value: string) {
    const [hours, minutes] =
        value.split(":").map(Number);

    if (
        !Number.isFinite(hours) ||
        !Number.isFinite(minutes)
    ) {
        return null;
    }

    return hours * 60 + minutes;
}

function calculateEndTime(
    startTime: string,
    durationHours: number
) {
    const startMinutes =
        timeToMinutes(startTime);

    if (
        startMinutes === null ||
        !Number.isFinite(durationHours)
    ) {
        return "";
    }

    const endMinutes =
        startMinutes + durationHours * 60;

    if (endMinutes > 1440) {
        return "";
    }

    return formatTimeFromMinutes(endMinutes);
}

function createStartTimeOptions(
    durationHours: number
) {
    const durationMinutes =
        durationHours * 60;

    const latestStart =
        1440 - durationMinutes;

    const options: string[] = [];

    for (
        let minutes = 0;
        minutes <= latestStart;
        minutes += 30
    ) {
        options.push(
            formatTimeFromMinutes(minutes)
        );
    }

    return options;
}

function formatTimeRange(
    startTime: string,
    endTime: string
) {
    if (!startTime || !endTime) {
        return "ยังไม่ได้เลือกเวลา";
    }

    return `${startTime} - ${endTime} น.`;
}

/* ============================================================
   MAIN COMPONENT
============================================================ */

function CustomerContent() {

    const router = useRouter();

    const searchParams = useSearchParams();

    /* ========================================================
       รับข้อมูลจาก Step 2
       --------------------------------------------------------
       package:
       Package ID

       date:
       วันที่จอง
    ======================================================== */

    const packageId =
        searchParams.get("package");

    const bookingDate =
        searchParams.get("date");

    /* ========================================================
       BOOKING AUTH GUARD
       --------------------------------------------------------
       Guest       → Login
       Unverified  → Security / Email Verification
       Verified    → เข้า Step 3 ได้
    ======================================================== */

    const [authChecking, setAuthChecking] =
        useState(true);

    const [isAuthenticated, setIsAuthenticated] =
        useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(
            auth,
            (user) => {
                if (!user) {
                    setIsAuthenticated(false);
                    setAuthChecking(false);

                    const currentPath =
                        `/booking/customer?${searchParams.toString()}`;

                    const redirect =
                        encodeURIComponent(currentPath);

                    window.location.replace(
                        `/account/login?redirect=${redirect}`
                    );

                    return;
                }

                if (!user.emailVerified) {
                    setIsAuthenticated(false);
                    setAuthChecking(false);

                    const currentPath =
                        `/booking/customer?${searchParams.toString()}`;

                    const redirect =
                        encodeURIComponent(currentPath);

                    window.location.replace(
                        `/account/security?redirect=${redirect}`
                    );

                    return;
                }

                setIsAuthenticated(true);
                setAuthChecking(false);
            }
        );

        return () => unsubscribe();
    }, [searchParams]);

    /* ========================================================
       หา Package
       --------------------------------------------------------
       ใช้ Package ID จาก URL
    ======================================================== */

    const selectedPackage = useMemo(() => {

        const resolvedPackageId =
            resolvePackageId(packageId);

        return getPackageById(
            resolvedPackageId
        );

    }, [packageId]);

    /* ========================================================
       FORM DATA
    ======================================================== */

    const [form, setForm] = useState({

        /* ข้อมูลลูกค้า */

        fullName: "",

        phone: "",

        lineId: "",

        email: "",

        /* รายละเอียดงาน */

        eventType: "",

        guestCount: "",

        startTime: "",

        endTime: "",

        /* สถานที่ */

        venue: "",

        province: "",

        district: "",

        subdistrict: "",

        address: "",

        postalCode: "",

        googleMaps: "",

        /* รายละเอียดเพิ่มเติม */

        note: "",

    });

    /* ========================================================
       FORM ERRORS
    ======================================================== */

    const [errors, setErrors] =
        useState<Record<string, string>>({});

    /* ========================================================
       UPDATE FORM
       --------------------------------------------------------
       ใช้ฟังก์ชันเดียวสำหรับ Input ทุกช่อง
    ======================================================== */

    const handleChange = (
        field: string,
        value: string
    ) => {

        setForm((previous) => ({

            ...previous,

            [field]: value,

        }));

        /* ลบ Error ของช่องนั้นทันที
           เมื่อลูกค้าเริ่มแก้ข้อมูล */

        setErrors((previous) => ({

            ...previous,

            [field]: "",

        }));

    };

    /* ========================================================
       TRAVEL FEE
       --------------------------------------------------------
       คำนวณจากจังหวัด
    ======================================================== */

    const travelFee =
        form.province
            ? travelFees[form.province] ?? null
            : null;

    /* ========================================================
       PACKAGE PRICE
    ======================================================== */

    const packagePrice =
        selectedPackage?.price ?? 0;

    const serviceDuration =
        selectedPackage?.hours ?? 0;

    const startTimeOptions = useMemo(
        () =>
            createStartTimeOptions(
                serviceDuration
            ),
        [serviceDuration]
    );

    /* ========================================================
       TOTAL
       --------------------------------------------------------
       ตอนนี้:
 *
 * Package
 * +
 * Travel Fee
 *
 * ภายหลังจะเพิ่ม:
 *
 * + Extra Service
 * + Extra Hours
 * - Coupon
 * - Promotion
 * ======================================================== */

    const estimatedTotal =
        packagePrice + (travelFee ?? 0);

    /* ========================================================
       VALIDATION
       --------------------------------------------------------
       ตรวจสอบก่อนส่งไป Step 4
    ======================================================== */

    /* ========================================================
       AUTO END TIME
       --------------------------------------------------------
       เวลาสิ้นสุดคำนวณจาก:
       เวลาเริ่มงาน + ระยะเวลาของแพ็กเกจ
    ======================================================== */

    useEffect(() => {
        if (
            !form.startTime ||
            !serviceDuration
        ) {
            if (form.endTime) {
                setForm((previous) => ({
                    ...previous,
                    endTime: "",
                }));
            }
            return;
        }

        const calculatedEndTime =
            calculateEndTime(
                form.startTime,
                serviceDuration
            );

        if (
            calculatedEndTime !==
            form.endTime
        ) {
            setForm((previous) => ({
                ...previous,
                endTime:
                    calculatedEndTime,
            }));
        }
    }, [
        form.startTime,
        form.endTime,
        serviceDuration,
    ]);

    /* ========================================================
       AUTO POSTAL CODE
       --------------------------------------------------------
       เมื่อเลือก:
       จังหวัด + เขต/อำเภอ + แขวง/ตำบล
       ระบบจะค้นหารหัสไปรษณีย์ให้อัตโนมัติ
    ======================================================== */

    useEffect(() => {
        let cancelled = false;

        const loadPostalCode = async () => {
            if (
                !form.province ||
                !form.district ||
                !form.subdistrict
            ) {
                return;
            }

            try {
                const address = await import(
                    "thai-address-select"
                );

                await address.loadData();

                const postalCode =
                    address.getzip_code(
                        form.province,
                        form.district,
                        form.subdistrict
                    );

                if (
                    !cancelled &&
                    postalCode &&
                    postalCode !== form.postalCode
                ) {
                    handleChange(
                        "postalCode",
                        postalCode
                    );
                }
            } catch (error) {
                console.error(
                    "ไม่สามารถค้นหารหัสไปรษณีย์ได้:",
                    error
                );
            }
        };

        loadPostalCode();

        return () => {
            cancelled = true;
        };
    }, [
        form.province,
        form.district,
        form.subdistrict,
    ]);

    const validateForm = () => {

        const newErrors:
            Record<string, string> = {};

        /* ----------------------------------------------------
           ตรวจสอบชื่อ
        ---------------------------------------------------- */

        if (!form.fullName.trim()) {

            newErrors.fullName =
                "กรุณากรอกชื่อ-นามสกุล";

        }

        /* ----------------------------------------------------
           ตรวจสอบเบอร์
        ---------------------------------------------------- */

        if (!form.phone.trim()) {

            newErrors.phone =
                "กรุณากรอกเบอร์โทรศัพท์";

        } else if (
            !/^0\d{9}$/.test(form.phone)
        ) {

            newErrors.phone =
                "กรุณากรอกเบอร์โทรศัพท์ 10 หลัก";

        }

        /* ----------------------------------------------------
           ประเภทงาน
        ---------------------------------------------------- */

        if (!form.eventType) {

            newErrors.eventType =
                "กรุณาเลือกประเภทงาน";

        }

        /* ----------------------------------------------------
           เวลาเริ่มงาน
        ---------------------------------------------------- */

        if (!form.startTime) {
            newErrors.startTime =
                "กรุณาเลือกเวลาเริ่มงาน";
        }

        /* ----------------------------------------------------
           เวลาสิ้นสุด
        ---------------------------------------------------- */

        if (
            !form.endTime ||
            form.endTime !==
                calculateEndTime(
                    form.startTime,
                    serviceDuration
                )
        ) {
            newErrors.endTime =
                "กรุณาตรวจสอบช่วงเวลาจัดงาน";
        }

        /* ----------------------------------------------------
           สถานที่
        ---------------------------------------------------- */

        if (!form.venue.trim()) {

            newErrors.venue =
                "กรุณากรอกชื่อสถานที่จัดงาน";

        }

        /* ----------------------------------------------------
           จังหวัด
        ---------------------------------------------------- */

        if (!form.province) {

            newErrors.province =
                "กรุณาเลือกจังหวัด";

        }

        /* ----------------------------------------------------
           เขต / อำเภอ
        ---------------------------------------------------- */

        if (!form.district.trim()) {

            newErrors.district =
                "กรุณากรอกเขต / อำเภอ";

        }

        /* ----------------------------------------------------
           แขวง / ตำบล
        ---------------------------------------------------- */

        if (!form.subdistrict.trim()) {

            newErrors.subdistrict =
                "กรุณากรอกแขวง / ตำบล";

        }

        /* ----------------------------------------------------
           Email
        ---------------------------------------------------- */

        if (
            form.email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                form.email
            )
        ) {

            newErrors.email =
                "รูปแบบ Email ไม่ถูกต้อง";

        }

        /* ----------------------------------------------------
           Google Maps
        ---------------------------------------------------- */

        if (
            form.googleMaps &&
            !form.googleMaps.includes("http")
        ) {

            newErrors.googleMaps =
                "กรุณาใส่ลิงก์ Google Maps ที่ถูกต้อง";

        }

        /* ----------------------------------------------------
           แสดง Error
        ---------------------------------------------------- */

        setErrors(newErrors);

        return (
            Object.keys(newErrors).length === 0
        );

    };

    /* ========================================================
       NEXT
       --------------------------------------------------------
       ส่งข้อมูลทั้งหมดไป Step 4
    ======================================================== */

    const handleNext = () => {

        /* ตรวจสอบ Form */

        if (!validateForm()) {

            return;

        }

        /* ถ้าไม่มี Package
           ให้กลับไป Step 1 */

        if (!selectedPackage || !packageId) {

            router.push(
                "/booking/package"
            );

            return;

        }

        /* ====================================================
           เตรียมข้อมูล
           ==================================================== */

        const params =
            new URLSearchParams({

                /* Booking */

                package: packageId,

                date:
                    bookingDate ?? "",

                /* Customer */

                name:
                    form.fullName,

                phone:
                    form.phone,

                line:
                    form.lineId,

                email:
                    form.email,

                /* Event */

                event:
                    form.eventType,

                guests:
                    form.guestCount,

                /* Time */

                startTime:
                    form.startTime,

                endTime:
                    form.endTime,

                durationHours:
                    String(serviceDuration),

                /* Location */

                venue:
                    form.venue,

                province:
                    form.province,

                district:
                    form.district,

                subdistrict:
                    form.subdistrict,

                address:
                    form.address,

                postalCode:
                    form.postalCode,

                googleMaps:
                    form.googleMaps,

                /* Note */

                note:
                    form.note,

                /* Price */

                travelFee:
                    String(travelFee),

                packagePrice:
                    String(packagePrice),

                estimatedTotal:
                    String(estimatedTotal),

            });

        /* ====================================================
           ไป Step 4
        ==================================================== */

        router.push(
            `/booking/review?${params.toString()}`
        );

    };

    if (authChecking || !isAuthenticated) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
                <div className="text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-pink-100 border-t-pink-500" />
                    <p className="mt-4 text-sm font-medium text-slate-500">
                        กำลังตรวจสอบบัญชี...
                    </p>
                </div>
            </main>
        );
    }

    return (

        <main className="min-h-screen bg-slate-50">

            {/* =================================================
                STEP INDICATOR
            ================================================= */}

            {/* =================================================
                BOOKING HEADER + STEP INDICATOR
            ================================================= */}

            <section className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">

                <div className="mx-auto max-w-7xl px-4 sm:px-6">

                    {/* Top row */}

                    <div className="flex min-h-[72px] items-center justify-between gap-4">

                        <div className="min-w-0 text-center">
                            <p className="truncate text-xs font-bold uppercase tracking-[0.22em] text-pink-500">
                                KOKO Memory
                            </p>

                            <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
                                ขั้นตอนการจอง
                            </p>
                        </div>

                        <div className="w-[74px] shrink-0 text-right sm:w-[120px]">
                            <p className="text-[11px] font-medium text-slate-400">
                                STEP
                            </p>

                            <p className="text-sm font-black text-slate-900">
                                03 <span className="font-normal text-slate-300">/</span> 06
                            </p>
                        </div>

                    </div>

                    {/* Step progress */}

                    <div className="overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

                        <div className="mx-auto flex min-w-max items-center justify-center gap-2 sm:gap-3">

                            {[
                                {
                                    number: 1,
                                    label: "แพ็กเกจ",
                                    done: true,
                                },
                                {
                                    number: 2,
                                    label: "วันจัดงาน",
                                    done: true,
                                },
                                {
                                    number: 3,
                                    label: "ข้อมูล",
                                    active: true,
                                },
                                {
                                    number: 4,
                                    label: "ตรวจสอบ",
                                },
                                {
                                    number: 5,
                                    label: "ชำระเงิน",
                                },
                                {
                                    number: 6,
                                    label: "สำเร็จ",
                                },
                            ].map((step, index) => (
                                <div
                                    key={step.number}
                                    className="flex items-center gap-2 sm:gap-3"
                                >
                                    <div
                                        className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                                            step.active
                                                ? "bg-pink-500 text-white shadow-lg shadow-pink-200"
                                                : step.done
                                                    ? "bg-green-50 text-green-700"
                                                    : "bg-slate-100 text-slate-400"
                                        }`}
                                    >
                                        <span
                                            className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                                                step.active
                                                    ? "bg-white/20 text-white"
                                                    : step.done
                                                        ? "bg-green-100 text-green-700"
                                                        : "bg-white text-slate-400"
                                            }`}
                                        >
                                            {step.done ? "✓" : step.number}
                                        </span>

                                        <span>
                                            {step.label}
                                        </span>
                                    </div>

                                    {index < 5 && (
                                        <span className="text-slate-300">
                                            →
                                        </span>
                                    )}
                                </div>
                            ))}

                        </div>

                    </div>

                </div>

            </section>

            {/* =================================================
                CONTENT
            ================================================= */}

            <section className="mx-auto max-w-7xl px-6 py-10">

                <div className="grid gap-8 lg:grid-cols-[1fr_380px]">

                    {/* =================================================
                        FORM
                    ================================================= */}

                    <Card className="rounded-3xl border-0 shadow-xl">

                        <CardContent className="p-6 md:p-10">

                            {/* Header */}

                            <div className="mb-10">

                                <p className="text-sm font-bold uppercase tracking-[0.25em] text-pink-500">
                                    Booking Step 3
                                </p>

                                <h1 className="mt-2 text-3xl font-black text-slate-900 md:text-4xl">
                                    ข้อมูลผู้จองและสถานที่จัดงาน
                                </h1>

                                <p className="mt-3 leading-7 text-slate-500">
                                    กรุณากรอกข้อมูลให้ครบถ้วน เพื่อให้ทีมงานสามารถเตรียมงานและประเมินค่าเดินทางได้อย่างถูกต้อง
                                </p>

                            </div>

                            <div className="space-y-10">

                                {/* =================================================
                                    1. CUSTOMER
                                ================================================= */}

                                <div>

                                    <h2 className="text-xl font-bold text-slate-900">
                                        1. ข้อมูลผู้ติดต่อ
                                    </h2>

                                    <div className="mt-5 grid gap-6 md:grid-cols-2">

                                        {/* Name */}

                                        <div className="md:col-span-2">

                                            <Label>

                                                ชื่อ-นามสกุล

                                                <span className="ml-1 text-pink-500">
                                                    *
                                                </span>

                                            </Label>

                                            <div className="relative mt-2">

                                                <User
                                                    size={18}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                />

                                                <Input
                                                    value={
                                                        form.fullName
                                                    }
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "fullName",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="เช่น สมชาย ใจดี"
                                                    className="h-12 rounded-xl pl-11"
                                                />

                                            </div>

                                            {errors.fullName && (

                                                <p className="mt-2 text-sm text-red-500">
                                                    {errors.fullName}
                                                </p>

                                            )}

                                        </div>

                                        {/* Phone */}

                                        <div>

                                            <Label>

                                                เบอร์โทรศัพท์

                                                <span className="ml-1 text-pink-500">
                                                    *
                                                </span>

                                            </Label>

                                            <div className="relative mt-2">

                                                <Phone
                                                    size={18}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                />

                                                <Input
                                                    value={
                                                        form.phone
                                                    }
                                                    inputMode="numeric"
                                                    maxLength={10}
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "phone",
                                                            e.target.value.replace(
                                                                /\D/g,
                                                                ""
                                                            )
                                                        )
                                                    }
                                                    placeholder="0801234567"
                                                    className="h-12 rounded-xl pl-11"
                                                />

                                            </div>

                                            {errors.phone && (

                                                <p className="mt-2 text-sm text-red-500">
                                                    {errors.phone}
                                                </p>

                                            )}

                                        </div>

                                        {/* LINE */}

                                        <div>

                                            <Label>
                                                LINE ID
                                            </Label>

                                            <Input
                                                value={
                                                    form.lineId
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        "lineId",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="@kokomemory"
                                                className="mt-2 h-12 rounded-xl"
                                            />

                                        </div>

                                        {/* Email */}

                                        <div className="md:col-span-2">

                                            <Label>
                                                Email
                                            </Label>

                                            <div className="relative mt-2">

                                                <Mail
                                                    size={18}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                />

                                                <Input
                                                    type="email"
                                                    value={
                                                        form.email
                                                    }
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "email",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="example@email.com"
                                                    className="h-12 rounded-xl pl-11"
                                                />

                                            </div>

                                            {errors.email && (

                                                <p className="mt-2 text-sm text-red-500">
                                                    {errors.email}
                                                </p>

                                            )}

                                        </div>

                                    </div>

                                </div>

                                {/* =================================================
                                    2. EVENT
                                ================================================= */}

                                <div>

                                    <h2 className="text-xl font-bold text-slate-900">
                                        2. รายละเอียดงาน
                                    </h2>

                                    <div className="mt-5 grid gap-6 md:grid-cols-2">

                                        {/* Event Type */}

                                        <div>

                                            <Label>

                                                ประเภทงาน

                                                <span className="ml-1 text-pink-500">
                                                    *
                                                </span>

                                            </Label>

                                            <Select
                                                value={form.eventType}
                                                onValueChange={(value) =>
                                                    handleChange(
                                                        "eventType",
                                                        value ?? ""
                                                    )
                                                }
                                            >

                                                <SelectTrigger className="mt-2 h-12 rounded-xl">

                                                    <SelectValue placeholder="เลือกประเภทงาน" />

                                                </SelectTrigger>

                                                <SelectContent>

                                                    {eventTypes.map(
                                                        (item) => (

                                                            <SelectItem
                                                                key={
                                                                    item.value
                                                                }
                                                                value={
                                                                    item.value
                                                                }
                                                            >
                                                                {
                                                                    item.label
                                                                }
                                                            </SelectItem>

                                                        )
                                                    )}

                                                </SelectContent>

                                            </Select>

                                            {errors.eventType && (

                                                <p className="mt-2 text-sm text-red-500">
                                                    {
                                                        errors.eventType
                                                    }
                                                </p>

                                            )}

                                        </div>

                                        {/* Guests */}

                                        <div>

                                            <Label>
                                                จำนวนแขกโดยประมาณ
                                            </Label>

                                            <Input
                                                type="number"
                                                min={1}
                                                value={
                                                    form.guestCount
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        "guestCount",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="เช่น 300"
                                                className="mt-2 h-12 rounded-xl"
                                            />

                                        </div>

                                    </div>

                                </div>

                                {/* =================================================
                                    3. EVENT TIME
                                ================================================= */}

                                <div>

                                    <div className="flex items-start gap-3">

                                        <div className="rounded-xl bg-pink-100 p-3 text-pink-500">
                                            <Clock3 size={22} />
                                        </div>

                                        <div>
                                            <h2 className="text-xl font-bold text-slate-900">
                                                3. เวลาให้บริการ
                                            </h2>

                                            <p className="mt-1 text-sm leading-6 text-slate-500">
                                                แพ็กเกจนี้กำหนดระยะเวลาไว้{" "}
                                                <span className="font-bold text-pink-500">
                                                    {serviceDuration} ชั่วโมง
                                                </span>{" "}
                                                กรุณาเลือกเวลาเริ่มงาน ระบบจะคำนวณเวลาสิ้นสุดให้อัตโนมัติ
                                            </p>
                                        </div>

                                    </div>

                                    <div className="mt-6 grid gap-6 md:grid-cols-2">

                                        <div>
                                            <Label>
                                                เวลาเริ่มงาน
                                                <span className="ml-1 text-pink-500">
                                                    *
                                                </span>
                                            </Label>

                                            <Select
                                                value={form.startTime}
                                                onValueChange={(value) =>
                                                    handleChange(
                                                        "startTime",
                                                        value ?? ""
                                                    )
                                                }
                                            >
                                                <SelectTrigger
                                                    className={`mt-2 h-12 rounded-xl ${
                                                        errors.startTime
                                                            ? "border-red-300"
                                                            : ""
                                                    }`}
                                                >
                                                    <SelectValue placeholder="เลือกเวลาเริ่มงาน" />
                                                </SelectTrigger>

                                                <SelectContent>
                                                    {startTimeOptions.map(
                                                        (time) => (
                                                            <SelectItem
                                                                key={time}
                                                                value={time}
                                                            >
                                                                {time} น.
                                                            </SelectItem>
                                                        )
                                                    )}
                                                </SelectContent>
                                            </Select>

                                            {errors.startTime && (
                                                <p className="mt-2 text-sm text-red-500">
                                                    {errors.startTime}
                                                </p>
                                            )}
                                        </div>

                                        <div>
                                            <Label>
                                                เวลาสิ้นสุด
                                            </Label>

                                            <div
                                                className={`mt-2 flex h-12 items-center justify-between rounded-xl border px-4 ${
                                                    form.endTime
                                                        ? "border-green-200 bg-green-50"
                                                        : "border-slate-200 bg-slate-50"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <Clock3
                                                        size={17}
                                                        className={
                                                            form.endTime
                                                                ? "text-green-500"
                                                                : "text-slate-400"
                                                        }
                                                    />

                                                    <span
                                                        className={`text-sm font-bold ${
                                                            form.endTime
                                                                ? "text-green-700"
                                                                : "text-slate-400"
                                                        }`}
                                                    >
                                                        {form.endTime
                                                            ? `${form.endTime} น.`
                                                            : "เลือกเวลาเริ่มงานก่อน"}
                                                    </span>
                                                </div>

                                                {form.endTime && (
                                                    <CheckCircle2
                                                        size={18}
                                                        className="text-green-500"
                                                    />
                                                )}
                                            </div>

                                            {errors.endTime && (
                                                <p className="mt-2 text-sm text-red-500">
                                                    {errors.endTime}
                                                </p>
                                            )}
                                        </div>

                                    </div>

                                    {form.startTime && form.endTime && (
                                        <div className="mt-4 rounded-2xl border border-pink-100 bg-pink-50 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div>
                                                    <p className="text-xs font-semibold text-pink-500">
                                                        ช่วงเวลาที่เลือก
                                                    </p>

                                                    <p className="mt-1 text-base font-black text-slate-900">
                                                        {formatTimeRange(
                                                            form.startTime,
                                                            form.endTime
                                                        )}
                                                    </p>
                                                </div>

                                                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-pink-600">
                                                    {serviceDuration} ชั่วโมง
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                </div>

                                {/* =================================================
                                    4. LOCATION
                                ================================================= */}

                                <div>

                                    <div className="flex items-start gap-3">

                                        <div className="rounded-xl bg-pink-100 p-3 text-pink-500">

                                            <MapPin size={22} />

                                        </div>

                                        <div>

                                            <h2 className="text-xl font-bold text-slate-900">
                                                4. สถานที่จัดงาน
                                            </h2>

                                            <p className="mt-1 text-sm text-slate-500">
                                                ข้อมูลส่วนนี้ใช้สำหรับตรวจสอบพื้นที่และคำนวณค่าเดินทาง
                                            </p>

                                        </div>

                                    </div>

                                    <div className="mt-6 space-y-6">

                                        {/* Venue */}

                                        <div>

                                            <Label>

                                                ชื่อสถานที่จัดงาน

                                                <span className="ml-1 text-pink-500">
                                                    *
                                                </span>

                                            </Label>

                                            <Input
                                                value={
                                                    form.venue
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        "venue",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="เช่น โรงแรม ABC Bangkok / Impact Arena"
                                                className="mt-2 h-12 rounded-xl"
                                            />

                                            {errors.venue && (

                                                <p className="mt-2 text-sm text-red-500">
                                                    {errors.venue}
                                                </p>

                                            )}

                                        </div>

                                        {/* Province */}

                                        <div>

                                            <Label>

                                                จังหวัด

                                                <span className="ml-1 text-pink-500">
                                                    *
                                                </span>

                                            </Label>

                                            {/* ------------------------------------------------
                                                Searchable Province Selector
                                                ------------------------------------------------
                                                ครบ 77 จังหวัด
                                                พิมพ์ค้นหาได้
                                                Scroll เลือกได้
                                            ------------------------------------------------ */}

                                            <ProvinceCombobox
                                                value={
                                                    form.province
                                                }
                                                onChange={(value) => {
                                                    /*
                                                     * เมื่อเปลี่ยนจังหวัด
                                                     * ต้องล้างข้อมูลพื้นที่ระดับล่างทั้งหมด
                                                     * เพื่อป้องกันการส่งข้อมูลคนละจังหวัด
                                                     */
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        province: value,
                                                        district: "",
                                                        subdistrict: "",
                                                        postalCode: "",
                                                    }));

                                                    setErrors((previous) => ({
                                                        ...previous,
                                                        province: "",
                                                        district: "",
                                                        subdistrict: "",
                                                        postalCode: "",
                                                    }));
                                                }}
                                                error={
                                                    errors.province
                                                }
                                            />

                                        </div>

                                        {/* District / Subdistrict */}

                                        <div className="grid gap-6 md:grid-cols-2">

                                            {/* District */}

                                            <ThaiAddressCombobox
                                                label={
                                                    form.province === "กรุงเทพมหานคร"
                                                        ? "เขต"
                                                        : "อำเภอ"
                                                }
                                                value={form.district}
                                                province={form.province}
                                                level="district"
                                                onChange={(value) => {
                                                    /*
                                                     * เมื่อเปลี่ยนเขต / อำเภอ
                                                     * ต้องล้างตำบลและรหัสไปรษณีย์เดิม
                                                     */
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        district: value,
                                                        subdistrict: "",
                                                        postalCode: "",
                                                    }));

                                                    setErrors((previous) => ({
                                                        ...previous,
                                                        district: "",
                                                        subdistrict: "",
                                                        postalCode: "",
                                                    }));
                                                }}
                                                error={
                                                    errors.district
                                                }
                                                disabled={
                                                    !form.province
                                                }
                                            />

                                            {/* Subdistrict */}

                                            <ThaiAddressCombobox
                                                label={
                                                    form.province === "กรุงเทพมหานคร"
                                                        ? "แขวง"
                                                        : "ตำบล"
                                                }
                                                value={
                                                    form.subdistrict
                                                }
                                                province={
                                                    form.province
                                                }
                                                district={
                                                    form.district
                                                }
                                                level="subdistrict"
                                                onChange={(value) => {
                                                    /*
                                                     * เมื่อเลือกแขวง / ตำบลใหม่
                                                     * ล้างรหัสไปรษณีย์เดิมทันที
                                                     *
                                                     * จากนั้น useEffect
                                                     * จะค้นหารหัสไปรษณีย์ใหม่อัตโนมัติ
                                                     */
                                                    setForm((previous) => ({
                                                        ...previous,
                                                        subdistrict: value,
                                                        postalCode: "",
                                                    }));

                                                    setErrors((previous) => ({
                                                        ...previous,
                                                        subdistrict: "",
                                                        postalCode: "",
                                                    }));
                                                }}
                                                error={
                                                    errors.subdistrict
                                                }
                                                disabled={
                                                    !form.province ||
                                                    !form.district
                                                }
                                            />

                                        </div>

                                        {/* Address */}

                                        <div>

                                            <Label>
                                                ที่อยู่เพิ่มเติม
                                            </Label>

                                            <Textarea
                                                value={
                                                    form.address
                                                }
                                                onChange={(e) =>
                                                    handleChange(
                                                        "address",
                                                        e.target.value
                                                    )
                                                }
                                                placeholder="บ้านเลขที่ อาคาร ถนน ชั้น ห้อง หรือรายละเอียดที่ช่วยให้ทีมงานหาสถานที่ได้ง่ายขึ้น"
                                                className="mt-2 min-h-24 rounded-xl"
                                            />

                                        </div>

                                        {/* Postal Code */}

                                        <div className="max-w-xs">

                                            <Label>
                                                รหัสไปรษณีย์
                                            </Label>

                                            <div className="relative mt-2">

                                                <Input
                                                    inputMode="numeric"
                                                    maxLength={5}
                                                    value={
                                                        form.postalCode
                                                    }
                                                    readOnly
                                                    placeholder="เลือกตำบลเพื่อเติมอัตโนมัติ"
                                                    className="h-12 rounded-xl bg-slate-50 pr-10"
                                                />

                                                {form.postalCode && (
                                                    <CheckCircle2
                                                        size={18}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500"
                                                    />
                                                )}

                                            </div>

                                            <p className="mt-2 text-xs text-slate-400">
                                                ระบบจะเติมรหัสไปรษณีย์อัตโนมัติจากพื้นที่ที่เลือก
                                            </p>

                                        </div>

                                        {/* Google Maps */}

                                        <div>

                                            <Label>
                                                Google Maps
                                            </Label>

                                            <div className="relative mt-2">

                                                <MapPin
                                                    size={18}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                                                />

                                                <Input
                                                    value={
                                                        form.googleMaps
                                                    }
                                                    onChange={(e) =>
                                                        handleChange(
                                                            "googleMaps",
                                                            e.target.value
                                                        )
                                                    }
                                                    placeholder="วางลิงก์ Google Maps ของสถานที่จัดงาน"
                                                    className="h-12 rounded-xl pl-11"
                                                />

                                            </div>

                                            {form.googleMaps && (

                                                <a
                                                    href={
                                                        form.googleMaps
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-pink-500 hover:underline"
                                                >

                                                    เปิด Google Maps

                                                    <ExternalLink
                                                        size={14}
                                                    />

                                                </a>

                                            )}

                                            {errors.googleMaps && (

                                                <p className="mt-2 text-sm text-red-500">
                                                    {
                                                        errors.googleMaps
                                                    }
                                                </p>

                                            )}

                                        </div>

                                    </div>

                                </div>

                                {/* =================================================
                                    5. NOTE
                                ================================================= */}

                                <div>

                                    <Label>
                                        รายละเอียดเพิ่มเติม
                                    </Label>

                                    <Textarea
                                        value={
                                            form.note
                                        }
                                        onChange={(e) =>
                                            handleChange(
                                                "note",
                                                e.target.value
                                            )
                                        }
                                        placeholder="เช่น เวลาเริ่มงาน, ธีมงาน, ต้องการ Backdrop แบบไหน หรือรายละเอียดอื่น ๆ"
                                        className="mt-2 min-h-32 rounded-xl"
                                    />

                                </div>

                            </div>

                            {/* =================================================
                                BUTTONS
                            ================================================= */}

                            <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row">

                                {/* Back */}

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() =>
                                        router.push(
                                            `/booking/schedule?package=${encodeURIComponent(
                                                packageId ?? ""
                                            )}`
                                        )
                                    }
                                    className="h-14 rounded-full border-slate-200 bg-white font-semibold text-slate-700 hover:border-pink-200 hover:bg-pink-50 hover:text-pink-600 sm:flex-1"
                                >

                                    <ArrowLeft
                                        size={18}
                                    />

                                    กลับไปเลือกวัน

                                </Button>

                                {/* Next */}

                                <Button
                                    type="button"
                                    onClick={
                                        handleNext
                                    }
                                    disabled={
                                        !selectedPackage ||
                                        !form.startTime ||
                                        !form.endTime
                                    }
                                    className="h-14 rounded-full bg-pink-500 font-bold text-white hover:bg-pink-400 sm:flex-1"
                                >

                                    ตรวจสอบข้อมูล

                                    <ArrowRight
                                        size={18}
                                    />

                                </Button>

                            </div>

                        </CardContent>

                    </Card>

                    {/* =================================================
                        RIGHT SUMMARY
                    ================================================= */}

                    <div>

                        <Card className="rounded-3xl border-0 shadow-xl lg:sticky lg:top-24">

                            <CardContent className="p-7">

                                <p className="text-sm font-bold uppercase tracking-[0.2em] text-pink-500">
                                    Your Booking
                                </p>

                                <h2 className="mt-2 text-2xl font-black text-slate-900">
                                    สรุปการจอง
                                </h2>

                                {/* =================================================
                                    Package
                                ================================================= */}

                                <div className="mt-7 rounded-2xl bg-slate-50 p-5">

                                    <p className="text-sm text-slate-500">
                                        แพ็กเกจ
                                    </p>

                                    {selectedPackage ? (

                                        <>

                                            <p className="mt-1 text-xl font-bold text-slate-900">
                                                {
                                                    selectedPackage.name
                                                }
                                            </p>

                                            <p className="mt-1 text-sm text-slate-500">
                                                {
                                                    selectedPackage.category
                                                }
                                            </p>

                                            <div className="mt-4 flex items-end justify-between">

                                                <div>

                                                    <p className="text-xs text-slate-400">
                                                        ราคา
                                                    </p>

                                                    <p className="text-xl font-black text-pink-500">
                                                        ฿
                                                        {formatMoney(
                                                            selectedPackage.price
                                                        )}
                                                    </p>

                                                </div>

                                                <div className="text-right">

                                                    <p className="text-xs text-slate-400">
                                                        ระยะเวลา
                                                    </p>

                                                    <p className="font-bold text-slate-700">
                                                        {
                                                            selectedPackage.hours
                                                        }{" "}
                                                        ชั่วโมง
                                                    </p>

                                                </div>

                                            </div>

                                        </>

                                    ) : (

                                        <div className="mt-3 rounded-xl bg-red-50 p-3">

                                            <p className="text-sm font-semibold text-red-600">
                                                ไม่พบแพ็กเกจ
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    router.push(
                                                        "/booking/package"
                                                    )
                                                }
                                                className="mt-1 text-xs text-red-500 underline"
                                            >
                                                กลับไปเลือกแพ็กเกจ
                                            </button>

                                        </div>

                                    )}

                                </div>

                                {/* =================================================
                                    Date
                                ================================================= */}

                                <div className="mt-4 rounded-2xl bg-slate-50 p-5">

                                    <div className="flex items-center gap-2">

                                        <CalendarDays
                                            size={18}
                                            className="text-pink-500"
                                        />

                                        <p className="text-sm text-slate-500">
                                            วันที่จัดงาน
                                        </p>

                                    </div>

                                    <p className="mt-2 font-bold text-slate-900">
                                        {
                                            formatThaiDate(
                                                bookingDate
                                            )
                                        }
                                    </p>

                                </div>

                                {/* =================================================
                                    Time
                                ================================================= */}

                                <div className="mt-4 rounded-2xl bg-slate-50 p-5">

                                    <div className="flex items-center gap-2">
                                        <Clock3
                                            size={18}
                                            className="text-pink-500"
                                        />

                                        <p className="text-sm text-slate-500">
                                            เวลาให้บริการ
                                        </p>
                                    </div>

                                    <p className="mt-2 font-bold text-slate-900">
                                        {formatTimeRange(
                                            form.startTime,
                                            form.endTime
                                        )}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-400">
                                        ระยะเวลาแพ็กเกจ {serviceDuration} ชั่วโมง
                                    </p>

                                </div>

                                {/* =================================================
                                    Travel Fee
                                ================================================= */}

                                {form.province && (

                                    <div className="mt-4 rounded-2xl border border-pink-100 bg-pink-50 p-5">

                                        <div className="flex items-center gap-2">

                                            <MapPin
                                                size={18}
                                                className="text-pink-500"
                                            />

                                            <p className="text-sm text-slate-600">
                                                พื้นที่จัดงาน
                                            </p>

                                        </div>

                                        <p className="mt-2 font-bold text-slate-900">
                                            {
                                                form.province
                                            }
                                        </p>

                                        <div className="mt-3 flex items-center justify-between border-t border-pink-100 pt-3">

                                            <span className="text-sm text-slate-500">
                                                ค่าเดินทาง
                                            </span>

                                            <span className="font-bold text-pink-600">

                                                {travelFee === 0
                                                    ? "ฟรี"
                                                    : `+ ฿${formatMoney(
                                                        travelFee ?? 0
                                                    )}`}

                                            </span>

                                        </div>

                                    </div>

                                )}

                                {/* =================================================
                                    PRICE SUMMARY
                                ================================================= */}

                                <div className="mt-6 border-t pt-6">

                                    {/* Package */}

                                    <div className="flex justify-between text-sm">

                                        <span className="text-slate-500">
                                            ราคาแพ็กเกจ
                                        </span>

                                        <span className="font-semibold">
                                            ฿
                                            {formatMoney(
                                                packagePrice
                                            )}
                                        </span>

                                    </div>

                                    {/* Travel */}

                                    <div className="mt-3 flex justify-between text-sm">

                                        <span className="text-slate-500">
                                            ค่าเดินทาง
                                        </span>

                                        <span className="font-semibold">

                                            {travelFee === 0
                                                ? "ฟรี"
                                                : `฿${formatMoney(
                                                    travelFee ?? 0
                                                )}`}

                                        </span>

                                    </div>

                                    {/* Total */}

                                    <div className="mt-5 flex items-end justify-between border-t pt-5">

                                        <span className="font-bold text-slate-900">
                                            ประมาณการรวม
                                        </span>

                                        <span className="text-2xl font-black text-pink-500">
                                            ฿
                                            {formatMoney(
                                                estimatedTotal
                                            )}
                                        </span>

                                    </div>

                                </div>

                                {/* =================================================
                                    STATUS
                                ================================================= */}

                                <div className="mt-6 flex gap-3 rounded-2xl bg-green-50 p-4">

                                    <CheckCircle2
                                        size={20}
                                        className="mt-0.5 shrink-0 text-green-500"
                                    />

                                    <div>

                                        <p className="font-bold text-green-700">
                                            คำนวณราคาเบื้องต้นแล้ว
                                        </p>

                                        <p className="mt-1 text-xs leading-5 text-green-700/80">
                                            ค่าเดินทางเป็นประมาณการเบื้องต้น ทีมงานจะตรวจสอบรายละเอียดสถานที่อีกครั้งก่อนยืนยันการจอง
                                        </p>

                                    </div>

                                </div>

                            </CardContent>

                        </Card>

                    </div>

                </div>

            </section>

        </main>
    );
}

export default function CustomerPage() {
    return (
        <Suspense fallback={null}>
            <CustomerContent />
        </Suspense>
    );
}
