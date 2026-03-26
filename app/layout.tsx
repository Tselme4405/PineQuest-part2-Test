import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "Шалгалтын Хяналтын Систем",
  description: "AI-д суурилсан онлайн шалгалтын хяналтын тавцан",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" className={`${geist.variable} h-full`}>
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
