"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import ProductForm, { type ThreeDProductInput } from "../ProductForm";
import {
    getThreeDProducts,
    updateThreeDProduct,
    type ThreeDProduct,
} from "@/services/threeDProducts";

export default function EditThreeDProductPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const [product, setProduct] = useState<ThreeDProduct | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadProduct() {
            try {
                const products = await getThreeDProducts();
                const found = products.find((item) => item.id === params.id);

                if (!active) return;

                if (!found) {
                    setError("ไม่พบ Product นี้");
                } else {
                    setProduct(found);
                }
            } catch (cause) {
                if (active) {
                    setError(
                        cause instanceof Error
                            ? cause.message
                            : "ไม่สามารถโหลด Product ได้"
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        }

        loadProduct();

        return () => {
            active = false;
        };
    }, [params.id]);

    async function handleUpdate(value: ThreeDProductInput) {
        await updateThreeDProduct(params.id, value);
        router.push("/admin/3d-printing/products");
    }

    if (loading) {
        return <div className="p-8 text-center text-slate-500">กำลังโหลด Product...</div>;
    }

    if (!product) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
                {error || "ไม่พบ Product นี้"}
            </div>
        );
    }

    const initialValue: ThreeDProductInput = {
        name: product.name,
        description: product.description,
        category: product.category,
        material: product.material,
        price: product.price,
        weight: product.weight,
        printTime: product.printTime,
        previewImage: product.previewImage,
        modelFile: product.modelFile,
        status: product.status,
    };

    return (
        <main className="mx-auto w-full max-w-4xl space-y-6">
            <header>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500">
                    3D PRINTING
                </p>
                <h1 className="mt-2 text-3xl font-black text-slate-900">
                    แก้ไข Product
                </h1>
                <p className="mt-1 text-sm text-slate-500">{product.name}</p>
            </header>
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
                <ProductForm
                    initialValue={initialValue}
                    submitLabel="บันทึกการแก้ไข"
                    onSubmit={handleUpdate}
                />
            </section>
        </main>
    );
}
