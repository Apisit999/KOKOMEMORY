"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
	onAuthStateChanged,
	sendEmailVerification,
	sendPasswordResetEmail,
	signOut,
	type User,
} from "firebase/auth";
import { Bell, CheckCircle2, LogOut, MailCheck, RefreshCw } from "lucide-react";

import { auth } from "@/lib/firebase";

const notificationStorageKey = "koko_admin_notifications";

export default function AdminSettingsPage() {
	const router = useRouter();
	const [user, setUser] = useState<User | null>(null);
	const [loading, setLoading] = useState(true);
	const [busy, setBusy] = useState("");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [notifications, setNotifications] = useState(true);

	useEffect(() => {
		const stored = window.localStorage.getItem(notificationStorageKey);
		if (stored !== null) {
			setNotifications(stored === "true");
		}

		return onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
			setLoading(false);
			if (!currentUser) router.replace("/admin/login");
		});
	}, [router]);

	function setNotificationPreference(value: boolean) {
		setNotifications(value);
		window.localStorage.setItem(notificationStorageKey, String(value));
	}

	async function runAction(
		action: "verify" | "reset" | "logout"
	) {
		if (!user) return;

		try {
			setBusy(action);
			setMessage("");
			setError("");

			if (action === "verify") {
				await sendEmailVerification(user);
				setMessage("ส่งอีเมลยืนยันตัวตนแล้ว");
			} else if (action === "reset" && user.email) {
				await sendPasswordResetEmail(auth, user.email);
				setMessage("ส่งอีเมลเปลี่ยนรหัสผ่านแล้ว");
			} else if (action === "logout") {
				await signOut(auth);
				router.replace("/admin/login");
			}
		} catch (cause) {
			setError(
				cause instanceof Error
					? cause.message
					: "ไม่สามารถดำเนินการได้"
			);
		} finally {
			setBusy("");
		}
	}

	if (loading) {
		return <main className="p-8 text-center text-slate-500">กำลังโหลดข้อมูลบัญชี...</main>;
	}

	if (!user) return null;

	return (
		<main className="mx-auto w-full max-w-4xl space-y-6">
			<header>
				<p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500">ADMIN SETTINGS</p>
				<h1 className="mt-2 text-3xl font-black text-slate-900">ตั้งค่าระบบ</h1>
				<p className="mt-1 text-sm text-slate-500">จัดการบัญชี Admin และการตั้งค่าพื้นฐาน</p>
			</header>

			{message && <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">{message}</div>}
			{error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}

			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<div className="flex items-center gap-3 border-b border-slate-100 pb-5">
					<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-500"><MailCheck size={21} /></div>
					<div>
						<h2 className="font-bold text-slate-900">ข้อมูลบัญชี</h2>
						<p className="text-sm text-slate-500">Firebase Authentication</p>
					</div>
				</div>
				<dl className="mt-5 grid gap-4 sm:grid-cols-2">
					<Info label="Email" value={user.email || "ไม่ระบุ"} />
					<Info label="UID" value={user.uid} />
					<Info label="สถานะ Email" value={user.emailVerified ? "ยืนยันแล้ว" : "ยังไม่ยืนยัน"} />
					<Info label="สถานะบัญชี" value="ใช้งานอยู่" />
				</dl>
				<div className="mt-5 flex flex-wrap gap-3">
					{!user.emailVerified && (
						<button type="button" onClick={() => runAction("verify")} disabled={Boolean(busy)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
							<MailCheck size={16} /> {busy === "verify" ? "กำลังส่ง..." : "ส่งอีเมลยืนยัน"}
						</button>
					)}
					<button type="button" onClick={() => runAction("reset")} disabled={Boolean(busy) || !user.email} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 disabled:opacity-50">
						<RefreshCw size={16} /> {busy === "reset" ? "กำลังส่ง..." : "ส่งอีเมลเปลี่ยนรหัสผ่าน"}
					</button>
				</div>
			</section>

			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<div className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-500"><Bell size={21} /></div>
						<div>
							<h2 className="font-bold text-slate-900">การแจ้งเตือน</h2>
							<p className="text-sm text-slate-500">ตั้งค่าบนเบราว์เซอร์นี้</p>
						</div>
					</div>
					<button type="button" role="switch" aria-checked={notifications} onClick={() => setNotificationPreference(!notifications)} className={`relative h-7 w-12 rounded-full transition ${notifications ? "bg-pink-500" : "bg-slate-300"}`}>
						<span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${notifications ? "left-6" : "left-1"}`} />
					</button>
				</div>
			</section>

			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
				<div className="flex items-center gap-3">
					<CheckCircle2 size={21} className="text-green-500" />
					<div>
						<h2 className="font-bold text-slate-900">System information</h2>
						<p className="text-sm text-slate-500">KOKO Memory Admin · Next.js</p>
					</div>
				</div>
				<button type="button" onClick={() => runAction("logout")} disabled={Boolean(busy)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600 disabled:opacity-50">
					<LogOut size={16} /> ออกจากระบบ
				</button>
			</section>
		</main>
	);
}

function Info({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-slate-50 p-4">
			<dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
			<dd className="mt-1 break-all text-sm font-semibold text-slate-700">{value}</dd>
		</div>
	);
}
