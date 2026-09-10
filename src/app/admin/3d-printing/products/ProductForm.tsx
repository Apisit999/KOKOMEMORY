"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { ThreeDProduct, ThreeDProductStatus } from "@/services/threeDProducts";

export type ThreeDProductInput = Omit<
    ThreeDProduct,
    "id" | "createdAt" | "updatedAt"
>;

const emptyProduct: ThreeDProductInput = {
    name: "",
    description: "",
    category: "",
    material: "",
    price: 0,
    weight: 0,
    printTime: "",
    previewImage: "",
    modelFile: "",
    status: "active",
};

type ProductFormProps = {
    initialValue?: ThreeDProductInput;
    submitLabel: string;
    onSubmit: (value: ThreeDProductInput) => Promise<void>;
};

export default function ProductForm({
    initialValue = emptyProduct,
    submitLabel,
    onSubmit,
}: ProductFormProps) {
    const [value, setValue] = useState<ThreeDProductInput>(initialValue);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    function update<K extends keyof ThreeDProductInput>(
        key: K,
        nextValue: ThreeDProductInput[K]
    ) {
        setValue((current) => ({ ...current, [key]: nextValue }));
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        try {
            setSaving(true);
            setError("");
            await onSubmit({
                ...value,
                name: value.name.trim(),
                description: value.description.trim(),
                category: value.category.trim(),
                material: value.material.trim(),
                previewImage: value.previewImage.trim(),
                modelFile: value.modelFile.trim(),
                price: Number(value.price) || 0,
                weight: Number(value.weight) || 0,
                printTime: value.printTime.trim(),
            });
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถบันทึก Product ได้"
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="grid gap-5 md:grid-cols-2">
                <Field label="ชื่อ Product" required>
                    <input required value={value.name} onChange={(event) => update("name", event.target.value)} className={inputClass} />
                </Field>
                <Field label="หมวดหมู่">
                    <input value={value.category} onChange={(event) => update("category", event.target.value)} className={inputClass} />
                </Field>
                <Field label="วัสดุ">
                    <input value={value.material} onChange={(event) => update("material", event.target.value)} className={inputClass} />
                </Field>
                <Field label="เวลา Print">
                    <input value={value.printTime} onChange={(event) => update("printTime", event.target.value)} placeholder="เช่น 2 ชั่วโมง" className={inputClass} />
                </Field>
                <Field label="ราคา" required>
                    <input required min="0" type="number" value={value.price} onChange={(event) => update("price", Number(event.target.value))} className={inputClass} />
                </Field>
                <Field label="น้ำหนัก">
                    <input min="0" type="number" step="0.01" value={value.weight} onChange={(event) => update("weight", Number(event.target.value))} className={inputClass} />
                </Field>
                <Field label="Preview image URL">
                    <input type="url" value={value.previewImage} onChange={(event) => update("previewImage", event.target.value)} className={inputClass} />
                </Field>
                <Field label="Model file URL">
                    <input type="url" value={value.modelFile} onChange={(event) => update("modelFile", event.target.value)} className={inputClass} />
                </Field>
            </div>

            <Field label="รายละเอียด">
                <textarea value={value.description} onChange={(event) => update("description", event.target.value)} rows={5} className={`${inputClass} h-auto py-3`} />
            </Field>

            <Field label="สถานะ">
                <select value={value.status} onChange={(event) => update("status", event.target.value as ThreeDProductStatus)} className={inputClass}>
                    <option value="active">เปิดใช้งาน</option>
                    <option value="inactive">ปิดใช้งาน</option>
                </select>
            </Field>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                <button type="submit" disabled={saving} className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50">
                    {saving ? "กำลังบันทึก..." : submitLabel}
                </button>
                <Link href="/admin/3d-printing/products" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                    ยกเลิก
                </Link>
            </div>
        </form>
    );
}

function Field({
    label,
    required,
    children,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
}) {
    return (
        <label className="block space-y-2 text-sm font-semibold text-slate-700">
            <span>{label}{required ? " *" : ""}</span>
            {children}
        </label>
    );
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-pink-400";
