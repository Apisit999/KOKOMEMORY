import type { PublicRelease } from "@/lib/studio/types";
const size = (bytes: number) => `${Math.max(1, Math.round(bytes / 1048576))} MB`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }) : "");
export function KokoStudioDownloadStatus({ release }: { release: PublicRelease | null }) {
  if (!release) return <div className="mt-5 border border-[#e8e8e6] bg-white p-5"><p className="font-bold">Windows installer ยังไม่พร้อมให้ดาวน์โหลด</p><p className="mt-2 text-sm text-[#5c5c5c]">เราจะเปิดลิงก์เมื่อผ่านการตรวจ production API, public key และขั้นตอนติดตั้ง/อัปเกรดแล้ว</p><p className="mt-3 text-sm text-[#5c5c5c]">macOS ยังไม่เปิดให้ดาวน์โหลด</p></div>;
  return <div className="mt-5 border border-[#e8e8e6] bg-white p-5">
    <p>เวอร์ชัน {release.version} · เผยแพร่ {date(release.publishedAt)} · {size(release.fileSize)} · Windows 10/11 (64-bit)</p>
    {release.notes.length > 0 && <ul className="mt-2 list-disc pl-5">{release.notes.map(note => <li key={note}>{note}</li>)}</ul>}
    <p className="mt-3 break-all text-sm">SHA-256: {release.sha256}</p>
    {/* A file download handled by a route handler, not a page: a plain anchor is intended. */}
    {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
    <a className="mt-4 inline-flex bg-[#151515] px-6 py-3.5 font-medium text-white" href="/api/studio/download?utm_source=koko-studio-page" rel="nofollow">ดาวน์โหลด Windows</a>
    <p className="mt-3 text-sm text-[#5c5c5c]">ตัวติดตั้งยังไม่ได้ลงนามดิจิทัล Windows อาจแสดงหน้าต่างเตือน SmartScreen: เลือก “More info” แล้ว “Run anyway” และตรวจ SHA-256 ให้ตรงกับด้านบนก่อนติดตั้ง</p>
    <p className="mt-2 text-sm text-[#5c5c5c]">macOS ยังไม่เปิดให้ดาวน์โหลด</p>
  </div>;
}
