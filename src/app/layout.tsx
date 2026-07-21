import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import AppNavigation from "@/components/layout/AppNavigation";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saleks Transport System",
  description: "Internal transport management system for Saleks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="bg"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-200 text-slate-950">
        <div className="flex min-h-screen flex-col">
          <AppNavigation />

          <main className="flex-1">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}