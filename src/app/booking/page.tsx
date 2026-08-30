/**
 * ===========================================================
 * KOKO Memory
 * Booking Landing Page
 * ===========================================================
 *
 * หน้าที่
 * ---------------------
 * หน้าแรกของระบบจอง
 *
 * Flow
 * ---------------------
 * ลูกค้า
 * ↓
 * อ่านรายละเอียด
 * ↓
 * กด "เริ่มจอง"
 * ↓
 * ไปหน้าเลือกแพ็กเกจ
 *
 * TODO
 * ---------------------
 * [ ] Animation
 * [ ] Video Background
 * [ ] เชื่อม Analytics
 */

import Link from "next/link";
import { CalendarDays, CheckCircle2 } from "lucide-react";

export default function BookingPage() {
    return (
        <main className="min-h-screen bg-slate-50">

            {/* ==========================
               Hero
            ========================== */}

            <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-28 text-center">

                <span className="rounded-full bg-pink-100 px-5 py-2 text-sm font-semibold tracking-[0.25em] uppercase text-pink-600">

                    ONLINE BOOKING

                </span>

                <h1 className="mt-8 text-5xl font-black text-slate-900 md:text-7xl">

                    จองคิวออนไลน์

                </h1>

                <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600">

                    ระบบจองคิวของ KOKO Memory
                    ช่วยให้คุณสามารถเลือกแพ็กเกจ
                    ตรวจสอบวันว่าง
                    เลือกวันจัดงาน
                    และชำระเงินออนไลน์ได้ในอนาคต

                </p>

                <div className="mt-12 grid gap-5 md:grid-cols-2">

                    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow">

                        <CheckCircle2 className="text-green-500" />

                        <span>ตรวจสอบวันว่างอัตโนมัติ</span>

                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow">

                        <CheckCircle2 className="text-green-500" />

                        <span>เลือกแพ็กเกจได้ทันที</span>

                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow">

                        <CheckCircle2 className="text-green-500" />

                        <span>ออกใบเสนอราคาอัตโนมัติ</span>

                    </div>

                    <div className="flex items-center gap-3 rounded-2xl bg-white p-5 shadow">

                        <CheckCircle2 className="text-green-500" />

                        <span>รองรับชำระเงินออนไลน์</span>

                    </div>

                </div>

                <Link
                    href="/booking/package"
                    className="mt-16 flex items-center gap-3 rounded-full bg-pink-500 px-10 py-5 text-lg font-semibold text-white transition hover:scale-105 hover:bg-pink-400"
                >

                    <CalendarDays />

                    เริ่มจอง

                </Link>

            </section>

        </main>
    );
}