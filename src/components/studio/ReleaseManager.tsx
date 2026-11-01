"use client";
import { useCallback, useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import type { ReleaseChecks, ReleaseRecord, StatsDaily } from "@/lib/studio/types";

type Stats = { from: string; to: string; days: StatsDaily[]; totals: { downloads: number; uniqueDownloaders: number; freeClaims: number; updateChecks: number }; updateChecksByVersion: Record<string, number> };
const gateLabels: [Exclude<keyof ReleaseChecks, "checksumVerified">, string][] = [
  ["productionApiVerified", "ตรวจ production API แล้ว"], ["publicKeyVerified", "ตรวจ public key แล้ว"],
  ["installerLifecycleVerified", "ทดสอบ ติดตั้ง/อัปเกรด/ถอนการติดตั้ง แล้ว"], ["approved", "ผู้รับผิดชอบอนุมัติแล้ว"],
];
const statusLabel = { draft: "ฉบับร่าง", published: "เผยแพร่แล้ว", withdrawn: "ถอนแล้ว" } as const;

export default function ReleaseManager() {
  const [releases, setReleases] = useState<ReleaseRecord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [baseOk, setBaseOk] = useState(true);
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState("");
  const [form, setForm] = useState({ version: "", channel: "stable", notes: "", minimumSupportedVersion: "" });

  const call = useCallback(async (path: string, init?: RequestInit) => {
    if (!auth.currentUser) throw new Error("unauthorized");
    const response = await fetch(`/api/studio/${path}`, { ...init, cache: "no-store", headers: { Authorization: `Bearer ${await auth.currentUser.getIdToken()}`, ...(init?.body ? { "Content-Type": "application/json" } : {}) } });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.code ?? "error");
    return body;
  }, []);
  const refresh = useCallback(async () => {
    const [list, summary] = await Promise.all([call("admin/releases"), call("admin/stats")]);
    setReleases(list.releases); setBaseOk(list.downloadBaseConfigured); setStats(summary);
  }, [call]);
  useEffect(() => { refresh().catch(() => setMessage("โหลดข้อมูลรุ่นไม่สำเร็จ")); }, [refresh]);

  async function act(version: string, payload: Record<string, unknown>, success: string) {
    setBusy(version); setMessage("");
    try { await call("admin/releases", { method: "POST", body: JSON.stringify({ version, ...payload }) }); await refresh(); setMessage(success); }
    catch (error) { setMessage(`ไม่สำเร็จ: ${(error as Error).message}`); }
    finally { setBusy(""); }
  }
  async function upload(version: string, file: File) {
    setBusy(version); setMessage("กำลังอัปโหลดไฟล์…");
    try {
      const { uploadUrl } = await call("admin/releases", { method: "POST", body: JSON.stringify({ action: "request-upload-url", version }) });
      const put = await fetch(uploadUrl, { method: "PUT", body: file });
      if (!put.ok) throw new Error(`upload_${put.status}`);
      setMessage("อัปโหลดแล้ว กด “ตรวจ checksum” ต่อ");
    } catch (error) { setMessage(`อัปโหลดไม่สำเร็จ: ${(error as Error).message} (ตรวจ CORS ของ R2 bucket)`); }
    finally { setBusy(""); }
  }
  async function create(event: React.FormEvent) {
    event.preventDefault();
    await act(form.version.trim(), { action: "create-draft", channel: form.channel, notes: form.notes.split("\n").map(n => n.trim()).filter(Boolean), ...(form.minimumSupportedVersion.trim() ? { minimumSupportedVersion: form.minimumSupportedVersion.trim() } : {}) }, "สร้างฉบับร่างแล้ว");
    setForm({ version: "", channel: "stable", notes: "", minimumSupportedVersion: "" });
  }
  const recent = stats?.days.slice(-14).reverse() ?? [];
  const input = "w-full rounded-xl border border-slate-300 px-3 py-2";

  return <section className="space-y-6" aria-label="Releases">
    <div className="rounded-3xl bg-white p-6">
      <h2 className="text-xl font-bold">สถิติ 30 วันล่าสุด</h2>
      {stats ? <>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{([["ดาวน์โหลด", stats.totals.downloads], ["ผู้ดาวน์โหลดไม่ซ้ำ (รายวัน)", stats.totals.uniqueDownloaders], ["ติดตั้งและรับสิทธิ์ Free", stats.totals.freeClaims], ["เช็กอัปเดต", stats.totals.updateChecks]] as const).map(([label, value]) => <div key={label} className="rounded-2xl bg-slate-50 p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-2xl font-black">{value}</dd></div>)}</dl>
        <table className="mt-5 w-full text-left text-sm"><thead><tr className="border-b text-xs text-slate-500"><th className="py-2">วัน</th><th>ดาวน์โหลด</th><th>ไม่ซ้ำ</th><th>รับสิทธิ์ Free</th><th>เช็กอัปเดต</th></tr></thead><tbody>{recent.map(row => <tr key={row.day} className="border-b"><td className="py-2">{row.day}</td><td>{Object.values(row.downloads).reduce((a, b) => a + b, 0)}</td><td>{row.uniqueDownloaders}</td><td>{row.freeClaims}</td><td>{Object.values(row.updateChecks).reduce((a, b) => a + b, 0)}</td></tr>)}</tbody></table>
        {Object.keys(stats.updateChecksByVersion).length > 0 && <p className="mt-4 text-sm text-slate-600">เวอร์ชันที่เช็กอัปเดต: {Object.entries(stats.updateChecksByVersion).map(([v, n]) => `${v} (${n})`).join(" · ")}</p>}
      </> : <p className="mt-3 text-sm text-slate-500">กำลังโหลด…</p>}
    </div>

    <div className="rounded-3xl bg-white p-6">
      <h2 className="text-xl font-bold">รุ่นของโปรแกรม (Releases)</h2>
      {!baseOk && <p role="alert" className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">ยังไม่ได้ตั้ง STUDIO_DOWNLOAD_BASE_URL (หรือ R2_PUBLIC_URL) จึงยังเผยแพร่รุ่นไม่ได้</p>}
      {message && <p role="status" className="mt-3 rounded-xl bg-slate-100 p-3 text-sm">{message}</p>}
      <form onSubmit={create} className="mt-4 grid gap-3 rounded-2xl bg-slate-50 p-4 sm:grid-cols-2">
        <label className="text-sm">เวอร์ชัน (เช่น 0.1.28)<input required pattern="\d+\.\d+\.\d+" className={input} value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} /></label>
        <label className="text-sm">Channel<select className={input} value={form.channel} onChange={e => setForm({ ...form, channel: e.target.value })}><option value="stable">stable</option><option value="beta">beta</option></select></label>
        <label className="text-sm sm:col-span-2">Release notes (หนึ่งบรรทัดต่อหนึ่งข้อ)<textarea rows={3} className={input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></label>
        <label className="text-sm">เวอร์ชันต่ำสุดที่ยังใช้ได้ (ว่าง = ไม่บังคับอัปเดต)<input pattern="\d+\.\d+\.\d+" className={input} value={form.minimumSupportedVersion} onChange={e => setForm({ ...form, minimumSupportedVersion: e.target.value })} /></label>
        <div className="flex items-end"><button disabled={Boolean(busy)} className="rounded-full bg-[#D93687] px-5 py-2.5 font-bold text-white disabled:opacity-50">สร้างฉบับร่าง</button></div>
      </form>
      <ul className="mt-5 space-y-4">{releases.map(release => <li key={release.version} className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-bold">v{release.version} <span className="text-sm font-normal text-slate-500">· {release.channel}</span></h3><span className="rounded-full bg-slate-100 px-3 py-1 text-sm">{statusLabel[release.status]}</span></div>
        <p className="mt-1 break-all text-xs text-slate-500">{release.fileKey}{release.sha256 && ` · ${release.fileSize} bytes · sha256 ${release.sha256}`}</p>
        <p className="mt-1 text-sm">ดาวน์โหลด {release.downloadCount} ครั้ง{release.minimumSupportedVersion && ` · บังคับอัปเดตถ้าต่ำกว่า ${release.minimumSupportedVersion}`}</p>
        {release.status === "draft" && <div className="mt-3 space-y-3">
          <div className="flex flex-wrap items-center gap-3"><input type="file" accept=".exe" aria-label={`ไฟล์ติดตั้ง ${release.version}`} disabled={busy === release.version} onChange={e => { const file = e.target.files?.[0]; if (file) void upload(release.version, file); }} />
            <button disabled={busy === release.version} onClick={() => act(release.version, { action: "verify" }, "ตรวจ checksum แล้ว")} className="rounded-full border px-4 py-2 text-sm font-bold">ตรวจ checksum</button></div>
          <p className="text-sm">{release.checks.checksumVerified ? "✓ server คำนวณ checksum จากไฟล์แล้ว" : "✗ ยังไม่ได้ตรวจ checksum"}</p>
          <div className="grid gap-1 text-sm">{gateLabels.map(([key, label]) => <label key={key} className="flex items-center gap-2"><input type="checkbox" checked={release.checks[key]} disabled={busy === release.version} onChange={e => act(release.version, { action: "set-checks", checks: { [key]: e.target.checked } }, "บันทึกแล้ว")} />{label}</label>)}</div>
          <button disabled={busy === release.version || !baseOk} onClick={() => window.confirm(`เผยแพร่ v${release.version} ให้ผู้ใช้ดาวน์โหลด?`) && act(release.version, { action: "publish" }, "เผยแพร่แล้ว")} className="rounded-full bg-[#111114] px-5 py-2.5 font-bold text-white disabled:opacity-50">เผยแพร่</button>
        </div>}
        {release.status === "published" && <button disabled={busy === release.version} onClick={() => window.confirm(`ถอน v${release.version}? ผู้ใช้จะไม่เห็นรุ่นนี้อีก และระบบจะกลับไปใช้รุ่นก่อนหน้า`) && act(release.version, { action: "withdraw" }, "ถอนรุ่นแล้ว")} className="mt-3 rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700">ถอนรุ่น</button>}
      </li>)}{releases.length === 0 && <li className="text-sm text-slate-500">ยังไม่มีรุ่น</li>}</ul>
    </div>
  </section>;
}
