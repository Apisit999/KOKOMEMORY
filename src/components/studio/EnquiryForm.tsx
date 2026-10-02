"use client";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Mail, ArrowUpRight, CheckCircle2, LoaderCircle } from "lucide-react";
import { useI18n } from "@/i18n";

const options = [
  ["rental", "เช่า Photobooth", "Photobooth rental"],
  ["photobooth-software", "โปรแกรม Photobooth", "Photobooth software"],
  ["software", "ซอฟต์แวร์สำหรับธุรกิจ", "Business software"],
  ["3d-print", "ออกแบบ / พิมพ์ 3D", "3D design / printing"],
  ["other", "อื่น ๆ", "Other"],
];

export default function EnquiryForm() {
  const { locale } = useI18n();
  const params = useSearchParams();
  const en = locale === "en";
  const initial = params.get("service") ?? "other";
  const [service, setService] = useState(options.some(([id]) => id === initial) ? initial : "other");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [reference, setReference] = useState("");
  const words = en ? { eyebrow: "TELL US WHAT YOU HAVE IN MIND", title: "Let’s talk about your project.", intro: "Share a few details and our team will follow up with you.", name: "Your name", contact: "Phone or email", service: "Service", details: "What do you need? Add an event date, equipment or project details if relevant.", send: "Send enquiry", privacy: "We’ll use your details to respond to this enquiry.", sent: "Your enquiry has been received.", reference: "Reference", error: "We couldn’t send your enquiry. Please try again.", sending: "Sending…" } : { eyebrow: "เล่าให้เราฟังว่ากำลังมองหาอะไร", title: "มาคุยเรื่องงานของคุณ", intro: "ฝากรายละเอียดไว้ แล้วทีมงานจะติดต่อกลับ", name: "ชื่อของคุณ", contact: "เบอร์โทรหรืออีเมล", service: "บริการที่สนใจ", details: "ต้องการให้เราช่วยเรื่องอะไร? ระบุวันงาน อุปกรณ์ หรือรายละเอียดโปรเจกต์ได้", send: "ส่งคำขอให้ทีมงาน", privacy: "เราใช้ข้อมูลนี้เพื่อติดต่อกลับเกี่ยวกับคำขอของคุณ", sent: "รับคำขอของคุณแล้ว ทีมงานจะติดต่อกลับ", reference: "เลขอ้างอิง", error: "ส่งคำขอไม่สำเร็จ กรุณาลองอีกครั้ง", sending: "กำลังส่ง…" };
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("sending"); setReference("");
    try {
      const response = await fetch("/api/enquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, contact, service, details, website: (event.currentTarget.elements.namedItem("website") as HTMLInputElement | null)?.value ?? "" }) });
      const result = await response.json();
      if (!response.ok) throw new Error("SUBMIT_FAILED");
      setReference(result.reference || ""); setState("sent"); setName(""); setContact(""); setDetails("");
    } catch { setState("error"); }
  }
  return <section className="studio-enquiry studio-wrap"><div><p className="studio-eyebrow">{words.eyebrow}</p><h2>{words.title}</h2><p>{words.intro}</p><a href="mailto:kokomemory@gmail.com">kokomemory@gmail.com <ArrowUpRight size={15} /></a></div><form onSubmit={submit} aria-busy={state === "sending"}>
    {state === "sent" && <p role="status" className="studio-form-success"><CheckCircle2 size={18} />{words.sent}{reference && <> · {words.reference}: {reference.slice(0, 8).toUpperCase()}</>}</p>}
    {state === "error" && <p role="alert" className="studio-form-error">{words.error}</p>}
    <label className="studio-honeypot" aria-hidden="true" tabIndex={-1}>Website<input name="website" autoComplete="off" tabIndex={-1} /></label>
    <label>{words.name}<input required maxLength={100} autoComplete="name" value={name} onChange={e => setName(e.target.value)} /></label><label>{words.contact}<input required maxLength={160} autoComplete="off" value={contact} onChange={e => setContact(e.target.value)} /></label><label>{words.service}<select value={service} onChange={e => setService(e.target.value)}>{options.map(([id, th, english]) => <option key={id} value={id}>{en ? english : th}</option>)}</select></label><label>{words.details}<textarea required minLength={10} maxLength={3000} rows={5} value={details} onChange={e => setDetails(e.target.value)} /></label><button className="studio-button" type="submit" disabled={state === "sending"}>{state === "sending" ? <LoaderCircle size={17} className="animate-spin" /> : <Mail size={17} />}{state === "sending" ? words.sending : words.send}<ArrowUpRight size={17} /></button><small>{words.privacy}</small></form></section>;
}
