import { effectivePlanId, type License, type Plan, type Store } from "./types.ts";

/** Transactional service emails (trial ending, storage nearly full). Not marketing: only about the customer's own account. */
export type Mailer = { send(to: string, subject: string, html: string): Promise<void> };
export type NoticeKind = "expiry7" | "expiry1" | "ended" | "quota80" | "quota90";
const DAY = 86_400_000;
export const GRACE_DAYS = 14;
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Pure decision: which notices are due now (not yet sent). Quota notices only while the plan is active. */
export function dueNotices(license: Pick<License, "planExpiresAt" | "notified" | "planId">, usageBytes: number, quotaBytes: number, nowMs: number): NoticeKind[] {
  const sent = license.notified ?? {}; const due: NoticeKind[] = [];
  if (license.planId !== "free" && license.planExpiresAt) {
    const left = Date.parse(license.planExpiresAt) - nowMs;
    if (left <= 0) { if (-left < GRACE_DAYS * DAY && !sent.ended) due.push("ended"); }
    else {
      if (left <= 1 * DAY && !sent.expiry1) due.push("expiry1");
      else if (left <= 7 * DAY && !sent.expiry7 && !sent.expiry1) due.push("expiry7");
      if (quotaBytes > 0) {
        const ratio = usageBytes / quotaBytes;
        if (ratio >= 0.9 && !sent.quota90) due.push("quota90"); else if (ratio >= 0.8 && !sent.quota80 && !sent.quota90) due.push("quota80");
      }
    }
  } else if (license.planId !== "free" && quotaBytes > 0) {
    const ratio = usageBytes / quotaBytes;
    if (ratio >= 0.9 && !sent.quota90) due.push("quota90"); else if (ratio >= 0.8 && !sent.quota80 && !sent.quota90) due.push("quota80");
  }
  return due;
}
export function buildEmail(kind: NoticeKind, input: { planName: string; planExpiresAt?: string | null; usageBytes: number; quotaBytes: number; accountUrl: string }) {
  const url = esc(input.accountUrl);
  const gb = (n: number) => (n / 1024 ** 3).toFixed(1);
  const date = input.planExpiresAt ? new Date(input.planExpiresAt).toLocaleDateString("th-TH", { timeZone: "Asia/Bangkok", year: "numeric", month: "long", day: "numeric" }) : "";
  const t: Record<NoticeKind, [string, string]> = {
    expiry7: ["แพ็กเกจ KOKO Studio ของคุณจะหมดอายุใน 7 วัน", `แผน ${input.planName} จะสิ้นสุดวันที่ ${date} หลังจากนั้นบัญชีจะกลับเป็น Free โปรแกรมยังถ่ายและพิมพ์ได้ตามปกติ แต่รูปบนคลาวด์จะไม่ถูกเก็บต่อ กรุณาดาวน์โหลดรูปที่ต้องการเก็บไว้`],
    expiry1: ["แพ็กเกจ KOKO Studio ของคุณจะหมดอายุภายใน 1 วัน", `แผน ${input.planName} จะสิ้นสุดวันที่ ${date} กรุณาดาวน์โหลดรูปที่ต้องการเก็บไว้ก่อน หลังสิ้นสุดแผนรูปบนคลาวด์ยังโหลดได้อีก ${GRACE_DAYS} วัน แล้วจะถูกลบถาวร`],
    ended: ["แพ็กเกจ KOKO Studio สิ้นสุดแล้ว รูปบนคลาวด์โหลดได้อีกช่วงหนึ่ง", `บัญชีของคุณกลับเป็น Free แล้ว รูปบนคลาวด์ยังโหลดได้ภายใน ${GRACE_DAYS} วันนับจากวันสิ้นสุดแผน หลังจากนั้นจะถูกลบถาวรและกู้คืนไม่ได้ โปรดดาวน์โหลดรูปที่ต้องการเก็บ`],
    quota80: ["พื้นที่เก็บรูป KOKO Studio ใช้ไปแล้ว 80%", `ใช้ไป ${gb(input.usageBytes)} จาก ${gb(input.quotaBytes)} GB เมื่อเต็มโควตา ระบบจะไม่รับรูปใหม่จากตู้ ลบรูปที่ไม่ต้องการหรือดาวน์โหลดเก็บไว้ได้จากหน้าบัญชี`],
    quota90: ["พื้นที่เก็บรูป KOKO Studio ใกล้เต็ม (90%)", `ใช้ไป ${gb(input.usageBytes)} จาก ${gb(input.quotaBytes)} GB เมื่อเต็มโควตา ระบบจะไม่รับรูปใหม่จากตู้ กรุณาลบหรือดาวน์โหลดรูปเก่าเพื่อเว้นพื้นที่`],
  };
  const [subject, text] = t[kind];
  const html = `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#141516;line-height:1.7"><h2 style="margin:0 0 12px">${esc(subject)}</h2><p>${esc(text)}</p><p><a href="${url}" style="display:inline-block;background:#141516;color:#fff;padding:12px 20px;border-radius:999px;text-decoration:none">เปิดหน้าบัญชี KOKO Studio</a></p><p style="font-size:12px;color:#777">อีเมลนี้ส่งเพราะคุณใช้บริการ KOKO Studio Cloud เป็นการแจ้งเตือนเกี่ยวกับบัญชีของคุณ ติดต่อ kokomemory@gmail.com</p></div>`;
  return { subject, html };
}
export class NotificationService {
  private store: Store; private mailer: Mailer; private resolveEmail: (uid: string) => Promise<string | null>; private now: () => number; private origin: string;
  constructor(options: { store: Store; mailer: Mailer; resolveEmail: (uid: string) => Promise<string | null>; origin: string; now?: () => number }) {
    this.store = options.store; this.mailer = options.mailer; this.resolveEmail = options.resolveEmail; this.origin = options.origin; this.now = options.now ?? Date.now;
  }
  /** Idempotent: a notice is marked sent before sending (no duplicates on retries) and un-marked if sending fails. */
  async run() {
    const licenses = await this.store.list<License>("studioLicenses", undefined, 1000);
    let sent = 0, failed = 0;
    for (const license of licenses) {
      if (license.status !== "active" || !license.ownerUid || license.planId === "free") continue;
      const [plan, effective, usage] = await Promise.all([
        this.store.transaction(tx => tx.get<Plan>("studioPlans", license.planId)),
        this.store.transaction(tx => tx.get<Plan>("studioPlans", effectivePlanId(license, this.now()))),
        this.store.transaction(tx => tx.get<{ bytes: number }>("studioUsage", license.ownerUid as string)),
      ]);
      const active = effectivePlanId(license, this.now()) === license.planId;
      const quota = active && effective?.features.includes("cloud_sync") ? effective.photoStorageQuotaBytes ?? 0 : 0;
      const due = dueNotices(license, usage?.bytes ?? 0, quota, this.now());
      if (!due.length) {
        // Quota notices re-arm once usage drops well below the threshold.
        if (quota > 0 && (usage?.bytes ?? 0) / quota < 0.7 && (license.notified?.quota80 || license.notified?.quota90)) await this.mark(license.id, [], ["quota80", "quota90"]);
        continue;
      }
      const email = await this.resolveEmail(license.ownerUid).catch(() => null);
      if (!email) continue;
      for (const kind of due) {
        const claimed = await this.mark(license.id, [kind], []);
        if (!claimed) continue;
        try {
          const mail = buildEmail(kind, { planName: plan?.name ?? license.planId, planExpiresAt: license.planExpiresAt, usageBytes: usage?.bytes ?? 0, quotaBytes: quota, accountUrl: `${this.origin}/account/koko-studio` });
          await this.mailer.send(email, mail.subject, mail.html); sent += 1;
        } catch { await this.mark(license.id, [], [kind]); failed += 1; }
      }
    }
    return { sent, failed };
  }
  /** Returns false if another run already claimed every kind in `add`. */
  private async mark(licenseId: string, add: NoticeKind[], remove: NoticeKind[]) {
    return this.store.transaction(async tx => {
      const license = await tx.get<License>("studioLicenses", licenseId);
      if (!license) return false;
      const notified = { ...(license.notified ?? {}) };
      if (add.some(kind => notified[kind])) return false;
      for (const kind of add) notified[kind] = new Date(this.now()).toISOString();
      for (const kind of remove) delete notified[kind];
      tx.set("studioLicenses", licenseId, { ...license, notified });
      return true;
    });
  }
}
