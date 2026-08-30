"use client";

/**
 * ============================================================
 * KOKO Memory
 * Province Combobox
 * ============================================================
 *
 * หน้าที่:
 * ------------------------------------------------------------
 * ช่องเลือกจังหวัดแบบ Searchable
 *
 * ความสามารถ:
 * ------------------------------------------------------------
 * 1. พิมพ์ค้นหาจังหวัด
 * 2. เลื่อนดูจังหวัด
 * 3. เลือกจังหวัด
 * 4. แสดงจังหวัดที่เลือก
 *
 * ในอนาคต:
 * ------------------------------------------------------------
 * จังหวัดที่เลือกจะถูกส่งต่อไปยัง
 *
 * Province
 *    ↓
 * District
 *    ↓
 * Subdistrict
 *    ↓
 * Postal Code
 *    ↓
 * Travel Fee
 * ============================================================
 */

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

type Province = {
    id: string;
    name: string;
};

const provinces: Province[] = [
    { id: "10", name: "กรุงเทพมหานคร" },
    { id: "71", name: "กาญจนบุรี" },
    { id: "46", name: "กาฬสินธุ์" },
    { id: "62", name: "กำแพงเพชร" },
    { id: "81", name: "กระบี่" },
    { id: "40", name: "ขอนแก่น" },
    { id: "22", name: "จันทบุรี" },
    { id: "24", name: "ฉะเชิงเทรา" },
    { id: "20", name: "ชลบุรี" },
    { id: "18", name: "ชัยนาท" },
    { id: "36", name: "ชัยภูมิ" },
    { id: "86", name: "ชุมพร" },
    { id: "92", name: "ตรัง" },
    { id: "23", name: "ตราด" },
    { id: "63", name: "ตาก" },
    { id: "26", name: "นครนายก" },
    { id: "73", name: "นครปฐม" },
    { id: "48", name: "นครพนม" },
    { id: "30", name: "นครราชสีมา" },
    { id: "80", name: "นครศรีธรรมราช" },
    { id: "60", name: "นครสวรรค์" },
    { id: "12", name: "นนทบุรี" },
    { id: "96", name: "นราธิวาส" },
    { id: "55", name: "น่าน" },
    { id: "38", name: "บึงกาฬ" },
    { id: "31", name: "บุรีรัมย์" },
    { id: "13", name: "ปทุมธานี" },
    { id: "77", name: "ประจวบคีรีขันธ์" },
    { id: "25", name: "ปราจีนบุรี" },
    { id: "94", name: "ปัตตานี" },
    { id: "14", name: "พระนครศรีอยุธยา" },
    { id: "56", name: "พะเยา" },
    { id: "82", name: "พังงา" },
    { id: "93", name: "พัทลุง" },
    { id: "66", name: "พิจิตร" },
    { id: "65", name: "พิษณุโลก" },
    { id: "76", name: "เพชรบุรี" },
    { id: "67", name: "เพชรบูรณ์" },
    { id: "54", name: "แพร่" },
    { id: "83", name: "ภูเก็ต" },
    { id: "44", name: "มหาสารคาม" },
    { id: "49", name: "มุกดาหาร" },
    { id: "58", name: "แม่ฮ่องสอน" },
    { id: "35", name: "ยโสธร" },
    { id: "95", name: "ยะลา" },
    { id: "45", name: "ร้อยเอ็ด" },
    { id: "85", name: "ระนอง" },
    { id: "21", name: "ระยอง" },
    { id: "70", name: "ราชบุรี" },
    { id: "16", name: "ลพบุรี" },
    { id: "33", name: "ศรีสะเกษ" },
    { id: "42", name: "เลย" },
    { id: "39", name: "สกลนคร" },
    { id: "91", name: "สตูล" },
    { id: "11", name: "สมุทรปราการ" },
    { id: "75", name: "สมุทรสงคราม" },
    { id: "74", name: "สมุทรสาคร" },
    { id: "27", name: "สระแก้ว" },
    { id: "17", name: "สระบุรี" },
    { id: "19", name: "สระบุรี" },
    { id: "90", name: "สงขลา" },
    { id: "64", name: "สุโขทัย" },
    { id: "72", name: "สุพรรณบุรี" },
    { id: "84", name: "สุราษฎร์ธานี" },
    { id: "32", name: "สุรินทร์" },
    { id: "43", name: "หนองคาย" },
    { id: "39", name: "หนองบัวลำภู" },
    { id: "37", name: "อำนาจเจริญ" },
    { id: "41", name: "อุดรธานี" },
    { id: "53", name: "อุตรดิตถ์" },
    { id: "61", name: "อุทัยธานี" },
    { id: "34", name: "อุบลราชธานี" },
    { id: "50", name: "เชียงใหม่" },
    { id: "57", name: "เชียงราย" },
    { id: "47", name: "สระบุรี" },
];

type ProvinceComboboxProps = {
    value: string;
    onChange: (value: string) => void;
    error?: string;
};

export default function ProvinceCombobox({
    value,
    onChange,
    error,
}: ProvinceComboboxProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const filteredProvinces = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
            return provinces;
        }

        return provinces.filter((province) =>
            province.name.toLowerCase().includes(keyword)
        );
    }, [search]);

    const selectedProvince = provinces.find(
        (province) => province.name === value
    );

    const handleSelect = (province: Province) => {
        onChange(province.name);
        setSearch("");
        setOpen(false);
    };

    return (
        <div className="relative">
            {/* =====================================================
                Label
            ====================================================== */}

            <label className="mb-2 block text-sm font-semibold text-slate-800">
                จังหวัด <span className="text-pink-500">*</span>
            </label>

            {/* =====================================================
                Main Button
            ====================================================== */}

            <button
                type="button"
                onClick={() => setOpen((current) => !current)}
                className={`flex h-14 w-full items-center justify-between rounded-2xl border bg-white px-4 text-left transition ${error
                        ? "border-red-400"
                        : open
                            ? "border-pink-500 ring-4 ring-pink-100"
                            : "border-slate-200 hover:border-pink-300"
                    }`}
            >
                <span
                    className={
                        selectedProvince
                            ? "text-slate-900"
                            : "text-slate-400"
                    }
                >
                    {selectedProvince
                        ? selectedProvince.name
                        : "ค้นหาหรือเลือกจังหวัด..."}
                </span>

                <ChevronDown
                    size={20}
                    className={`text-slate-400 transition ${open ? "rotate-180" : ""
                        }`}
                />
            </button>

            {/* =====================================================
                Dropdown
            ====================================================== */}

            {open && (
                <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                    {/* Search */}

                    <div className="border-b border-slate-100 p-3">
                        <div className="relative">
                            <Search
                                size={18}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                            />

                            <input
                                autoFocus
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="พิมพ์ชื่อจังหวัด..."
                                className="h-11 w-full rounded-xl bg-slate-50 pl-10 pr-10 text-sm outline-none ring-0 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-pink-200"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                >
                                    <X size={17} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Province List */}

                    <div className="max-h-72 overflow-y-auto p-2">
                        {filteredProvinces.length > 0 ? (
                            filteredProvinces.map((province) => {
                                const selected =
                                    province.name === value;

                                return (
                                    <button
                                        key={`${province.id}-${province.name}`}
                                        type="button"
                                        onClick={() =>
                                            handleSelect(province)
                                        }
                                        className={`flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm transition ${selected
                                                ? "bg-pink-50 font-semibold text-pink-600"
                                                : "text-slate-700 hover:bg-slate-50"
                                            }`}
                                    >
                                        <span>{province.name}</span>

                                        {selected && (
                                            <Check
                                                size={18}
                                                className="text-pink-500"
                                            />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="px-4 py-8 text-center text-sm text-slate-400">
                                ไม่พบจังหวัดที่ค้นหา
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