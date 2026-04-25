import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/app/lib/theme-context";
import { LangProvider } from "@/app/lib/lang-context";
import ThemeToggle from "@/app/components/ThemeToggle";
import LangToggle from "@/app/components/LangToggle";
import EmergencyBar from "@/app/components/EmergencyBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MEDΩ - Triage System",
  description: "AI-powered symptom assessment and guidance system",
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
        <ThemeProvider>
          <LangProvider>
            {/* Floating controls — top right */}
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
              <LangToggle />
              <ThemeToggle />
            </div>

            <main className="flex-1 flex flex-col">{children}</main>

            <EmergencyBar />
          </LangProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
