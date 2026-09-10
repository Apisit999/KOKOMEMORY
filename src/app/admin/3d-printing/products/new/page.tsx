"use client";

import { useRouter } from "next/navigation";
import ProductForm, { type ThreeDProductInput } from "../ProductForm";
import { createThreeDProduct } from "@/services/threeDProducts";

export default function NewThreeDProductPage() {
    const router = useRouter();

    async function handleCreate(value: ThreeDProductInput) {
        await createThreeDProduct(value);
        router.push("/admin/3d-printing/products");
    }

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500">
                    3D PRINTING
                </p>
                <h1 className="mt-2 text-3xl font-black text-slate-900">
                    เพิ่ม Product
                </h1>
                <p className="mt-1 text-sm text-slate-500">
                    บันทึกข้อมูลลง collection 3dProducts
                </p>
            </header>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <ProductForm submitLabel="บันทึก Product" onSubmit={handleCreate} />
            </section>
        </main>
    );
}
