import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/bottom-nav";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "GymMate",
  description: "Connect with gym-goers, find trainers, and track your fitness.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="min-h-screen bg-background text-foreground flex flex-col">
        <main className="flex-1 overflow-y-auto pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
