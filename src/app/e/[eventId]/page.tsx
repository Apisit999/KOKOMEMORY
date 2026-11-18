import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ShareGallery from "@/components/studio/ShareGallery";

export const dynamic = "force-dynamic";

// Guests who cannot scan the QR type the short code printed under it. Same privacy as /s/[token].
export const metadata: Metadata = {
  title: "รับรูปด้วยรหัส | KOKO Memory",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function EventCodePage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  if (!/^[0-9a-f]{32}$/.test(eventId)) notFound();
  return <ShareGallery eventId={eventId} />;
}
