"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    onAuthStateChanged,
    type User,
} from "firebase/auth";
import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Loader2,
    Package,
    Plus,
    Trash2,
    UserRound,
    Wallet,
    X,
} from "lucide-react";

import { auth } from "@/lib/firebase";

import {
    createThreeDOrder,
} from "@/services/threeDOrders";

import type {
    ThreeDOrderInput,
    ThreeDOrderItem,
    ThreeDOrderStatus,
    ThreeDPaymentStatus,
    ThreeDOrderPaymentMethod,
} from "@/types/threeDOrder";

import type {
    ThreeDProduct,
} from "@/types/threeDProduct";

/* =========================================================
   TYPES
========================================================= */

type ProductOption = ThreeDProduct;

type OrderItemDraft = {
    id: string;
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    material: string;
    color: string;
    notes: string;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_STATUS_OPTIONS: {
    value: ThreeDOrderStatus;
    label: string;
}[] = [
    {
        value: "pending_confirmation",
        label: "รอยืนยัน Order",
    },
    {
        value: "waiting_payment",
        label: "รอชำระเงิน",
    },
    {
        value: "queued",
        label: "เข้าคิวผลิต",
    },
    {
        value: "printing",
        label: "กำลังพิมพ์",
    },
    {
        value: "quality_check",
        label: "ตรวจคุณภาพ",
    },
    {
        value: "ready",
        label: "พร้อมรับ",
    },
    {
        value: "shipping",
        label: "กำลังจัดส่ง",
    },
];

const PAYMENT_STATUS_OPTIONS: {
    value: ThreeDPaymentStatus;
    label: string;
}[] = [
    {
        value: "unpaid",
        label: "ยังไม่ชำระ",
    },
    {
        value: "pending_verification",
        label: "รอตรวจสอบ",
    },
    {
        value: "partial",
        label: "ชำระบางส่วน",
    },
    {
        value: "paid",
        label: "ชำระครบแล้ว",
    },
];

const PAYMENT_METHOD_OPTIONS: {
    value: ThreeDOrderPaymentMethod;
    label: string;
}[] = [
    {
        value: "bank_transfer",
        label: "โอนธนาคาร",
    },
    {
        value: "promptpay",
        label: "PromptPay",
    },
    {
        value: "cash",
        label: "เงินสด",
    },
    {
        value: "other",
        label: "อื่น ๆ",
    },
];

/* =========================================================
   HELPERS
========================================================= */

function waitForAuthUser(): Promise<User | null> {
    if (auth.currentUser) {
        return Promise.resolve(auth.currentUser);
    }

    return new Promise((resolve) => {
        const unsubscribe =
            onAuthStateChanged(
                auth,
                (user) => {
                    unsubscribe();
                    resolve(user);
                }
            );
    });
}

function formatCurrency(value: number) {
    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function createItemId() {
    return `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 9)}`;
}

function normalizeProduct(
    value: unknown
): ProductOption {
    const product =
        value as Partial<ThreeDProduct>;

    return {
        ...(product as ThreeDProduct),
        id: String(product.id || ""),
        name: String(product.name || ""),
        description: String(
            product.description || ""
        ),
        category: String(
            product.category || ""
        ),
        material: String(
            product.material || ""
        ),
        price: Number(product.price) || 0,
        weight: Number(product.weight) || 0,
        printTime: String(
            product.printTime || ""
        ),
        previewImage: String(
            product.previewImage || ""
        ),
        images: Array.isArray(product.images)
            ? product.images
            : [],
        modelFile: String(
            product.modelFile || ""
        ),
        modelFileKey:
            typeof product.modelFileKey ===
            "string"
                ? product.modelFileKey
                : undefined,
        status:
            product.status === "inactive"
                ? "inactive"
                : "active",
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
    };
}

function createItemFromProduct(
    product: ProductOption
): OrderItemDraft {
    return {
        id: createItemId(),
        productId: product.id,
        productName: product.name,
        quantity: 1,
        unitPrice:
            Number(product.price) || 0,
        material: product.material || "",
        color: "",
        notes: "",
    };
}

function getPaymentStatus(
    paidAmount: number,
    totalPrice: number
): ThreeDPaymentStatus {
    if (paidAmount <= 0) {
        return "unpaid";
    }

    if (paidAmount >= totalPrice) {
        return "paid";
    }

    return "partial";
}

/* =========================================================
   INPUT COMPONENTS
========================================================= */

function FieldLabel({
    children,
    required = false,
}: {
    children: React.ReactNode;
    required?: boolean;
}) {
    return (
        <label className="mb-1.5 block text-xs font-bold text-slate-700 sm:text-sm">
            {children}

            {required && (
                <span className="ml-1 text-pink-500">
                    *
                </span>
            )}
        </label>
    );
}

function TextInput({
    value,
    onChange,
    placeholder,
    type = "text",
    required = false,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
}) {
    return (
        <input
            type={type}
            value={value}
            required={required}
            onChange={(event) =>
                onChange(event.target.value)
            }
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 sm:h-12"
        />
    );
}

function SelectInput({
    value,
    onChange,
    children,
}: {
    value: string;
    onChange: (value: string) => void;
    children: React.ReactNode;
}) {
    return (
        <div className="relative">
            <select
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3.5 pr-10 text-sm text-slate-900 outline-none transition focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10 sm:h-12"
            >
                {children}
            </select>

            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
    );
}

function Textarea({
    value,
    onChange,
    placeholder,
    rows = 4,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    rows?: number;
}) {
    return (
        <textarea
            value={value}
            onChange={(event) =>
                onChange(event.target.value)
            }
            placeholder={placeholder}
            rows={rows}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 focus:border-pink-400 focus:ring-4 focus:ring-pink-500/10"
        />
    );
}

/* =========================================================
   SECTION CARD
========================================================= */

function SectionCard({
    icon: Icon,
    eyebrow,
    title,
    children,
}: {
    icon: typeof UserRound;
    eyebrow: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm sm:rounded-3xl">
            <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-pink-500 sm:h-10 sm:w-10">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>

                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-xs">
                            {eyebrow}
                        </p>

                        <h2 className="mt-0.5 text-base font-black text-slate-950 sm:text-lg">
                            {title}
                        </h2>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6">
                {children}
            </div>
        </section>
    );
}

/* =========================================================
   PAGE
========================================================= */

export default function NewThreeDOrderPage() {
    const router = useRouter();

    const [products, setProducts] =
        useState<ProductOption[]>([]);

    const [loadingProducts, setLoadingProducts] =
        useState(true);

    const [productError, setProductError] =
        useState("");

    const [customerName, setCustomerName] =
        useState("");

    const [phone, setPhone] =
        useState("");

    const [email, setEmail] =
        useState("");

    const [line, setLine] =
        useState("");

    const [items, setItems] =
        useState<OrderItemDraft[]>([]);

    const [discount, setDiscount] =
        useState("0");

    const [shippingFee, setShippingFee] =
        useState("0");

    const [paidAmount, setPaidAmount] =
        useState("0");

    const [paymentMethod, setPaymentMethod] =
        useState<
            ThreeDOrderPaymentMethod | ""
        >("");

    const [orderStatus, setOrderStatus] =
        useState<ThreeDOrderStatus>(
            "pending_confirmation"
        );

    const [
        paymentStatusOverride,
        setPaymentStatusOverride,
    ] = useState<
        ThreeDPaymentStatus | ""
    >("");

    const [dueDate, setDueDate] =
        useState("");

    const [productionNote, setProductionNote] =
        useState("");

    const [customerNote, setCustomerNote] =
        useState("");

    const [shippingAddress, setShippingAddress] =
        useState("");

    const [shippingDistrict, setShippingDistrict] =
        useState("");

    const [shippingProvince, setShippingProvince] =
        useState("");

    const [shippingPostcode, setShippingPostcode] =
        useState("");

    const [saving, setSaving] =
        useState(false);

    const [error, setError] =
        useState("");

    /* =====================================================
       LOAD PRODUCTS
       IMPORTANT:
       Wait for Firebase Auth before requesting Admin API.
    ===================================================== */

    useEffect(() => {
        let cancelled = false;

        async function loadProducts() {
            try {
                setLoadingProducts(true);
                setProductError("");

                const currentUser =
                    await waitForAuthUser();

                if (!currentUser) {
                    throw new Error(
                        "กรุณาเข้าสู่ระบบ Admin ก่อนใช้งาน"
                    );
                }

                const token =
                    await currentUser.getIdToken();

                const response =
                    await fetch(
                        "/api/admin/3d-printing/products",
                        {
                            method: "GET",
                            headers: {
                                Authorization:
                                    `Bearer ${token}`,
                            },
                            cache: "no-store",
                        }
                    );

                const data =
                    (await response.json()) as {
                        products?: unknown[];
                        error?: string;
                    };

                if (!response.ok) {
                    throw new Error(
                        data.error ||
                            "ไม่สามารถโหลด Product ได้"
                    );
                }

                if (cancelled) {
                    return;
                }

                const normalized =
                    Array.isArray(
                        data.products
                    )
                        ? data.products
                              .map(
                                  normalizeProduct
                              )
                              .filter(
                                  (product) =>
                                      product.id &&
                                      product.status ===
                                          "active"
                              )
                        : [];

                setProducts(normalized);
            } catch (loadError) {
                console.error(
                    "Load 3D products error:",
                    loadError
                );

                if (!cancelled) {
                    setProductError(
                        loadError instanceof
                            Error
                            ? loadError.message
                            : "ไม่สามารถโหลด Product ได้"
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoadingProducts(false);
                }
            }
        }

        void loadProducts();

        return () => {
            cancelled = true;
        };
    }, []);

    /* =====================================================
       CALCULATIONS
    ===================================================== */

    const subtotal = useMemo(
        () =>
            items.reduce(
                (total, item) =>
                    total +
                    item.quantity *
                        item.unitPrice,
                0
            ),
        [items]
    );

    const discountValue = useMemo(
        () =>
            Math.max(
                0,
                Number(discount) || 0
            ),
        [discount]
    );

    const shippingValue = useMemo(
        () =>
            Math.max(
                0,
                Number(shippingFee) || 0
            ),
        [shippingFee]
    );

    const totalPrice = useMemo(
        () =>
            Math.max(
                0,
                subtotal -
                    discountValue +
                    shippingValue
            ),
        [
            subtotal,
            discountValue,
            shippingValue,
        ]
    );

    const paidValue = useMemo(
        () =>
            Math.min(
                Math.max(
                    0,
                    Number(paidAmount) || 0
                ),
                totalPrice
            ),
        [paidAmount, totalPrice]
    );

    const remainingAmount =
        Math.max(
            0,
            totalPrice - paidValue
        );

    const calculatedPaymentStatus =
        getPaymentStatus(
            paidValue,
            totalPrice
        );

    /* =====================================================
       PRODUCT ACTIONS
    ===================================================== */

    function addProduct(
        productId: string
    ) {
        if (!productId) {
            return;
        }

        const product =
            products.find(
                (item) =>
                    item.id === productId
            );

        if (!product) {
            return;
        }

        setItems((currentItems) => [
            ...currentItems,
            createItemFromProduct(product),
        ]);
    }

    function removeItem(
        itemId: string
    ) {
        setItems((currentItems) =>
            currentItems.filter(
                (item) =>
                    item.id !== itemId
            )
        );
    }

    function updateItem(
        itemId: string,
        changes: Partial<OrderItemDraft>
    ) {
        setItems((currentItems) =>
            currentItems.map((item) =>
                item.id === itemId
                    ? {
                          ...item,
                          ...changes,
                      }
                    : item
            )
        );
    }

    /* =====================================================
       SUBMIT
    ===================================================== */

    async function handleSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        setError("");

        const trimmedName =
            customerName.trim();

        const trimmedPhone =
            phone.trim();

        if (!trimmedName) {
            setError(
                "กรุณากรอกชื่อลูกค้า"
            );
            return;
        }

        if (!trimmedPhone) {
            setError(
                "กรุณากรอกเบอร์โทรลูกค้า"
            );
            return;
        }

        if (items.length === 0) {
            setError(
                "กรุณาเพิ่ม Product อย่างน้อย 1 รายการ"
            );
            return;
        }

        const invalidItem =
            items.find(
                (item) =>
                    !item.productId ||
                    item.quantity < 1
            );

        if (invalidItem) {
            setError(
                "กรุณาตรวจสอบรายการสินค้าและจำนวน"
            );
            return;
        }

        try {
            setSaving(true);

            const orderItems: ThreeDOrderItem[] =
                items.map((item) => {
                    const quantity =
                        Math.max(
                            1,
                            Math.floor(
                                Number(
                                    item.quantity
                                ) || 1
                            )
                        );

                    const unitPrice =
                        Math.max(
                            0,
                            Number(
                                item.unitPrice
                            ) || 0
                        );

                    return {
                        productId:
                            item.productId,
                        productName:
                            item.productName,
                        quantity,
                        unitPrice,
                        totalPrice:
                            quantity *
                            unitPrice,

                        ...(item.material.trim()
                            ? {
                                  material:
                                      item.material.trim(),
                              }
                            : {}),

                        ...(item.color.trim()
                            ? {
                                  color:
                                      item.color.trim(),
                              }
                            : {}),

                        ...(item.notes.trim()
                            ? {
                                  notes:
                                      item.notes.trim(),
                              }
                            : {}),
                    };
                });

            const finalPaymentStatus =
                paymentStatusOverride ||
                calculatedPaymentStatus;

            const input: ThreeDOrderInput = {
                orderNumber: "",

                customer: {
                    name: trimmedName,
                    phone: trimmedPhone,

                    ...(email.trim()
                        ? {
                              email:
                                  email.trim(),
                          }
                        : {}),

                    ...(line.trim()
                        ? {
                              line:
                                  line.trim(),
                          }
                        : {}),
                },

                items: orderItems,

                subtotal,

                discount:
                    discountValue,

                shippingFee:
                    shippingValue,

                totalPrice,

                paidAmount:
                    paidValue,

                remainingAmount,

                orderStatus,

                paymentStatus:
                    finalPaymentStatus,

                ...(paymentMethod
                    ? {
                          paymentMethod,
                      }
                    : {}),

                ...(productionNote.trim()
                    ? {
                          productionNote:
                              productionNote.trim(),
                      }
                    : {}),

                ...(customerNote.trim()
                    ? {
                          customerNote:
                              customerNote.trim(),
                      }
                    : {}),

                ...(dueDate
                    ? {
                          dueDate,
                      }
                    : {}),

                ...(shippingAddress.trim() ||
                shippingDistrict.trim() ||
                shippingProvince.trim() ||
                shippingPostcode.trim()
                    ? {
                          shippingAddress: {
                              ...(shippingAddress.trim()
                                  ? {
                                        address:
                                            shippingAddress.trim(),
                                    }
                                  : {}),

                              ...(shippingDistrict.trim()
                                  ? {
                                        district:
                                            shippingDistrict.trim(),
                                    }
                                  : {}),

                              ...(shippingProvince.trim()
                                  ? {
                                        province:
                                            shippingProvince.trim(),
                                    }
                                  : {}),

                              ...(shippingPostcode.trim()
                                  ? {
                                        postcode:
                                            shippingPostcode.trim(),
                                    }
                                  : {}),
                          },
                      }
                    : {}),
            };

            const createdOrder =
                await createThreeDOrder(
                    input
                );

            router.push(
                `/admin/3d-printing/orders/${encodeURIComponent(
                    createdOrder.id
                )}`
            );
        } catch (submitError) {
            console.error(
                "Create 3D order error:",
                submitError
            );

            setError(
                submitError instanceof Error
                    ? submitError.message
                    : "ไม่สามารถสร้าง Order ได้"
            );
        } finally {
            setSaving(false);
        }
    }

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <main className="min-h-full bg-[#f8f9fc]">
            <div className="mx-auto w-full max-w-[1440px] px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">

                {/* HEADER */}

                <header className="mb-5 sm:mb-7">
                    <Link
                        href="/admin/3d-printing/orders"
                        className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-slate-500 transition hover:text-pink-500 sm:text-sm"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        กลับไป Orders
                    </Link>

                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-pink-500 sm:text-xs">
                                3D Printing · Orders
                            </p>

                            <h1 className="mt-1.5 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl lg:text-4xl">
                                สร้าง 3D Order
                            </h1>

                            <p className="mt-1.5 max-w-2xl text-xs leading-5 text-slate-500 sm:text-sm sm:leading-6">
                                สร้างคำสั่งซื้อใหม่จาก Product
                                ที่มีอยู่ในระบบ
                                พร้อมคำนวณยอดเงินอัตโนมัติ
                            </p>
                        </div>

                        <div className="hidden rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm sm:block">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Order ใหม่
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-700">
                                เลข Order
                                จะถูกสร้างอัตโนมัติ
                            </p>
                        </div>
                    </div>
                </header>

                {/* ERROR */}

                {error && (
                    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700 sm:mb-6">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                            <X className="h-4 w-4" />
                        </div>

                        <div className="min-w-0">
                            <p className="font-bold">
                                ไม่สามารถสร้าง Order ได้
                            </p>

                            <p className="mt-0.5 text-xs leading-5">
                                {error}
                            </p>
                        </div>
                    </div>
                )}

                <form
                    onSubmit={
                        handleSubmit
                    }
                >
                    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] lg:gap-6">

                        {/* LEFT */}

                        <div className="space-y-5 sm:space-y-6">

                            {/* CUSTOMER */}

                            <SectionCard
                                icon={UserRound}
                                eyebrow="Customer"
                                title="ข้อมูลลูกค้า"
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <FieldLabel required>
                                            ชื่อลูกค้า
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                customerName
                                            }
                                            onChange={
                                                setCustomerName
                                            }
                                            placeholder="เช่น คุณสมชาย"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel required>
                                            เบอร์โทร
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                phone
                                            }
                                            onChange={
                                                setPhone
                                            }
                                            type="tel"
                                            placeholder="08xxxxxxxx"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            Email
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                email
                                            }
                                            onChange={
                                                setEmail
                                            }
                                            type="email"
                                            placeholder="customer@email.com"
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            LINE
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                line
                                            }
                                            onChange={
                                                setLine
                                            }
                                            placeholder="@lineid"
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* PRODUCTS */}

                            <SectionCard
                                icon={Package}
                                eyebrow="Products"
                                title="รายการสินค้า"
                            >
                                <div className="space-y-4">

                                    {loadingProducts ? (
                                        <div className="flex min-h-32 items-center justify-center rounded-2xl bg-slate-50">
                                            <div className="text-center">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin text-pink-500" />

                                                <p className="mt-2 text-xs text-slate-400">
                                                    กำลังโหลด Product...
                                                </p>
                                            </div>
                                        </div>
                                    ) : productError ? (
                                        <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
                                            <p className="text-sm font-bold text-red-700">
                                                ไม่สามารถโหลด Product
                                            </p>

                                            <p className="mt-1 text-xs leading-5 text-red-600">
                                                {productError}
                                            </p>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    window.location.reload()
                                                }
                                                className="mt-3 rounded-lg bg-white px-3 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-100"
                                            >
                                                ลองใหม่
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-2 sm:flex-row">
                                            <div className="min-w-0 flex-1">
                                                <SelectInput
                                                    value=""
                                                    onChange={
                                                        addProduct
                                                    }
                                                >
                                                    <option value="">
                                                        + เลือก Product เพื่อเพิ่ม
                                                    </option>

                                                    {products.map(
                                                        (
                                                            product
                                                        ) => (
                                                            <option
                                                                key={
                                                                    product.id
                                                                }
                                                                value={
                                                                    product.id
                                                                }
                                                            >
                                                                {
                                                                    product.name
                                                                }{" "}
                                                                ·{" "}
                                                                {formatCurrency(
                                                                    product.price
                                                                )}
                                                            </option>
                                                        )
                                                    )}
                                                </SelectInput>
                                            </div>

                                            <Link
                                                href="/admin/3d-printing/products/new"
                                                className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-pink-200 hover:text-pink-500 sm:h-12 sm:text-sm"
                                            >
                                                <Plus className="h-4 w-4" />
                                                เพิ่ม Product
                                            </Link>
                                        </div>
                                    )}

                                    {!loadingProducts &&
                                        !productError &&
                                        products.length ===
                                            0 && (
                                            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                                                <p className="text-sm font-bold text-amber-800">
                                                    ยังไม่มี Product ที่เปิดใช้งาน
                                                </p>

                                                <p className="mt-1 text-xs leading-5 text-amber-700">
                                                    กรุณาสร้าง Product
                                                    หรือเปิดสถานะ Product
                                                    ก่อนสร้าง Order
                                                </p>

                                                <Link
                                                    href="/admin/3d-printing/products/new"
                                                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-amber-700 shadow-sm"
                                                >
                                                    <Plus className="h-3.5 w-3.5" />
                                                    สร้าง Product
                                                </Link>
                                            </div>
                                        )}

                                    {items.length === 0 ? (
                                        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-5 py-10 text-center">
                                            <Package className="mx-auto h-8 w-8 text-slate-300" />

                                            <p className="mt-3 text-sm font-bold text-slate-600">
                                                ยังไม่มีสินค้าใน Order
                                            </p>

                                            <p className="mt-1 text-xs text-slate-400">
                                                เลือก Product
                                                ด้านบนเพื่อเริ่มเพิ่มสินค้า
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {items.map(
                                                (
                                                    item,
                                                    index
                                                ) => (
                                                    <div
                                                        key={
                                                            item.id
                                                        }
                                                        className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 sm:p-4"
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-xs font-black text-slate-500 shadow-sm">
                                                                {index +
                                                                    1}
                                                            </div>

                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-start justify-between gap-3">
                                                                    <div className="min-w-0">
                                                                        <p className="truncate text-sm font-black text-slate-900">
                                                                            {
                                                                                item.productName
                                                                            }
                                                                        </p>

                                                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                                                            ราคา Product{" "}
                                                                            {formatCurrency(
                                                                                item.unitPrice
                                                                            )}
                                                                        </p>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            removeItem(
                                                                                item.id
                                                                            )
                                                                        }
                                                                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                                                                        aria-label="ลบสินค้า"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>

                                                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                                                    <div>
                                                                        <FieldLabel>
                                                                            จำนวน
                                                                        </FieldLabel>

                                                                        <TextInput
                                                                            value={String(
                                                                                item.quantity
                                                                            )}
                                                                            type="number"
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                updateItem(
                                                                                    item.id,
                                                                                    {
                                                                                        quantity:
                                                                                            Math.max(
                                                                                                1,
                                                                                                Math.floor(
                                                                                                    Number(
                                                                                                        value
                                                                                                    ) ||
                                                                                                        1
                                                                                                )
                                                                                            ),
                                                                                    }
                                                                                )
                                                                            }
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <FieldLabel>
                                                                            Material
                                                                        </FieldLabel>

                                                                        <TextInput
                                                                            value={
                                                                                item.material
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                updateItem(
                                                                                    item.id,
                                                                                    {
                                                                                        material:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                            placeholder="PLA"
                                                                        />
                                                                    </div>

                                                                    <div>
                                                                        <FieldLabel>
                                                                            สี
                                                                        </FieldLabel>

                                                                        <TextInput
                                                                            value={
                                                                                item.color
                                                                            }
                                                                            onChange={(
                                                                                value
                                                                            ) =>
                                                                                updateItem(
                                                                                    item.id,
                                                                                    {
                                                                                        color:
                                                                                            value,
                                                                                    }
                                                                                )
                                                                            }
                                                                            placeholder="White"
                                                                        />
                                                                    </div>
                                                                </div>

                                                                <div className="mt-3">
                                                                    <FieldLabel>
                                                                        หมายเหตุสินค้า
                                                                    </FieldLabel>

                                                                    <TextInput
                                                                        value={
                                                                            item.notes
                                                                        }
                                                                        onChange={(
                                                                            value
                                                                        ) =>
                                                                            updateItem(
                                                                                item.id,
                                                                                {
                                                                                    notes:
                                                                                        value,
                                                                                }
                                                                            )
                                                                        }
                                                                        placeholder="รายละเอียดเพิ่มเติมของชิ้นนี้"
                                                                    />
                                                                </div>

                                                                <div className="mt-3 flex items-center justify-between border-t border-slate-200/70 pt-3">
                                                                    <span className="text-xs text-slate-400">
                                                                        รวมรายการ
                                                                    </span>

                                                                    <span className="text-sm font-black text-slate-950">
                                                                        {formatCurrency(
                                                                            item.quantity *
                                                                                item.unitPrice
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </SectionCard>

                            {/* SHIPPING */}

                            <SectionCard
                                icon={Package}
                                eyebrow="Shipping"
                                title="ที่อยู่จัดส่ง"
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="sm:col-span-2">
                                        <FieldLabel>
                                            ที่อยู่
                                        </FieldLabel>

                                        <Textarea
                                            value={
                                                shippingAddress
                                            }
                                            onChange={
                                                setShippingAddress
                                            }
                                            placeholder="บ้านเลขที่ / ถนน / หมู่บ้าน"
                                            rows={3}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            อำเภอ / เขต
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                shippingDistrict
                                            }
                                            onChange={
                                                setShippingDistrict
                                            }
                                            placeholder="อำเภอ / เขต"
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            จังหวัด
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                shippingProvince
                                            }
                                            onChange={
                                                setShippingProvince
                                            }
                                            placeholder="จังหวัด"
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            รหัสไปรษณีย์
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                shippingPostcode
                                            }
                                            onChange={
                                                setShippingPostcode
                                            }
                                            type="text"
                                            placeholder="10xxx"
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* NOTES */}

                            <SectionCard
                                icon={
                                    CheckCircle2
                                }
                                eyebrow="Notes"
                                title="รายละเอียดเพิ่มเติม"
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <FieldLabel>
                                            หมายเหตุสำหรับลูกค้า
                                        </FieldLabel>

                                        <Textarea
                                            value={
                                                customerNote
                                            }
                                            onChange={
                                                setCustomerNote
                                            }
                                            placeholder="ข้อมูลที่ต้องการให้ลูกค้าทราบ"
                                            rows={5}
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            หมายเหตุการผลิต
                                        </FieldLabel>

                                        <Textarea
                                            value={
                                                productionNote
                                            }
                                            onChange={
                                                setProductionNote
                                            }
                                            placeholder="รายละเอียดสำหรับทีมผลิต"
                                            rows={5}
                                        />
                                    </div>
                                </div>
                            </SectionCard>
                        </div>

                        {/* RIGHT */}

                        <aside className="space-y-5 lg:sticky lg:top-5">

                            {/* SUMMARY */}

                            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 text-white shadow-xl sm:rounded-3xl">
                                <div className="p-5 sm:p-6">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                                            <Wallet className="h-5 w-5 text-pink-300" />
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-pink-300">
                                                Order Summary
                                            </p>

                                            <h2 className="mt-0.5 text-lg font-black">
                                                สรุปยอด
                                            </h2>
                                        </div>
                                    </div>

                                    <div className="mt-6 space-y-3">
                                        <div className="flex items-center justify-between gap-4 text-sm">
                                            <span className="text-slate-400">
                                                Subtotal
                                            </span>

                                            <span className="font-semibold">
                                                {formatCurrency(
                                                    subtotal
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 text-sm">
                                            <span className="text-slate-400">
                                                ส่วนลด
                                            </span>

                                            <span className="font-semibold text-pink-300">
                                                -{" "}
                                                {formatCurrency(
                                                    discountValue
                                                )}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-4 text-sm">
                                            <span className="text-slate-400">
                                                ค่าจัดส่ง
                                            </span>

                                            <span className="font-semibold">
                                                {formatCurrency(
                                                    shippingValue
                                                )}
                                            </span>
                                        </div>

                                        <div className="border-t border-white/10 pt-4">
                                            <div className="flex items-end justify-between gap-4">
                                                <span className="text-sm font-semibold text-slate-300">
                                                    ยอดรวม
                                                </span>

                                                <span className="text-2xl font-black sm:text-3xl">
                                                    {formatCurrency(
                                                        totalPrice
                                                    )}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="rounded-2xl bg-white/5 p-4">
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-xs text-slate-400">
                                                    ชำระแล้ว
                                                </span>

                                                <span className="text-sm font-bold text-emerald-300">
                                                    {formatCurrency(
                                                        paidValue
                                                    )}
                                                </span>
                                            </div>

                                            <div className="mt-2 flex items-center justify-between gap-4">
                                                <span className="text-xs text-slate-400">
                                                    ค้างชำระ
                                                </span>

                                                <span className="text-sm font-black text-orange-300">
                                                    {formatCurrency(
                                                        remainingAmount
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* PAYMENT */}

                            <SectionCard
                                icon={Wallet}
                                eyebrow="Payment"
                                title="การชำระเงิน"
                            >
                                <div className="space-y-4">
                                    <div>
                                        <FieldLabel>
                                            เงินที่ชำระแล้ว
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                paidAmount
                                            }
                                            onChange={
                                                setPaidAmount
                                            }
                                            type="number"
                                            placeholder="0"
                                        />

                                        <p className="mt-1.5 text-[11px] text-slate-400">
                                            ระบบจะไม่ให้ยอดชำระเกินยอด Order
                                        </p>
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            วิธีชำระเงิน
                                        </FieldLabel>

                                        <SelectInput
                                            value={
                                                paymentMethod
                                            }
                                            onChange={(
                                                value
                                            ) =>
                                                setPaymentMethod(
                                                    value as ThreeDOrderPaymentMethod
                                                )
                                            }
                                        >
                                            <option value="">
                                                ยังไม่ได้ระบุ
                                            </option>

                                            {PAYMENT_METHOD_OPTIONS.map(
                                                (
                                                    option
                                                ) => (
                                                    <option
                                                        key={
                                                            option.value
                                                        }
                                                        value={
                                                            option.value
                                                        }
                                                    >
                                                        {
                                                            option.label
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </SelectInput>
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            สถานะการชำระเงิน
                                        </FieldLabel>

                                        <SelectInput
                                            value={
                                                paymentStatusOverride ||
                                                calculatedPaymentStatus
                                            }
                                            onChange={(
                                                value
                                            ) =>
                                                setPaymentStatusOverride(
                                                    value as ThreeDPaymentStatus
                                                )
                                            }
                                        >
                                            {PAYMENT_STATUS_OPTIONS.map(
                                                (
                                                    option
                                                ) => (
                                                    <option
                                                        key={
                                                            option.value
                                                        }
                                                        value={
                                                            option.value
                                                        }
                                                    >
                                                        {
                                                            option.label
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </SelectInput>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                setPaymentStatusOverride(
                                                    ""
                                                )
                                            }
                                            className="mt-2 text-[11px] font-semibold text-slate-400 hover:text-pink-500"
                                        >
                                            ใช้สถานะอัตโนมัติ
                                        </button>
                                    </div>
                                </div>
                            </SectionCard>

                            {/* ORDER STATUS */}

                            <SectionCard
                                icon={
                                    CheckCircle2
                                }
                                eyebrow="Order"
                                title="สถานะ Order"
                            >
                                <div className="space-y-4">
                                    <div>
                                        <FieldLabel>
                                            สถานะการผลิต
                                        </FieldLabel>

                                        <SelectInput
                                            value={
                                                orderStatus
                                            }
                                            onChange={(
                                                value
                                            ) =>
                                                setOrderStatus(
                                                    value as ThreeDOrderStatus
                                                )
                                            }
                                        >
                                            {ORDER_STATUS_OPTIONS.map(
                                                (
                                                    option
                                                ) => (
                                                    <option
                                                        key={
                                                            option.value
                                                        }
                                                        value={
                                                            option.value
                                                        }
                                                    >
                                                        {
                                                            option.label
                                                        }
                                                    </option>
                                                )
                                            )}
                                        </SelectInput>
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            กำหนดส่ง / Due Date
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                dueDate
                                            }
                                            onChange={
                                                setDueDate
                                            }
                                            type="date"
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* PRICE */}

                            <SectionCard
                                icon={Wallet}
                                eyebrow="Pricing"
                                title="ปรับยอด"
                            >
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
                                    <div>
                                        <FieldLabel>
                                            ส่วนลด
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                discount
                                            }
                                            onChange={
                                                setDiscount
                                            }
                                            type="number"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <FieldLabel>
                                            ค่าจัดส่ง
                                        </FieldLabel>

                                        <TextInput
                                            value={
                                                shippingFee
                                            }
                                            onChange={
                                                setShippingFee
                                            }
                                            type="number"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </SectionCard>

                            {/* SUBMIT */}

                            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-5">
                                <div className="mb-4 rounded-2xl bg-slate-50 p-4">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs text-slate-500">
                                            ยอดที่ต้องชำระ
                                        </span>

                                        <span className="text-lg font-black text-slate-950">
                                            {formatCurrency(
                                                totalPrice
                                            )}
                                        </span>
                                    </div>

                                    <div className="mt-2 flex items-center justify-between gap-4">
                                        <span className="text-xs text-slate-500">
                                            คงเหลือ
                                        </span>

                                        <span className="text-sm font-black text-orange-500">
                                            {formatCurrency(
                                                remainingAmount
                                            )}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={
                                        saving ||
                                        items.length ===
                                            0 ||
                                        !customerName.trim() ||
                                        !phone.trim()
                                    }
                                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {saving ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            กำลังสร้าง Order...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4" />
                                            สร้าง 3D Order
                                        </>
                                    )}
                                </button>

                                <Link
                                    href="/admin/3d-printing/orders"
                                    className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 transition hover:border-slate-300 hover:text-slate-900 sm:text-sm"
                                >
                                    ยกเลิก
                                </Link>
                            </div>
                        </aside>
                    </div>
                </form>
            </div>
        </main>
    );
}