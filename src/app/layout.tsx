import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import brandLogo from "../../public/logo/logo.jpg";
import "./globals.css";
import I18nRoot from "@/components/layout/I18nRoot";

// Self-hosted at build time by next/font: crisp Thai + Latin on every phone, no layout shift, no request to Google for visitors.
const kokoSans = IBM_Plex_Sans_Thai({ subsets: ["thai", "latin"], weight: ["300", "400", "500", "600", "700"], display: "swap", variable: "--font-koko-thai" });


export const metadata: Metadata = {
  icons: {
    icon: { url: brandLogo.src, type: "image/jpeg" },
    apple: { url: brandLogo.src, type: "image/jpeg" },
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

    <html lang="th" className={kokoSans.variable}>

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
