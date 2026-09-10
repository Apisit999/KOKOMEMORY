import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDocs,
    serverTimestamp,
    updateDoc,
} from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

export type ThreeDProductStatus =
    | "active"
    | "inactive";

export type ThreeDProduct = {
    id: string;
    name: string;
    description: string;
    category: string;
    material: string;
    price: number;
    weight: number;
    printTime: string;
    previewImage: string;
    modelFile: string;
    status: ThreeDProductStatus;
    createdAt?: unknown;
    updatedAt?: unknown;
};

const productsCollection = collection(
    db,
    "3dProducts"
);

export async function getThreeDProducts(): Promise<
    ThreeDProduct[]
> {
    const snapshot = await getDocs(
        productsCollection
    );

    return snapshot.docs.map((item) => {
        const data = item.data();

        return {
            id: item.id,
            name:
                typeof data.name === "string"
                    ? data.name
                    : "",
            description:
                typeof data.description === "string"
                    ? data.description
                    : "",
            category:
                typeof data.category === "string"
                    ? data.category
                    : "",
            material:
                typeof data.material === "string"
                    ? data.material
                    : "",
            price:
                typeof data.price === "number"
                    ? data.price
                    : Number(data.price ?? 0),
            weight:
                typeof data.weight === "number"
                    ? data.weight
                    : Number(data.weight ?? 0),
            printTime:
                typeof data.printTime === "string"
                    ? data.printTime
                    : "",
            previewImage:
                typeof data.previewImage === "string"
                    ? data.previewImage
                    : "",
            modelFile:
                typeof data.modelFile === "string"
                    ? data.modelFile
                    : "",
            status:
                data.status === "inactive"
                    ? "inactive"
                    : "active",
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    });
}

export async function createThreeDProduct(
    data: Omit<
        ThreeDProduct,
        "id" | "createdAt" | "updatedAt"
    >
): Promise<string> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error(
            "ไม่พบผู้ใช้ที่เข้าสู่ระบบ Firebase"
        );
    }

    const productRef = await addDoc(
        productsCollection,
        {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        }
    );

    return productRef.id;
}

export async function updateThreeDProduct(
    id: string,
    data: Partial<
        Omit<
            ThreeDProduct,
            "id" | "createdAt" | "updatedAt"
        >
    >
): Promise<void> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error(
            "ไม่พบผู้ใช้ที่เข้าสู่ระบบ Firebase"
        );
    }

    const productRef = doc(
        db,
        "3dProducts",
        id
    );

    await updateDoc(productRef, {
        ...data,
        updatedAt: serverTimestamp(),
    });
}

export async function deleteThreeDProduct(
    id: string
): Promise<void> {
    const currentUser = auth.currentUser;

    if (!currentUser) {
        throw new Error(
            "ไม่พบผู้ใช้ที่เข้าสู่ระบบ Firebase"
        );
    }

    const productRef = doc(
        db,
        "3dProducts",
        id
    );

    await deleteDoc(productRef);
}
