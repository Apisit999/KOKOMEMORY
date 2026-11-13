import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Cormorant_Garamond, Noto_Serif_Thai } from "next/font/google";
import "./globals.css";
import I18nRoot from "@/components/layout/I18nRoot";

// Self-hosted at build time by next/font: crisp Thai + Latin on every phone, no layout shift, no request to Google for visitors.
const kokoSans = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700"], display: "swap", variable: "--font-koko-thai" });
// Display pair for headings: Latin serif + matching Thai serif.
const kokoDisplay = Cormorant_Garamond({ subsets: ["latin"], weight: ["400", "500", "600"], style: ["normal", "italic"], display: "swap", variable: "--font-koko-display" });
const kokoSerifThai = Noto_Serif_Thai({ subsets: ["thai", "latin"], weight: ["400", "500", "600"], display: "swap", variable: "--font-koko-serif-thai" });


export const metadata: Metadata = {
  icons: {
    icon: { url: "/logo/icon.svg", type: "image/svg+xml" },
    apple: { url: "/logo/apple-icon.png", type: "image/png" },
  },
  title: "KOKO Memory | Photobooth & Event",
  description:
    "KOKO Memory Photobooth & Event — เก็บทุกช่วงเวลาสำคัญให้กลายเป็นความทรงจำ",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (

    <html lang="th" className={`${kokoSans.variable} ${kokoDisplay.variable} ${kokoSerifThai.variable}`}>

      <body
        className={`
          antialiased
        `}
      >

        <I18nRoot>{children}</I18nRoot>

      </body>

    </html>

  );

}
