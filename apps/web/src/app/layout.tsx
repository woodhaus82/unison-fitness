import type { Metadata } from "next";
import { Archivo_Black, Montserrat } from "next/font/google";
import "./globals.css";

const archivoBlack = Archivo_Black({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: "400",
});

const montserrat = Montserrat({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Unison Fitness",
  description: "Member portal for booking classes at Unison Fitness",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${archivoBlack.variable} ${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
