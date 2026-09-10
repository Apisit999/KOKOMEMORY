export type ThreeDProductStatus = "active" | "inactive";

export type ThreeDProductImage = {
    id?: string;
    url: string;
    key?: string;
    name?: string;
    alt?: string;
    width?: number;
    height?: number;
    order: number;
};

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
    images: ThreeDProductImage[];
    modelFile: string;
    modelFileKey?: string;
    status: ThreeDProductStatus;
    createdAt?: unknown;
    updatedAt?: unknown;
};

export type ThreeDProductInput = Omit<
    ThreeDProduct,
    "id" | "createdAt" | "updatedAt"
>;
