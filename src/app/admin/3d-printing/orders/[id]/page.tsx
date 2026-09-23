"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Archive,
    AlertCircle,
    ArrowLeft,
    Check,
    Clock3,
    CreditCard,
    Loader2,
    Package,
    Plus,
    X,
    Save,
    Trash2,
    UserRound,
} from "lucide-react";

import {
    archiveThreeDOrder,
    deleteThreeDOrder,
    restoreThreeDOrder,
    getThreeDOrder,
    updateThreeDOrder,
    startThreeDOrder,
    completeThreeDProduction,
    approveThreeDQuality,
    rejectThreeDQuality,
    shipThreeDOrder,
    completeThreeDOrder,
} from "@/services/threeDOrders";

import {
    createThreeDPayment,
    getThreeDPayments,
    updateThreeDPaymentStatus,
} from "@/services/threeDPayments";

import type { ThreeDPayment } from "@/types/threeDPayment";

import type {
    ThreeDOrder,
    ThreeDOrderItem,
    ThreeDOrderPaymentMethod,
    ThreeDOrderStatus,
    ThreeDPaymentStatus,
} from "@/types/threeDOrder";
import { Admin3DNav } from "@/components/3d/Admin3DNav";
import { ResourceBreadcrumb } from "@/components/3d/ResourceBreadcrumb";

type RouteContext = {
    params: Promise<{ id: string }>;
};

const ORDER_STATUS_OPTIONS: {
    value: ThreeDOrderStatus;
    label: string;
}[] = [
    { value: "quote", label: "ใบเสนอราคา" },
    { value: "pending_confirmation", label: "รอยืนยัน Order" },
    { value: "waiting_payment", label: "รอชำระเงิน" },
    { value: "queued", label: "เข้าคิวผลิต" },
    { value: "printing", label: "กำลังพิมพ์" },
    { value: "quality_check", label: "ตรวจสอบคุณภาพ" },
    { value: "ready", label: "พร้อมรับสินค้า" },
    { value: "shipping", label: "กำลังจัดส่ง" },
    { value: "completed", label: "เสร็จสิ้น" },
    { value: "cancelled", label: "ยกเลิก" },
];

const PAYMENT_STATUS_OPTIONS: {
    value: ThreeDPaymentStatus;
    label: string;
}[] = [
    { value: "unpaid", label: "ยังไม่ชำระ" },
    {
        value: "pending_verification",
        label: "รอตรวจสอบการชำระเงิน",
    },
    { value: "partial", label: "ชำระบางส่วน" },
    { value: "paid", label: "ชำระครบแล้ว" },
    { value: "refunded", label: "คืนเงินแล้ว" },
];

const PAYMENT_METHOD_OPTIONS: {
    value: ThreeDOrderPaymentMethod;
    label: string;
}[] = [
    { value: "bank_transfer", label: "โอนธนาคาร" },
    { value: "promptpay", label: "PromptPay" },
    { value: "cash", label: "เงินสด" },
    { value: "other", label: "อื่น ๆ" },
];

const PAYMENT_RECORD_STATUS_OPTIONS: {
    value: ThreeDPayment["status"];
    label: string;
}[] = [
    {
        value: "pending_verification",
        label: "รอตรวจสอบ",
    },
    {
        value: "verified",
        label: "ตรวจสอบแล้ว",
    },
    {
        value: "rejected",
        label: "ปฏิเสธ",
    },
    {
        value: "refunded",
        label: "คืนเงินแล้ว",
    },
];

function formatMoney(value: number) {
    return new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 2,
    }).format(value || 0);
}

function formatDate(value: unknown) {
    if (!value) return "-";

    const date = new Date(
        typeof value === "string" || typeof value === "number"
            ? value
            : String(value)
    );

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(date);
}

function normalizeNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getStatusLabel(status: ThreeDOrderStatus) {
    return (
        ORDER_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
        status
    );
}

function getPaymentStatusLabel(status: ThreeDPaymentStatus) {
    return (
        PAYMENT_STATUS_OPTIONS.find((item) => item.value === status)?.label ??
        status
    );
}

function getPaymentMethodLabel(
    method?: ThreeDOrderPaymentMethod
) {
    if (!method) return "-";

    return (
        PAYMENT_METHOD_OPTIONS.find((item) => item.value === method)
            ?.label ?? method
    );
}

export default function ThreeDOrderDetailPage({
    params,
}: RouteContext) {
    const [orderId, setOrderId] = useState("");

    const [order, setOrder] = useState<ThreeDOrder | null>(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [payments, setPayments] =
        useState<ThreeDPayment[]>([]);
    const [loadingPayments, setLoadingPayments] =
        useState(false);
    const [paymentError, setPaymentError] =
        useState("");

    const [showPaymentForm, setShowPaymentForm] =
        useState(false);
    const [paymentAmount, setPaymentAmount] =
        useState("");
    const [paymentMethod, setPaymentMethod] =
        useState<ThreeDOrderPaymentMethod>(
            "bank_transfer"
        );
    const [paymentStatus, setPaymentStatus] =
        useState<ThreeDPayment["status"]>(
            "pending_verification"
        );
    const [paymentReference, setPaymentReference] =
        useState("");
    const [paymentNote, setPaymentNote] =
        useState("");
    const [savingPayment, setSavingPayment] =
        useState(false);

    const loadOrder = useCallback(async (id: string) => {
        try {
            setLoading(true);
            setError("");
            setSuccess("");

            const result = await getThreeDOrder(id);

            setOrder(result);
        } catch (cause) {
            setOrder(null);

            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถโหลดข้อมูล Order ได้"
            );
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPayments = useCallback(async (id: string) => {
        try {
            setLoadingPayments(true);
            setPaymentError("");

            const result =
                await getThreeDPayments(id);

            setPayments(result);
        } catch (cause) {
            setPayments([]);

            setPaymentError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถโหลดรายการชำระเงินได้"
            );
        } finally {
            setLoadingPayments(false);
        }
    }, []);

    useEffect(() => {
        let cancelled = false;

        void params.then(({ id }) => {
            if (cancelled) return;

            setOrderId(id);
            void loadOrder(id);
            void loadPayments(id);
        });

        return () => {
            cancelled = true;
        };
    }, [params, loadOrder, loadPayments]);

    const totals = useMemo(() => {
        if (!order) {
            return {
                subtotal: 0,
                discount: 0,
                shippingFee: 0,
                totalPrice: 0,
                paidAmount: 0,
                remainingAmount: 0,
            };
        }

        const subtotal = order.items.reduce(
            (sum, item) =>
                sum + Number(item.totalPrice || 0),
            0
        );

        const discount = Math.max(
            0,
            Number(order.discount || 0)
        );

        const shippingFee = Math.max(
            0,
            Number(order.shippingFee || 0)
        );

        const totalPrice = Math.max(
            0,
            subtotal - discount + shippingFee
        );

        const paidAmount = Math.max(
            0,
            Number(order.paidAmount || 0)
        );

        const remainingAmount = Math.max(
            0,
            totalPrice - paidAmount
        );

        return {
            subtotal,
            discount,
            shippingFee,
            totalPrice,
            paidAmount,
            remainingAmount,
        };
    }, [order]);

    function updateCustomer(
        field: "name" | "phone" | "email" | "line",
        value: string
    ) {
        setOrder((current) =>
            current
                ? {
                      ...current,
                      customer: {
                          ...current.customer,
                          [field]: value,
                      },
                  }
                : current
        );
    }

    function updateItem(
        index: number,
        field: keyof ThreeDOrderItem,
        value: string | number
    ) {
        setOrder((current) => {
            if (!current) return current;

            const items = [...current.items];
            const currentItem = items[index];

            if (!currentItem) {
                return current;
            }

            const nextItem = {
                ...currentItem,
                [field]: value,
            };

            if (
                field === "quantity" ||
                field === "unitPrice"
            ) {
                const quantity =
                    field === "quantity"
                        ? Number(value)
                        : Number(currentItem.quantity);

                const unitPrice =
                    field === "unitPrice"
                        ? Number(value)
                        : Number(currentItem.unitPrice);

                nextItem.totalPrice =
                    Math.max(0, quantity) *
                    Math.max(0, unitPrice);
            }

            items[index] = nextItem;

            return {
                ...current,
                items,
            };
        });
    }

    function removeItem(index: number) {
        setOrder((current) => {
            if (!current) return current;

            return {
                ...current,
                items: current.items.filter(
                    (_, itemIndex) => itemIndex !== index
                ),
            };
        });
    }

    function resetPaymentForm() {
        setPaymentAmount("");
        setPaymentMethod("bank_transfer");
        setPaymentStatus("pending_verification");
        setPaymentReference("");
        setPaymentNote("");
        setPaymentError("");
    }

    async function handleAddPayment() {
        if (!order || !orderId) return;

        const amount = normalizeNumber(
            paymentAmount
        );

        if (!Number.isFinite(amount) || amount <= 0) {
            setPaymentError(
                "กรุณาระบุจำนวนเงินที่ถูกต้อง"
            );
            return;
        }

        if (
            paymentStatus === "verified" &&
            amount > totals.remainingAmount
        ) {
            setPaymentError(
                "ยอด Payment ที่ตรวจสอบแล้วไม่ควรเกินยอดคงเหลือของ Order"
            );
            return;
        }

        try {
            setSavingPayment(true);
            setPaymentError("");

            await createThreeDPayment({
                orderId,
                orderNumber: order.orderNumber,
                amount,
                method: paymentMethod,
                status: paymentStatus,
                ...(paymentReference.trim()
                    ? {
                          reference:
                              paymentReference.trim(),
                      }
                    : {}),
                ...(paymentNote.trim()
                    ? {
                          note:
                              paymentNote.trim(),
                      }
                    : {}),
                ...(paymentStatus === "verified"
                    ? {
                          paidAt:
                              new Date().toISOString(),
                      }
                    : {}),
            });

            await loadPayments(orderId);

            resetPaymentForm();
            setShowPaymentForm(false);

            setSuccess(
                "เพิ่มรายการชำระเงินเรียบร้อยแล้ว"
            );

            window.setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (cause) {
            setPaymentError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถเพิ่มรายการชำระเงินได้"
            );
        } finally {
            setSavingPayment(false);
        }
    }

    async function handlePaymentStatusChange(
        payment: ThreeDPayment,
        status: ThreeDPayment["status"]
    ) {
        try {
            setPaymentError("");

            await updateThreeDPaymentStatus(
                payment.id,
                status
            );

            await loadPayments(orderId);

            setSuccess(
                "อัปเดตสถานะ Payment เรียบร้อยแล้ว"
            );

            window.setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (cause) {
            setPaymentError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถอัปเดตสถานะ Payment ได้"
            );
        }
    }

    async function handleSave() {
        if (!order || !orderId) return;

        setSaving(true);
        setError("");
        setSuccess("");

        try {
            const updated = await updateThreeDOrder(
                orderId,
                {
                    customer: order.customer,
                    items: order.items,
                    discount: Math.max(
                        0,
                        Number(order.discount || 0)
                    ),
                    shippingFee: Math.max(
                        0,
                        Number(order.shippingFee || 0)
                    ),
                    paidAmount: Math.max(
                        0,
                        Number(order.paidAmount || 0)
                    ),
                    orderStatus: order.orderStatus,
                    paymentStatus: order.paymentStatus,
                    paymentMethod:
                        order.paymentMethod,
                    productionNote:
                        order.productionNote,
                    customerNote:
                        order.customerNote,
                    dueDate:
                        order.dueDate,
                    shippingAddress:
                        order.shippingAddress,
                }
            );

            setOrder({
                ...order,
                ...updated,
            });

            setSuccess("บันทึก Order เรียบร้อยแล้ว");

            window.setTimeout(() => {
                setSuccess("");
            }, 3000);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถบันทึก Order ได้"
            );
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!order || !orderId) return;

        const confirmed = window.confirm(
            `ต้องการลบ Order ${order.orderNumber} ใช่หรือไม่?\n\nการลบ Order ไม่สามารถย้อนกลับได้`
        );

        if (!confirmed) {
            return;
        }

        setDeleting(true);
        setError("");

        try {
            await deleteThreeDOrder(orderId);

            window.location.href =
                "/admin/3d-printing/orders";
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : "ไม่สามารถลบ Order ได้"
            );

            setDeleting(false);
        }
    }

    async function handleArchive() {
        if (!order || !orderId || order.orderStatus !== "completed") return;
        setDeleting(true); setError("");
        try {
            await archiveThreeDOrder(orderId);
            setShowArchiveModal(false);
            setOrder((current) => current ? { ...current, isArchived: true } : current);
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : "ไม่สามารถเก็บ Order เข้าคลังได้");
        } finally { setDeleting(false); }
    }

    async function handleRestore() {
        if (!order || !orderId || !order.isArchived) return;
        setDeleting(true); setError("");
        try { await restoreThreeDOrder(orderId); setOrder((current) => current ? { ...current, isArchived: false, archivedAt: null, archivedBy: undefined } : current); }
        catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถกู้คืน Order ได้"); }
        finally { setDeleting(false); }
    }

    async function runLifecycle(action: "start" | "production" | "quality" | "ship" | "complete" | "archive") {
        if (!order || !orderId) return;
        setSaving(true); setError(""); setSuccess("");
        try {
            if (action === "start") await startThreeDOrder(orderId);
            if (action === "production") await completeThreeDProduction(orderId);
            if (action === "quality") await approveThreeDQuality(orderId);
            if (action === "ship") {
                const carrier = window.prompt("ชื่อบริษัทขนส่ง", order.carrier || "") || "";
                const trackingNumber = window.prompt("เลขติดตามพัสดุ", order.trackingNumber || "") || "";
                await shipThreeDOrder(orderId, carrier, trackingNumber);
            }
            if (action === "complete") { if (!window.confirm("ยืนยันว่าลูกค้าได้รับงานแล้วใช่หรือไม่?")) return; await completeThreeDOrder(orderId); }
            if (action === "archive") { if (!window.confirm("เก็บ Order ที่เสร็จแล้วเข้าคลังใช่หรือไม่?")) return; await archiveThreeDOrder(orderId); }
            await loadOrder(orderId); setSuccess("อัปเดต Workflow สำเร็จ");
        } catch (cause) { setError(cause instanceof Error ? cause.message : "ไม่สามารถอัปเดต Workflow ได้"); } finally { setSaving(false); }
    }

    async function handleQualityReject() {
        if (!orderId || !window.confirm("QC ไม่ผ่านจะยังไม่มีการเปลี่ยนสถานะจนกว่าจะมีผลการตรวจใหม่ ยืนยันหรือไม่?")) return;
        setSaving(true); setError(""); try { await rejectThreeDQuality(orderId); } catch (cause) { setError(cause instanceof Error && cause.message === "QC_REQUIRES_REVIEW" ? "QC ไม่ผ่าน: ระบบยังไม่เปลี่ยนสถานะ เพื่อป้องกันการสร้างสถานะที่ไม่มีใน workflow" : "ไม่สามารถบันทึกผล QC ได้"); } finally { setSaving(false); }
    }

    if (loading) {
        return (
            <main className="mx-auto flex min-h-[70vh] w-full max-w-7xl items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <Loader2
                        size={25}
                        className="animate-spin text-pink-500"
                    />
                    <span className="font-medium">
                        กำลังโหลดข้อมูล Order...
                    </span>
                </div>
            </main>
        );
    }

    if (!order) {
        return (
            <main className="mx-auto w-full max-w-7xl space-y-6">
                <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                    <Link
                        href="/admin/3d-printing/orders"
                        className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-pink-500"
                    >
                        <ArrowLeft size={18} />
                        กลับไป Orders
                    </Link>

                    <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
                        <div className="flex items-start gap-3">
                            <AlertCircle
                                size={22}
                                className="mt-0.5 shrink-0"
                            />

                            <div>
                                <h1 className="font-black">
                                    ไม่สามารถเปิด Order ได้
                                </h1>

                                <p className="mt-2 text-sm">
                                    {error ||
                                        "ไม่พบข้อมูล Order นี้"}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="mx-auto w-full max-w-7xl space-y-6 pb-10">
            <Admin3DNav />
            <ResourceBreadcrumb items={[{ label: "3D Printing", href: "/admin/3d-printing" }, { label: "Orders", href: "/admin/3d-printing/orders" }, { label: `Order #${order.orderNumber}` }]} />
            {/* Header */}
            <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-start gap-4">
                        <Link
                            href="/admin/3d-printing/orders"
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                            aria-label="กลับไป Orders"
                        >
                            <ArrowLeft size={19} />
                        </Link>

                        <div>
                            <p className="text-xs font-black tracking-[0.2em] text-pink-500">
                                3D ORDER
                            </p>

                            <div className="mt-2 flex flex-wrap items-center gap-3">
                                <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                                    {order.orderNumber}
                                </h1>

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                    {getStatusLabel(
                                        order.orderStatus
                                    )}
                                </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-400">
                                สร้างเมื่อ {formatDate(order.createdAt)}
                            </p>
                            {order.quoteId && <Link href={`/admin/3d-printing/quotes/${encodeURIComponent(order.quoteId)}`} className="mt-3 inline-flex text-sm font-bold text-pink-500 hover:text-pink-600">ดู Quote และไฟล์ต้นฉบับ →</Link>}
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {(order.orderStatus === "completed" || order.isArchived) && <button
                            type="button"
                            onClick={() => order.isArchived ? void handleRestore() : setShowArchiveModal(true)}
                            disabled={deleting || saving}
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {deleting ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Archive size={17} />
                            )}
                            เก็บเข้าคลัง
                        </button>}

                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={
                                saving ||
                                deleting ||
                                order.items.length === 0
                            }
                            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-pink-500 px-6 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2
                                    size={17}
                                    className="animate-spin"
                                />
                            ) : (
                                <Save size={17} />
                            )}
                            บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                </div>
            </section>

            {/* Alerts */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700"
                >
                    <AlertCircle
                        size={21}
                        className="mt-0.5 shrink-0"
                    />

                    <div>
                        <p className="font-bold">
                            เกิดข้อผิดพลาด
                        </p>

                        <p className="mt-1 text-sm">
                            {error}
                        </p>
                    </div>
                </div>
            )}

            {success && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-700">
                    <Check size={21} />

                    <p className="text-sm font-bold">
                        {success}
                    </p>
                </div>
            )}

            {/* Status */}
            <section className="grid gap-5 lg:grid-cols-3">
                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-50 text-pink-500">
                            <Package size={21} />
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-400">
                                สถานะการผลิต
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">{getStatusLabel(order.orderStatus)}</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500">
                            <CreditCard size={21} />
                        </div>

                        <div>
                            <p className="text-xs font-bold text-slate-400">
                                สถานะการชำระ
                            </p>

                            <p className="mt-1 text-sm font-black text-slate-900">{getPaymentStatusLabel(order.paymentStatus)}</p>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-500">
                            <Clock3 size={21} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-400">
                                กำหนดส่ง
                            </p>

                            <input
                                type="date"
                                value={
                                    order.dueDate || ""
                                }
                                onChange={(event) =>
                                    setOrder({
                                        ...order,
                                        dueDate:
                                            event.target.value ||
                                            undefined,
                                    })
                                }
                                className="mt-1 w-full bg-transparent text-sm font-black text-slate-900 outline-none"
                            />
                        </div>
                    </div>
                </Card>
            </section>

            <WorkflowCard order={order} busy={saving} onAction={(action) => void runLifecycle(action)} onQualityReject={() => void handleQualityReject()} />

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
                <div className="space-y-6">
                    {/* Customer */}
                    <Card>
                        <SectionTitle
                            icon={<UserRound size={19} />}
                            eyebrow="CUSTOMER"
                            title="ข้อมูลลูกค้า"
                        />

                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            <Field
                                label="ชื่อลูกค้า"
                                value={order.customer.name}
                                onChange={(value) =>
                                    updateCustomer(
                                        "name",
                                        value
                                    )
                                }
                                required
                            />

                            <Field
                                label="เบอร์โทร"
                                value={order.customer.phone}
                                onChange={(value) =>
                                    updateCustomer(
                                        "phone",
                                        value
                                    )
                                }
                                required
                            />

                            <Field
                                label="Email"
                                type="email"
                                value={
                                    order.customer.email ||
                                    ""
                                }
                                onChange={(value) =>
                                    updateCustomer(
                                        "email",
                                        value
                                    )
                                }
                            />

                            <Field
                                label="LINE"
                                value={
                                    order.customer.line ||
                                    ""
                                }
                                onChange={(value) =>
                                    updateCustomer(
                                        "line",
                                        value
                                    )
                                }
                            />
                        </div>
                    </Card>

                    {/* Items */}
                    <Card>
                        <SectionTitle
                            icon={<Package size={19} />}
                            eyebrow="ORDER ITEMS"
                            title="รายการสินค้า"
                        />

                        <div className="mt-6 space-y-4">
                            {order.items.map(
                                (item, index) => (
                                    <div
                                        key={`${item.productId ?? "custom"}-${index}`}
                                        className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5"
                                    >
                                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-slate-400">
                                                    PRODUCT
                                                </p>

                                                <h3 className="mt-1 text-lg font-black text-slate-900">
                                                    {
                                                        item.productName
                                                    }
                                                </h3>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeItem(
                                                        index
                                                    )
                                                }
                                                className="inline-flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50"
                                            >
                                                <Trash2
                                                    size={15}
                                                />
                                                ลบรายการ
                                            </button>
                                        </div>

                                        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                            <NumberField
                                                label="จำนวน"
                                                value={
                                                    item.quantity
                                                }
                                                min={1}
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateItem(
                                                        index,
                                                        "quantity",
                                                        Math.max(
                                                            1,
                                                            Math.floor(
                                                                value
                                                            )
                                                        )
                                                    )
                                                }
                                            />

                                            <NumberField
                                                label="ราคาต่อชิ้น"
                                                value={
                                                    item.unitPrice
                                                }
                                                min={0}
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateItem(
                                                        index,
                                                        "unitPrice",
                                                        Math.max(
                                                            0,
                                                            value
                                                        )
                                                    )
                                                }
                                            />

                                            <Field
                                                label="Material"
                                                value={
                                                    item.material ||
                                                    ""
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateItem(
                                                        index,
                                                        "material",
                                                        value
                                                    )
                                                }
                                            />

                                            <Field
                                                label="สี"
                                                value={
                                                    item.color ||
                                                    ""
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateItem(
                                                        index,
                                                        "color",
                                                        value
                                                    )
                                                }
                                            />
                                        </div>

                                        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                                            <Field
                                                label="หมายเหตุสินค้า"
                                                value={
                                                    item.notes ||
                                                    ""
                                                }
                                                onChange={(
                                                    value
                                                ) =>
                                                    updateItem(
                                                        index,
                                                        "notes",
                                                        value
                                                    )
                                                }
                                            />

                                            <div className="rounded-2xl bg-white px-5 py-3 text-right shadow-sm">
                                                <p className="text-xs font-bold text-slate-400">
                                                    รวม
                                                </p>

                                                <p className="mt-1 text-lg font-black text-slate-900">
                                                    {formatMoney(
                                                        item.totalPrice
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            )}
                        </div>

                        {order.items.length === 0 && (
                            <div className="mt-6 rounded-2xl border border-dashed border-red-200 bg-red-50 p-6 text-center text-sm font-medium text-red-600">
                                Order ต้องมีสินค้าอย่างน้อย 1 รายการ
                            </div>
                        )}
                    </Card>

                    {/* Notes */}
                    <Card>
                        <SectionTitle
                            eyebrow="NOTES"
                            title="หมายเหตุ"
                        />

                        <div className="mt-6 grid gap-5">
                            <TextArea
                                label="หมายเหตุสำหรับลูกค้า"
                                value={
                                    order.customerNote || ""
                                }
                                onChange={(value) =>
                                    setOrder({
                                        ...order,
                                        customerNote:
                                            value || undefined,
                                    })
                                }
                                placeholder="รายละเอียดที่ลูกค้าควรรู้..."
                            />

                            <TextArea
                                label="หมายเหตุการผลิต"
                                value={
                                    order.productionNote ||
                                    ""
                                }
                                onChange={(value) =>
                                    setOrder({
                                        ...order,
                                        productionNote:
                                            value || undefined,
                                    })
                                }
                                placeholder="รายละเอียดสำหรับทีมผลิต..."
                            />
                        </div>
                    </Card>

                    {/* Shipping */}
                    <Card>
                        <SectionTitle
                            eyebrow="SHIPPING"
                            title="ที่อยู่จัดส่ง"
                        />

                        <div className="mt-6 grid gap-5">
                            <TextArea
                                label="ที่อยู่"
                                value={
                                    order.shippingAddress
                                        ?.address || ""
                                }
                                onChange={(value) =>
                                    setOrder({
                                        ...order,
                                        shippingAddress: {
                                            ...order.shippingAddress,
                                            address:
                                                value ||
                                                undefined,
                                        },
                                    })
                                }
                            />

                            <div className="grid gap-5 sm:grid-cols-3">
                                <Field
                                    label="อำเภอ / เขต"
                                    value={
                                        order
                                            .shippingAddress
                                            ?.district || ""
                                    }
                                    onChange={(value) =>
                                        setOrder({
                                            ...order,
                                            shippingAddress: {
                                                ...order.shippingAddress,
                                                district:
                                                    value ||
                                                    undefined,
                                            },
                                        })
                                    }
                                />

                                <Field
                                    label="จังหวัด"
                                    value={
                                        order
                                            .shippingAddress
                                            ?.province || ""
                                    }
                                    onChange={(value) =>
                                        setOrder({
                                            ...order,
                                            shippingAddress: {
                                                ...order.shippingAddress,
                                                province:
                                                    value ||
                                                    undefined,
                                            },
                                        })
                                    }
                                />

                                <Field
                                    label="รหัสไปรษณีย์"
                                    value={
                                        order
                                            .shippingAddress
                                            ?.postcode || ""
                                    }
                                    onChange={(value) =>
                                        setOrder({
                                            ...order,
                                            shippingAddress: {
                                                ...order.shippingAddress,
                                                postcode:
                                                    value ||
                                                    undefined,
                                            },
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Financial */}
                <aside className="space-y-6">
                    <Card>
                        <SectionTitle
                            icon={<CreditCard size={19} />}
                            eyebrow="PAYMENT"
                            title="การชำระเงิน"
                        />

                        <div className="mt-6 space-y-5">
                            <div>
                                <label className="text-sm font-bold text-slate-700">
                                    วิธีชำระเงิน
                                </label>

                                <select
                                    value={
                                        order.paymentMethod ||
                                        ""
                                    }
                                    onChange={(event) =>
                                        setOrder({
                                            ...order,
                                            paymentMethod:
                                                event.target
                                                    .value
                                                    ? (event
                                                          .target
                                                          .value as ThreeDOrderPaymentMethod)
                                                    : undefined,
                                        })
                                    }
                                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
                                >
                                    <option value="">
                                        ยังไม่ได้ระบุ
                                    </option>

                                    {PAYMENT_METHOD_OPTIONS.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item.value
                                                }
                                                value={
                                                    item.value
                                                }
                                            >
                                                {item.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <NumberField
                                label="รับเงินแล้ว"
                                value={
                                    order.paidAmount
                                }
                                min={0}
                                onChange={(value) =>
                                    setOrder({
                                        ...order,
                                        paidAmount:
                                            Math.max(
                                                0,
                                                value
                                            ),
                                    })
                                }
                            />

                            <div className="rounded-3xl bg-slate-900 p-5 text-white">
                                <p className="text-xs font-bold text-slate-400">
                                    รับเงินแล้ว
                                </p>

                                <p className="mt-2 text-2xl font-black">
                                    {formatMoney(
                                        totals.paidAmount
                                    )}
                                </p>

                                <div className="mt-4 border-t border-white/10 pt-4">
                                    <p className="text-xs font-bold text-slate-400">
                                        คงเหลือ
                                    </p>

                                    <p className="mt-1 text-xl font-black text-pink-300">
                                        {formatMoney(
                                            totals.remainingAmount
                                        )}
                                    </p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-5">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black tracking-[0.16em] text-pink-500">
                                            PAYMENT RECORDS
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            รายการชำระเงินจริงของ Order นี้
                                        </p>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetPaymentForm();
                                            setShowPaymentForm(true);
                                        }}
                                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-xs font-bold text-white transition hover:bg-slate-800"
                                    >
                                        <Plus size={15} />
                                        เพิ่ม Payment
                                    </button>
                                </div>

                                {paymentError && (
                                    <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                                        <AlertCircle
                                            size={16}
                                            className="mt-0.5 shrink-0"
                                        />
                                        <span>
                                            {paymentError}
                                        </span>
                                    </div>
                                )}

                                {loadingPayments ? (
                                    <div className="mt-4 flex items-center justify-center rounded-2xl bg-slate-50 py-8 text-xs text-slate-400">
                                        <Loader2
                                            size={17}
                                            className="mr-2 animate-spin text-pink-500"
                                        />
                                        กำลังโหลดรายการชำระเงิน...
                                    </div>
                                ) : payments.length === 0 ? (
                                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-7 text-center">
                                        <CreditCard className="mx-auto h-7 w-7 text-slate-300" />
                                        <p className="mt-2 text-sm font-bold text-slate-500">
                                            ยังไม่มี Payment Record
                                        </p>
                                        <p className="mt-1 text-xs text-slate-400">
                                            เพิ่มรายการเมื่อได้รับเงินจากลูกค้า
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-3">
                                        {payments.map(
                                            (payment) => (
                                                <div
                                                    key={
                                                        payment.id
                                                    }
                                                    className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                                                >
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div>
                                                            <p className="text-lg font-black text-slate-900">
                                                                {formatMoney(
                                                                    payment.amount
                                                                )}
                                                            </p>
                                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                                                {getPaymentMethodLabel(
                                                                    payment.method
                                                                )}
                                                            </p>
                                                        </div>

                                                        <select
                                                            value={
                                                                payment.status
                                                            }
                                                            onChange={(
                                                                event
                                                            ) =>
                                                                void handlePaymentStatusChange(
                                                                    payment,
                                                                    event
                                                                        .target
                                                                        .value as ThreeDPayment["status"]
                                                                )
                                                            }
                                                            className="max-w-[145px] rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-700 outline-none focus:border-pink-300"
                                                        >
                                                            {PAYMENT_RECORD_STATUS_OPTIONS.map(
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
                                                        </select>
                                                    </div>

                                                    <div className="mt-3 space-y-1 text-xs text-slate-400">
                                                        {payment.reference && (
                                                            <p>
                                                                เลขอ้างอิง:{" "}
                                                                <span className="font-semibold text-slate-600">
                                                                    {
                                                                        payment.reference
                                                                    }
                                                                </span>
                                                            </p>
                                                        )}

                                                        {payment.note && (
                                                            <p>
                                                                หมายเหตุ:{" "}
                                                                <span className="font-semibold text-slate-600">
                                                                    {
                                                                        payment.note
                                                                    }
                                                                </span>
                                                            </p>
                                                        )}

                                                        {payment.paidAt && (
                                                            <p>
                                                                ชำระเมื่อ:{" "}
                                                                <span className="font-semibold text-slate-600">
                                                                    {formatDate(
                                                                        payment.paidAt
                                                                    )}
                                                                </span>
                                                            </p>
                                                        )}

                                                        <p>
                                                            บันทึกเมื่อ:{" "}
                                                            <span className="font-semibold text-slate-600">
                                                                {formatDate(
                                                                    payment.createdAt
                                                                )}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <SectionTitle
                            eyebrow="SUMMARY"
                            title="สรุปยอด Order"
                        />

                        <div className="mt-6 space-y-4">
                            <SummaryRow
                                label="ค่าสินค้า"
                                value={formatMoney(
                                    totals.subtotal
                                )}
                            />

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-slate-500">
                                    ส่วนลด
                                </span>

                                <input
                                    type="number"
                                    min={0}
                                    value={
                                        order.discount
                                    }
                                    onChange={(event) =>
                                        setOrder({
                                            ...order,
                                            discount:
                                                normalizeNumber(
                                                    event
                                                        .target
                                                        .value
                                                ),
                                        })
                                    }
                                    className="h-10 w-32 rounded-xl border border-slate-200 px-3 text-right text-sm font-bold outline-none focus:border-pink-300"
                                />
                            </div>

                            <div className="flex items-center justify-between gap-4">
                                <span className="text-sm text-slate-500">
                                    ค่าส่ง
                                </span>

                                <input
                                    type="number"
                                    min={0}
                                    value={
                                        order.shippingFee
                                    }
                                    onChange={(event) =>
                                        setOrder({
                                            ...order,
                                            shippingFee:
                                                normalizeNumber(
                                                    event
                                                        .target
                                                        .value
                                                ),
                                        })
                                    }
                                    className="h-10 w-32 rounded-xl border border-slate-200 px-3 text-right text-sm font-bold outline-none focus:border-pink-300"
                                />
                            </div>

                            <div className="border-t border-slate-200 pt-5">
                                <SummaryRow
                                    label="ยอดรวม"
                                    value={formatMoney(
                                        totals.totalPrice
                                    )}
                                    strong
                                />
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <SectionTitle
                            eyebrow="ORDER INFO"
                            title="ข้อมูล Order"
                        />

                        <div className="mt-6 space-y-4">
                            <InfoRow
                                label="Order Number"
                                value={
                                    order.orderNumber
                                }
                            />

                            <InfoRow
                                label="สถานะ"
                                value={getStatusLabel(
                                    order.orderStatus
                                )}
                            />

                            <InfoRow
                                label="การชำระ"
                                value={getPaymentStatusLabel(
                                    order.paymentStatus
                                )}
                            />

                            <InfoRow
                                label="วิธีชำระ"
                                value={getPaymentMethodLabel(
                                    order.paymentMethod
                                )}
                            />

                            <InfoRow
                                label="สร้างเมื่อ"
                                value={formatDate(
                                    order.createdAt
                                )}
                            />

                            <InfoRow
                                label="แก้ไขล่าสุด"
                                value={formatDate(
                                    order.updatedAt
                                )}
                            />
                        </div>
                    </Card>
                </aside>
            </div>

            {showPaymentForm && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="add-payment-title"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            setShowPaymentForm(false);
                        }
                    }}
                >
                    <div className="w-full max-w-lg overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-6">
                            <div>
                                <p className="text-xs font-black tracking-[0.18em] text-pink-500">
                                    PAYMENT
                                </p>
                                <h2
                                    id="add-payment-title"
                                    className="mt-1 text-xl font-black text-slate-900"
                                >
                                    เพิ่มรายการชำระเงิน
                                </h2>
                                <p className="mt-1 text-xs text-slate-400">
                                    บันทึกเป็น Payment Record แยกจาก Order
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() =>
                                    setShowPaymentForm(false)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                                aria-label="ปิด"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4 p-6">
                            <NumberField
                                label="จำนวนเงิน"
                                value={
                                    Number(paymentAmount) || 0
                                }
                                min={0}
                                onChange={(value) =>
                                    setPaymentAmount(
                                        String(value)
                                    )
                                }
                            />

                            <div>
                                <label className="text-sm font-bold text-slate-700">
                                    วิธีชำระเงิน
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(event) =>
                                        setPaymentMethod(
                                            event.target
                                                .value as ThreeDOrderPaymentMethod
                                        )
                                    }
                                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
                                >
                                    {PAYMENT_METHOD_OPTIONS.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item.value
                                                }
                                                value={
                                                    item.value
                                                }
                                            >
                                                {item.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-bold text-slate-700">
                                    สถานะ Payment
                                </label>
                                <select
                                    value={paymentStatus}
                                    onChange={(event) =>
                                        setPaymentStatus(
                                            event.target
                                                .value as ThreeDPayment["status"]
                                        )
                                    }
                                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
                                >
                                    {PAYMENT_RECORD_STATUS_OPTIONS.map(
                                        (item) => (
                                            <option
                                                key={
                                                    item.value
                                                }
                                                value={
                                                    item.value
                                                }
                                            >
                                                {item.label}
                                            </option>
                                        )
                                    )}
                                </select>
                            </div>

                            <Field
                                label="เลขอ้างอิง"
                                value={paymentReference}
                                onChange={
                                    setPaymentReference
                                }
                            />

                            <TextArea
                                label="หมายเหตุ"
                                value={paymentNote}
                                onChange={
                                    setPaymentNote
                                }
                                placeholder="เช่น ลูกค้าโอนมัดจำ 50%"
                            />

                            {paymentError && (
                                <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-3 text-xs text-red-700">
                                    <AlertCircle
                                        size={16}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <span>
                                        {paymentError}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() =>
                                    setShowPaymentForm(false)
                                }
                                disabled={savingPayment}
                                className="h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-600 transition hover:border-slate-300 disabled:opacity-50"
                            >
                                ยกเลิก
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    void handleAddPayment()
                                }
                                disabled={
                                    savingPayment ||
                                    !paymentAmount
                                }
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {savingPayment ? (
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                ) : (
                                    <Check size={16} />
                                )}
                                บันทึก Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom save */}
            <section className="sticky bottom-4 z-20 rounded-3xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400">
                            ยอด Order
                        </p>

                        <p className="text-xl font-black text-slate-900">
                            {formatMoney(
                                totals.totalPrice
                            )}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={
                            saving ||
                            deleting ||
                            order.items.length === 0
                        }
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-pink-500 px-7 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:bg-pink-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2
                                size={17}
                                className="animate-spin"
                            />
                        ) : (
                            <Save size={17} />
                        )}
                        บันทึก Order
                    </button>
                </div>
            </section>
        {showArchiveModal && order && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
                    <h2 className="text-xl font-black">เก็บงานนี้เข้าคลัง?</h2>
                    <div className="mt-4 space-y-2 text-sm text-slate-600"><p>Order: <b>{order.orderNumber}</b></p><p>Customer: {order.customer.name || order.userId || "—"}</p><p>ยอดรวม: <b>{formatMoney(totals.totalPrice)}</b></p><p>สถานะ: {getStatusLabel(order.orderStatus)}</p><p className="mt-4 rounded-xl bg-blue-50 p-4 text-blue-800">ข้อมูลจะไม่ถูกลบถาวร แต่จะถูกซ่อนจากรายการงานหลัก</p></div>
                    <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={() => setShowArchiveModal(false)} className="rounded-xl border px-4 py-3 text-sm font-bold">ยกเลิก</button><button type="button" disabled={deleting} onClick={() => void handleArchive()} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{deleting ? "กำลังเก็บ..." : "เก็บเข้าคลัง"}</button></div>
                </div>
            </div>
        )}
        </main>
    );
}

function Card({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            {children}
        </section>
    );
}

function SectionTitle({
    icon,
    eyebrow,
    title,
}: {
    icon?: React.ReactNode;
    eyebrow: string;
    title: string;
}) {
    return (
        <div>
            <div className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-pink-500">
                {icon}
                {eyebrow}
            </div>

            <h2 className="mt-2 text-xl font-black text-slate-900">
                {title}
            </h2>
        </div>
    );
}

function Field({
    label,
    value,
    onChange,
    type = "text",
    required = false,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    type?: string;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700">
                {label}
                {required && (
                    <span className="ml-1 text-pink-500">
                        *
                    </span>
                )}
            </span>

            <input
                type={type}
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
            />
        </label>
    );
}

function NumberField({
    label,
    value,
    onChange,
    min = 0,
}: {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min?: number;
}) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700">
                {label}
            </span>

            <input
                type="number"
                min={min}
                step="0.01"
                value={value}
                onChange={(event) =>
                    onChange(
                        normalizeNumber(
                            event.target.value
                        )
                    )
                }
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
            />
        </label>
    );
}

function TextArea({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}) {
    return (
        <label className="block">
            <span className="text-sm font-bold text-slate-700">
                {label}
            </span>

            <textarea
                value={value}
                onChange={(event) =>
                    onChange(event.target.value)
                }
                placeholder={placeholder}
                rows={4}
                className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-pink-300 focus:ring-4 focus:ring-pink-50"
            />
        </label>
    );
}

function SummaryRow({
    label,
    value,
    strong = false,
}: {
    label: string;
    value: string;
    strong?: boolean;
}) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span
                className={
                    strong
                        ? "text-base font-black text-slate-900"
                        : "text-sm text-slate-500"
                }
            >
                {label}
            </span>

            <span
                className={
                    strong
                        ? "text-xl font-black text-slate-900"
                        : "text-sm font-bold text-slate-900"
                }
            >
                {value}
            </span>
        </div>
    );
}

function InfoRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-sm text-slate-400">
                {label}
            </span>

            <span className="text-right text-sm font-bold text-slate-800">
                {value}
            </span>
        </div>
    );
}

function WorkflowCard({ order, busy, onAction, onQualityReject }: { order: ThreeDOrder; busy: boolean; onAction: (action: "start" | "production" | "quality" | "ship" | "complete" | "archive") => void; onQualityReject: () => void }) {
    const steps = ["paid", "queued", "printing", "quality_check", "ready", "shipping", "completed"] as const;
    const labels: Record<string, string> = { paid: "ชำระเงินแล้ว", queued: "รอเข้าคิวผลิต", printing: "กำลังผลิต", quality_check: "ตรวจคุณภาพ", ready: "พร้อมส่ง", shipping: "กำลังจัดส่ง", completed: "เสร็จสิ้น" };
    const current = steps.indexOf(order.orderStatus as (typeof steps)[number]);
    return <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D93687]">WORKFLOW</p><h2 className="mt-2 text-xl font-black">สถานะงานและสิ่งที่ต้องทำต่อ</h2></div><span className="rounded-full bg-[#FFE4F1] px-3 py-1.5 text-xs font-bold text-[#D93687]">{getStatusLabel(order.orderStatus)}</span></div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map((step, index) => <div key={step} className={`rounded-2xl border p-4 ${index < current ? "border-emerald-100 bg-emerald-50" : index === current ? "border-pink-200 bg-[#FFE4F1]" : "border-slate-100 bg-slate-50"}`}><p className="text-xs font-bold text-slate-400">{index < current ? "เสร็จแล้ว" : index === current ? "กำลังดำเนินการ" : "ถัดไป"}</p><p className="mt-1 text-sm font-black text-slate-800">{labels[step]}</p></div>)}</div><div className="mt-6 flex flex-wrap gap-3">{order.orderStatus === "queued" && <button disabled={busy} onClick={() => onAction("start")} className="rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">เริ่มผลิต</button>}{order.orderStatus === "printing" && <button disabled={busy} onClick={() => onAction("production")} className="rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">ผลิตเสร็จ → ตรวจคุณภาพ</button>}{order.orderStatus === "quality_check" && <><button disabled={busy} onClick={() => onAction("quality")} className="rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">✓ QC ผ่าน</button><button disabled={busy} onClick={onQualityReject} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-600 disabled:opacity-50">✕ QC ไม่ผ่าน</button></>}{order.orderStatus === "ready" && <button disabled={busy} onClick={() => onAction("ship")} className="rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">ยืนยันจัดส่ง</button>}{order.orderStatus === "shipping" && <button disabled={busy} onClick={() => onAction("complete")} className="rounded-xl bg-[#FF4FA3] px-5 py-3 text-sm font-bold text-black disabled:opacity-50">ยืนยันส่งมอบแล้ว</button>}{order.orderStatus === "completed" && !order.isArchived && <button disabled={busy} onClick={() => onAction("complete")} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">เก็บเข้าคลัง</button>}</div>{order.orderStatus === "ready" && (order.carrier || order.trackingNumber) && <p className="mt-4 text-sm text-slate-500">{order.carrier || "ขนส่ง"} · {order.trackingNumber || "ไม่มีเลขติดตาม"}</p>}</section>;
}
