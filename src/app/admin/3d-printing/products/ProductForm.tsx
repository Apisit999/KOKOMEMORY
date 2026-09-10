"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { ImagePlus, Loader2, Star, Trash2, Upload, X } from "lucide-react";

import {
    deleteThreeDFile,
    uploadThreeDFile,
} from "@/services/threeDProducts";
import type {
    ThreeDProduct,
    ThreeDProductImage,
    ThreeDProductStatus,
} from "@/types/threeDProduct";

export type ThreeDProductInput = Omit<ThreeDProduct, "id" | "createdAt" | "updatedAt">;

const emptyProduct: ThreeDProductInput = {
    name: "",
    description: "",
    category: "",
    material: "",
    price: 0,
    weight: 0,
    printTime: "",
    previewImage: "",
    images: [],
    modelFile: "",
    modelFileKey: undefined,
    status: "active",
};

type ProductFormProps = {
    initialValue?: ThreeDProductInput;
    productId?: string;
    submitLabel: string;
    onSubmit: (value: ThreeDProductInput, productId?: string) => Promise<void>;
};

export default function ProductForm({ initialValue = emptyProduct, productId, submitLabel, onSubmit }: ProductFormProps) {
    const router = useRouter();
    const [value, setValue] = useState<ThreeDProductInput>({
        ...emptyProduct,
        ...initialValue,
        images: initialValue.images?.length
            ? initialValue.images
            : initialValue.previewImage
                ? [{ url: initialValue.previewImage, order: 0 }]
                : [],
    });
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const imageInput = useRef<HTMLInputElement>(null);
    const modelInput = useRef<HTMLInputElement>(null);
    const originalKeys = useRef(new Set((initialValue.images || []).map((image) => image.key).filter((key): key is string => Boolean(key))));
    const originalModelKey = useRef(initialValue.modelFileKey);
    const uploadedKeys = useRef(new Set<string>());
    const uploadProductId = useRef(productId || "");

    function ensureUploadProductId() {
        if (!uploadProductId.current) {
            uploadProductId.current = crypto.randomUUID();
        }

        return uploadProductId.current;
    }

    function update<K extends keyof ThreeDProductInput>(key: K, nextValue: ThreeDProductInput[K]) {
        setValue((current) => ({ ...current, [key]: nextValue }));
    }

    async function addImages(files: FileList | null) {
        if (!files?.length) return;
        setUploading(true);
        setError("");
        const batchKeys: string[] = [];
        try {
            const uploaded = [];
            for (const file of Array.from(files)) {
                const image = await uploadThreeDFile(file, "image", ensureUploadProductId());
                uploaded.push(image);
                if (image.key) {
                    batchKeys.push(image.key);
                    uploadedKeys.current.add(image.key);
                }
            }
            setValue((current) => ({
                ...current,
                images: [...current.images, ...uploaded.map((image, index) => {
                    const filename = files[index]?.name || image.name || "product-image";
                    return {
                        ...image,
                        name: image.name || filename,
                        alt: image.alt || value.name.trim() || filename,
                        order: current.images.length + index,
                    };
                })],
            }));
        } catch (cause) {
            await Promise.all(batchKeys.map((key) => deleteThreeDFile(key).catch(() => undefined)));
            batchKeys.forEach((key) => uploadedKeys.current.delete(key));
            setError(cause instanceof Error ? cause.message : "ไม่สามารถอัปโหลดรูปได้");
        } finally {
            setUploading(false);
            if (imageInput.current) imageInput.current.value = "";
        }
    }

    async function removeImage(image: ThreeDProductImage) {
        setValue((current) => ({
            ...current,
            images: current.images.filter((item) => item !== image).map((item, index) => ({ ...item, order: index })),
        }));
        if (image.key && !originalKeys.current.has(image.key)) {
            try { await deleteThreeDFile(image.key); } catch { /* The product update remains authoritative. */ }
        }
    }

    function moveImage(index: number, direction: -1 | 1) {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= value.images.length) return;
        const images = [...value.images];
        [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
        update("images", images.map((image, itemIndex) => ({ ...image, order: itemIndex })));
    }

    async function addModel(file: File | undefined) {
        if (!file) return;
        setUploading(true);
        setError("");
        try {
            const uploaded = await uploadThreeDFile(file, "model", ensureUploadProductId());
            update("modelFile", uploaded.url);
            update("modelFileKey", uploaded.key);
            uploadedKeys.current.add(uploaded.key || "");
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "ไม่สามารถอัปโหลด Model file ได้");
        } finally {
            setUploading(false);
            if (modelInput.current) modelInput.current.value = "";
        }
    }

    async function clearModel() {
        const key = value.modelFileKey;
        update("modelFile", "");
        update("modelFileKey", undefined);
        if (key && !originalModelKey.current) {
            try { await deleteThreeDFile(key); } catch { /* Cleanup is retried by the save lifecycle. */ }
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setSaving(true);
        setError("");
        try {
            await onSubmit({
                ...value,
                name: value.name.trim(),
                category: value.category.trim(),
                description: value.description.trim(),
                material: value.material.trim(),
                printTime: value.printTime.trim(),
                previewImage: value.images[0]?.url || "",
                price: Number(value.price) || 0,
                weight: Number(value.weight) || 0,
            }, uploadProductId.current || undefined);
        } catch (cause) {
            await Promise.all(
                Array.from(uploadedKeys.current)
                    .filter((key) => key && key !== originalModelKey.current && !originalKeys.current.has(key))
                    .map((key) => deleteThreeDFile(key).catch(() => undefined))
            );
            setError(cause instanceof Error ? cause.message : "ไม่สามารถบันทึก Product ได้");
        } finally {
            setSaving(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

            <FormSection eyebrow="PRODUCT INFORMATION" title="ข้อมูลสินค้า">
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="ชื่อสินค้า" required><input required value={value.name} onChange={(event) => update("name", event.target.value)} className={inputClass} /></Field>
                    <Field label="Category" required><input required value={value.category} onChange={(event) => update("category", event.target.value)} className={inputClass} /></Field>
                    <Field label="Material"><input value={value.material} onChange={(event) => update("material", event.target.value)} className={inputClass} /></Field>
                    <Field label="รายละเอียด"><textarea value={value.description} onChange={(event) => update("description", event.target.value)} rows={4} className={`${inputClass} h-auto py-3 md:col-span-2`} /></Field>
                </div>
            </FormSection>

            <FormSection eyebrow="PRODUCTION" title="ราคาและการผลิต">
                <div className="grid gap-5 md:grid-cols-2">
                    <Field label="ราคา" required><input required min="0" type="number" value={value.price} onChange={(event) => update("price", Number(event.target.value))} className={inputClass} /></Field>
                    <Field label="น้ำหนัก (กรัม)"><input min="0" type="number" step="0.01" value={value.weight} onChange={(event) => update("weight", Number(event.target.value))} className={inputClass} /></Field>
                    <Field label="เวลา Print"><input value={value.printTime} onChange={(event) => update("printTime", event.target.value)} placeholder="เช่น 2 ชั่วโมง" className={inputClass} /></Field>
                    <Field label="Status"><select value={value.status} onChange={(event) => update("status", event.target.value as ThreeDProductStatus)} className={inputClass}><option value="active">เปิดใช้งาน</option><option value="inactive">ปิดใช้งาน</option></select></Field>
                </div>
            </FormSection>

            <FormSection eyebrow="PRODUCT IMAGES" title="รูปสินค้า">
                <div
                    className="rounded-2xl border-2 border-dashed border-pink-200 bg-pink-50/50 p-8 text-center transition hover:border-pink-400"
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => { event.preventDefault(); void addImages(event.dataTransfer.files); }}
                >
                    <ImagePlus className="mx-auto text-pink-500" size={32} />
                    <p className="mt-3 font-bold text-slate-800">ลากรูปมาวาง หรือเลือกจากเครื่อง</p>
                    <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP ไม่เกิน 10MB ต่อรูป</p>
                    <button type="button" onClick={() => imageInput.current?.click()} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-pink-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-pink-600"><Upload size={16} />เพิ่มรูปภาพ</button>
                    <input ref={imageInput} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(event) => void addImages(event.target.files)} />
                </div>
                {uploading && <p className="mt-3 flex items-center gap-2 text-sm text-pink-600"><Loader2 size={16} className="animate-spin" />กำลังอัปโหลด...</p>}
                {value.images.length > 0 && <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {value.images.map((image, index) => (
                        <div key={`${image.key || image.url}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="relative aspect-[4/3] bg-slate-100"><img src={image.url} alt={image.alt || image.name || `รูปสินค้า ${index + 1}`} className="h-full w-full object-cover" />{index === 0 && <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-pink-600"><Star size={12} fill="currentColor" />รูปหลัก</span>}</div>
                            <div className="flex items-center justify-between gap-2 p-3"><button type="button" disabled={index === 0} onClick={() => moveImage(index, -1)} className="text-xs font-semibold text-slate-500 disabled:opacity-30">เลื่อนซ้าย</button><button type="button" disabled={index === value.images.length - 1} onClick={() => moveImage(index, 1)} className="text-xs font-semibold text-slate-500 disabled:opacity-30">เลื่อนขวา</button><button type="button" onClick={() => void removeImage(image)} aria-label="ลบรูปภาพ" className="text-red-500 hover:text-red-700"><Trash2 size={16} /></button></div>
                        </div>
                    ))}
                </div>}
            </FormSection>

            <FormSection eyebrow="PRODUCTION FILE" title="Model file (ไม่บังคับ)">
                <div className="flex flex-wrap items-center gap-3"><button type="button" onClick={() => modelInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:border-pink-300"><Upload size={16} />อัปโหลด STL, OBJ, 3MF หรือ ZIP</button><input ref={modelInput} type="file" accept=".stl,.obj,.3mf,.zip" className="hidden" onChange={(event) => void addModel(event.target.files?.[0])} />{value.modelFile && <span className="flex items-center gap-2 text-sm text-slate-500">มีไฟล์ Model แล้ว<button type="button" onClick={() => void clearModel()} aria-label="ลบ Model file"><X size={16} /></button></span>}</div>
            </FormSection>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-5"><button type="submit" disabled={saving || uploading} className="rounded-xl bg-pink-500 px-5 py-3 text-sm font-bold text-white hover:bg-pink-600 disabled:opacity-50">{saving ? "กำลังบันทึก..." : submitLabel}</button><button type="button" disabled={saving || uploading} onClick={async () => { await Promise.all(Array.from(uploadedKeys.current).filter(Boolean).map((key) => deleteThreeDFile(key).catch(() => undefined))); router.push("/admin/3d-printing/products"); }} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">ยกเลิก</button></div>
        </form>
    );
}

function FormSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
    return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><p className="text-[10px] font-black tracking-[0.22em] text-pink-500">{eyebrow}</p><h2 className="mt-2 text-xl font-black text-slate-900">{title}</h2><div className="mt-6">{children}</div></section>;
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
    return <label className="block space-y-2 text-sm font-semibold text-slate-700"><span>{label}{required ? " *" : ""}</span>{children}</label>;
}

const inputClass = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-pink-400 focus:ring-4 focus:ring-pink-50";
