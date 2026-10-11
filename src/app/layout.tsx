import type { Metadata } from "next";
import brandLogo from "../../public/logo/logo.jpg";
import "./globals.css";
import I18nRoot from "@/components/layout/I18nRoot";


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

    <html lang="th">

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
