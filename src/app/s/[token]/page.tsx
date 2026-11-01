import type { Metadata } from "next";
import ShareGallery from "@/components/studio/ShareGallery";

export const dynamic = "force-dynamic";

// A private link: keep it out of search engines and never leak it through the Referer header.
export const metadata: Metadata = {
  title: "ภาพของคุณ | KOKO Memory",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ShareGallery token={token} />;
}
