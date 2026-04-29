import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/lib/theme-context";
import { LangProvider } from "@/app/lib/lang-context";
import ThemeToggle from "@/app/components/ThemeToggle";
import LangToggle from "@/app/components/LangToggle";
import DoctorsLink from "@/app/components/DoctorsLink";
import HistoryToggle from "@/app/components/HistoryToggle";
import ManagementLink from "@/app/components/ManagementLink";
import EmergencyBar from "@/app/components/EmergencyBar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { Toaster } from "react-hot-toast";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEDΩ - AI Triage System",
  description: "Intelligent AI system for symptom assessment and triage",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MEDΩ",
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0b18" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:left-4 bg-primary text-white px-4 py-2 rounded shadow outline-none ring-2 ring-offset-2 ring-primary"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <LangProvider>
            {/* Floating controls — top right */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
              <DoctorsLink />
              <LangToggle />
              <ThemeToggle />
              <Suspense fallback={<div className="w-11 h-11" />}>
                <HistoryToggle />
              </Suspense>
              <ManagementLink />
            </div>

            <ErrorBoundary>
              <Toaster position="top-right" />
              <main id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
                {children}
              </main>
            </ErrorBoundary>

            <EmergencyBar />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
