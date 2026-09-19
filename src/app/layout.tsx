import type { Metadata } from "next";
import "./globals.css";


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
          antialiased
        `}
      >

        {children}

      </body>

    </html>

  );

}
