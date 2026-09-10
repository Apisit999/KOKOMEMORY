import type { Metadata } from "next";
import {
  Noto_Sans_Thai,
  Noto_Serif_Thai,
} from "next/font/google";

import "./globals.css";


const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});


const notoSerifThai = Noto_Serif_Thai({
  variable: "--font-noto-serif-thai",
  subsets: ["thai", "latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});


export const metadata: Metadata = {
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

    <html lang="th">

      <body
        className={`
          ${notoSansThai.variable}
          ${notoSerifThai.variable}
          antialiased
        `}
      >

        {children}

      </body>

    </html>

  );

}