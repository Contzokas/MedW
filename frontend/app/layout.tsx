import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/lib/theme-context";
import { LangProvider } from "@/app/lib/lang-context";
import ThemeToggle from "@/app/components/ThemeToggle";
import LangToggle from "@/app/components/LangToggle";
import SettingsLink from "@/app/components/SettingsLink";
import AnalyticsLink from "@/app/components/AnalyticsLink";
import EmergencyBar from "@/app/components/EmergencyBar";
import ErrorBoundary from "@/app/components/ErrorBoundary";
import { Toaster } from "react-hot-toast";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
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
              <LangToggle />
              <ThemeToggle />
              <AnalyticsLink />
              <SettingsLink />
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
