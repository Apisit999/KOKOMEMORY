"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { auth } from "@/lib/firebase";

type Plan = { id: string; name: string; billingPeriod: "month" | "year"; amountMinor: number; deviceLimit: number };
type License = { id: string; planId: string; planExpiresAt?: string | null; devices: Record<string, { name: string; status: string }> };
type Order = { id: string; planId: string; amountMinor: number; method: string; status: string; createdAt: string; paidAt: string | null; periodEnd: string | null };
type Pending = { orderId: string; qrImageUrl: string | null; expiresAt: string | null };
declare global { interface Window { OmiseCard?: { configure(o: object): void; open(o: object): void } } }

const baht = (minor: number) => (minor / 100).toLocaleString("th-TH", { minimumFractionDigits: 0 }) + " บาท";
const period = (p: Plan["billingPeriod"]) => (p === "month" ? "/ เดือน" : "/ ปี");
const date = (s: string | null | undefined) => (s ? new Date(s).toLocaleDateString("th-TH", { dateStyle: "medium" }) : "-");

async function api(path: string, body?: object) {
  if (!auth.currentUser) throw new Error("กรุณาเข้าสู่ระบบก่อน");
  const response = await fetch(`/api/studio/${path}`, { method: body ? "POST" : "GET", headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.code === "purchase_unavailable" ? "ระบบชำระเงินยังไม่เปิดใช้งาน" : result.code === "payment_declined" ? "บัตรถูกปฏิเสธ กรุณาลองบัตรอื่น" : "ชำระเงินไม่สำเร็จ กรุณาลองใหม่หรือติดต่อทีมงาน");
  return result;
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]); const [licenses, setLicenses] = useState<License[]>([]); const [orders, setOrders] = useState<Order[]>([]);
  const [licenseId, setLicenseId] = useState(""); const [planId, setPlanId] = useState("");
  const [pending, setPending] = useState<Pending | null>(null); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, l, o] = await Promise.all([api("account/billing/plans"), api("account/licenses"), api("account/billing/orders")]);
      setPlans(p.plans); setLicenses(l.licenses); setOrders(o.orders);
      setLicenseId(current => current || l.licenses[0]?.id || ""); setPlanId(current => current || p.plans[0]?.id || "");
    } catch (error) { setMessage(error instanceof Error ? error.message : "โหลดข้อมูลไม่ได้"); }
  }, []);
  useEffect(() => auth.onAuthStateChanged(user => { if (user) void load(); else setMessage("กรุณาเข้าสู่ระบบก่อน"); }), [load]);
  // Back from the card's 3-D Secure page: ?order=<id>
  useEffect(() => { const id = new URLSearchParams(window.location.search).get("order"); if (id) setPending({ orderId: id, qrImageUrl: null, expiresAt: null }); }, []);

  // Ask the server every 4 seconds until the payment is settled.
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      try {
        const status = await api(`account/billing/order?orderId=${pending.orderId}`);
        if (status.status === "paid") { setPending(null); setMessage(`ชำระเงินสำเร็จ ใช้งานได้ถึง ${date(status.periodEnd)}`); void load(); }
        else if (status.status === "cancelled") { setPending(null); setMessage("การชำระเงินหมดอายุหรือไม่สำเร็จ กรุณาลองใหม่"); void load(); }
      } catch { /* keep waiting */ }
    }, 4000);
    return () => clearInterval(timer);
  }, [pending, load]);

  async function checkout(method: "promptpay" | "card", cardToken?: string) {
    setBusy(true); setMessage("");
    try {
      const result = await api("account/billing/checkout", { licenseId, planId, method, cardToken });
      if (result.status === "paid") { setMessage("ชำระเงินสำเร็จ"); void load(); }
      else if (result.authorizeUri) window.location.href = result.authorizeUri;
      else setPending({ orderId: result.orderId, qrImageUrl: result.qrImageUrl, expiresAt: result.expiresAt });
    } catch (error) { setMessage(error instanceof Error ? error.message : "ชำระเงินไม่สำเร็จ"); }
    finally { setBusy(false); }
  }
  function payByCard() {
    const plan = plans.find(p => p.id === planId); const key = process.env.NEXT_PUBLIC_OMISE_PUBLIC_KEY;
    if (!plan || !window.OmiseCard || !key) { setMessage("ระบบบัตรยังไม่พร้อม"); return; }
    // The card form is Omise's own window: card numbers never touch our site.
    window.OmiseCard.configure({ publicKey: key });
    window.OmiseCard.open({ amount: plan.amountMinor, currency: "THB", defaultPaymentMethod: "credit_card", frameLabel: "KOKO Memory", submitLabel: "ชำระเงิน", onCreateTokenSuccess: (token: string) => void checkout("card", token) });
  }

  const plan = plans.find(p => p.id === planId);
  return <main className="mx-auto max-w-2xl px-4 py-10">
    <Script src="https://cdn.omise.co/omise.js" strategy="lazyOnload" />
    <h1 className="text-3xl font-black">ชำระค่าแพ็กเกจ KOKO Studio</h1>
    <p className="mt-3 text-sm leading-7 text-slate-600">เลือกเครื่องบูธและแพ็กเกจ แล้วจ่ายด้วย PromptPay หรือบัตร ระบบเปิดสิทธิ์ให้ทันทีเมื่อได้รับเงิน</p>
    {licenses.length === 0 ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm">ยังไม่มีเครื่องบูธที่เชื่อมกับบัญชีนี้ <Link href="/account/koko-studio/link" className="underline">เชื่อมอุปกรณ์</Link></p> : <section className="mt-7 space-y-5 rounded-2xl border bg-white p-6">
      <label className="block"><span className="font-semibold">เครื่องบูธ</span>
        <select value={licenseId} onChange={e => setLicenseId(e.target.value)} className="mt-2 w-full rounded-xl border p-3">{licenses.map(l => <option key={l.id} value={l.id}>{Object.values(l.devices)[0]?.name ?? l.id} — ตอนนี้: {plans.find(p => p.id === l.planId)?.name ?? (l.planId === "free" ? "ฟรี" : l.planId)}{l.planExpiresAt ? ` (ถึง ${date(l.planExpiresAt)})` : ""}</option>)}</select></label>
      <fieldset><legend className="font-semibold">แพ็กเกจ</legend><div className="mt-2 grid gap-3 sm:grid-cols-2">{plans.map(p => <label key={p.id} className={`cursor-pointer rounded-xl border p-4 ${p.id === planId ? "border-slate-900 ring-2 ring-slate-900" : ""}`}><input type="radio" name="plan" className="sr-only" checked={p.id === planId} onChange={() => setPlanId(p.id)} /><span className="block font-bold">{p.name}</span><span className="block text-lg">{baht(p.amountMinor)} {period(p.billingPeriod)}</span><span className="block text-sm text-slate-600">ใช้ได้ {p.deviceLimit} เครื่อง</span></label>)}</div></fieldset>
      <div className="flex flex-wrap gap-3">
        <button disabled={busy || !plan || !!pending} onClick={() => void checkout("promptpay")} className="rounded-full bg-slate-900 px-6 py-3 font-bold text-white disabled:opacity-50">จ่ายด้วย PromptPay</button>
        <button disabled={busy || !plan || !!pending} onClick={payByCard} className="rounded-full border border-slate-900 px-6 py-3 font-bold disabled:opacity-50">จ่ายด้วยบัตร</button>
      </div>
    </section>}
    {/* On a phone the QR is far below the plan list: bring it into view. */}
    {pending && <section ref={el => el?.scrollIntoView({ behavior: "smooth", block: "start" })} className="mt-6 rounded-2xl border bg-white p-6 text-center">
      {pending.qrImageUrl ? <><h2 className="text-xl font-bold">สแกนเพื่อจ่าย {plan ? baht(plan.amountMinor) : ""}</h2><img src={pending.qrImageUrl} alt="QR PromptPay" className="mx-auto mt-4 w-64" /><p className="mt-3 text-sm">ใช้แอปธนาคารใดก็ได้ QR หมดอายุ {pending.expiresAt ? new Date(pending.expiresAt).toLocaleTimeString("th-TH") : "ภายในเวลาที่กำหนด"}</p></> : <h2 className="text-xl font-bold">กำลังตรวจสอบการชำระเงิน…</h2>}
      <p className="mt-2 text-sm text-slate-600">หน้านี้จะอัปเดตเองเมื่อได้รับเงิน</p>
    </section>}
    {message && <p role="status" className="mt-6 rounded-xl bg-amber-50 p-4 text-sm">{message}</p>}
    {orders.length > 0 && <section className="mt-8"><h2 className="text-xl font-bold">ประวัติการชำระ</h2><table className="mt-3 w-full text-sm"><thead><tr className="text-left"><th className="py-2">วันที่</th><th>แพ็กเกจ</th><th>ยอด</th><th>สถานะ</th><th>ใช้ได้ถึง</th></tr></thead><tbody>{orders.map(o => <tr key={o.id} className="border-t"><td className="py-2">{date(o.paidAt ?? o.createdAt)}</td><td>{plans.find(p => p.id === o.planId)?.name ?? o.planId}</td><td>{baht(o.amountMinor)}</td><td>{o.status === "paid" ? "ชำระแล้ว" : o.status === "pending" ? "รอชำระ" : o.status}</td><td>{date(o.periodEnd)}</td></tr>)}</tbody></table></section>}
    <Link href="/account/koko-studio" className="mt-7 inline-block text-sm underline">กลับไป KOKO Studio ของคุณ</Link>
  </main>;
}
