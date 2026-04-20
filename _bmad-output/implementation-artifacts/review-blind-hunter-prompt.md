# Blind Hunter Review Prompt

**Role:** You are a cynical code reviewer conducting a blind review. You see ONLY the diff below — no spec, no context, no project access. Your job is to find problems, inconsistencies, and potential issues in the code changes.

## Diff to Review

```diff
diff --git a/frontend/app/components/Disclaimer.tsx b/frontend/app/components/Disclaimer.tsx
index 8e757f6..5ec1512 100644
--- a/frontend/app/components/Disclaimer.tsx
+++ b/frontend/app/components/Disclaimer.tsx
@@ -3,12 +3,12 @@ export default function Disclaimer() {
     <div
      role="note"
      aria-label="Σημαντική ιατρική ανακοίνωση"
-      className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-base"
+      className="mb-6 rounded-lg border border-warning bg-warning/10 p-4 text-base"
     >
-      <p className="font-semibold text-amber-900">
+      <p className="font-semibold text-warning">
         ⚠️ Σημαντική Ανακοίνωση
       </p>
-      <p className="mt-1 text-amber-800">
+      <p className="mt-1 text-foreground">
         Το MEDΩ είναι σύστημα τεχνητής νοημοσύνης για αρχική αξιολόγηση συμπτωμάτων
         και <strong>δεν αποτελεί κλινική διάγνωση</strong>. Τα αποτελέσματα είναι
         ενδεικτικά και δεν υποκαθιστούν τη γνώμη ιατρού. Σε περίπτωση επείγοντος,
diff --git a/frontend/app/components/DoctorCard.tsx b/frontend/app/components/DoctorCard.tsx
index 889669d..90e7f82 100644
--- a/frontend/app/components/DoctorCard.tsx
+++ b/frontend/app/components/DoctorCard.tsx
@@ -7,13 +7,13 @@ interface DoctorCardProps {
 
 export default function DoctorCard({ doctor, redirectUrl }: DoctorCardProps) {
   return (
-    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
-      <p className="text-base font-medium text-gray-500">Συνιστώμενος Ιατρός</p>
-      <p className="mt-1 text-lg font-semibold text-gray-900">{doctor.name}</p>
-      <p className="text-base text-gray-600">{doctor.specialty}</p>
+    <div className="rounded-lg border border-border bg-card p-4">
+      <p className="text-base font-medium text-muted-foreground">Συνιστώμενος Ιατρός</p>
+      <p className="mt-1 text-lg font-semibold text-foreground">{doctor.name}</p>
+      <p className="text-base text-foreground">{doctor.specialty}</p>
 
       {doctor.fallback_note !== null && (
-        <p className="mt-2 text-base text-amber-700">
+        <p className="mt-2 text-base text-warning">
           ℹ️ {doctor.fallback_note}
         </p>
       )}
 
@@ -22,7 +22,7 @@ export default function DoctorCard({ doctor, redirectUrl }: DoctorCardProps) {
         href={redirectUrl}
         target="_blank"
         rel="noopener noreferrer"
-        className="mt-3 inline-block text-base font-medium text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
+        className="mt-3 inline-block text-base font-medium text-primary underline hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900"
       >
         Βρείτε τον γιατρό στο finddoctors.gov.gr →
       </a>
diff --git a/frontend/app/components/TriageForm.tsx b/frontend/app/components/TriageForm.tsx
index af65769..833cdfd 100644
--- a/frontend/app/components/TriageForm.tsx
+++ b/frontend/app/components/TriageForm.tsx
@@ -36,7 +36,7 @@ export default function TriageForm({ onResult }: TriageFormProps) {
   return (
     <form onSubmit={handleSubmit} className="space-y-6">
       <div>
-        <label htmlFor="symptoms" className="block text-sm font-medium text-gray-700">
+        <label htmlFor="symptoms" className="block text-sm font-medium text-foreground">
           Συμπτώματα
         </label>
         <textarea
@@ -45,7 +45,7 @@ export default function TriageForm({ onResult }: TriageFormProps) {
           rows={4}
           required
           disabled={isLoading}
-          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 disabled:opacity-50 sm:text-sm"
+          className="mt-1 block w-full rounded-md border border-border px-3 py-2 text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-900 sm:text-sm bg-card"
           placeholder="Περιγράψτε τα συμπτώματά σας (π.χ. πόνος στο στήθος, δυσκολία αναπνοής)..."
           value={symptoms}
           onChange={(e) => setSymptoms(e.target.value)}
@@ -53,7 +53,7 @@ export default function TriageForm({ onResult }: TriageFormProps) {
       </div>
 
       {error && (
-        <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
+        <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive border border-destructive/20">
           {error}
         </div>
       )}
 
@@ -61,7 +61,7 @@ export default function TriageForm({ onResult }: TriageFormProps) {
       <button
         type="submit"
         disabled={isLoading}
-        className="w-full rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
+        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-900"
       >
         {isLoading ? "Ανάλυση σε εξέλιξη..." : "Εκτίμηση Συμπτωμάτων"}
       </button>
diff --git a/frontend/app/components/TriageResult.tsx b/frontend/app/components/TriageResult.tsx
index 91f03b9..cfe595a 100644
--- a/frontend/app/components/TriageResult.tsx
+++ b/frontend/app/components/TriageResult.tsx
@@ -29,27 +29,27 @@ export default function TriageResult({ result }: TriageResultProps) {
           {result.mts_level}
         </span>
         <div>
-          <p className="text-base font-medium uppercase tracking-wide text-gray-500">
+          <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
             Επίπεδο Επείγοντος (MTS)
           </p>
-          <p className="text-2xl font-bold text-gray-900">{result.mts_label}</p>
+          <p className="text-2xl font-bold text-foreground">{result.mts_label}</p>
         </div>
       </div>
 
       <div>
-        <p className="text-base font-medium uppercase tracking-wide text-gray-500">
+          <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
           Συνιστώμενη Ειδικότητα
         </p>
-        <p className="mt-1 text-lg font-semibold text-gray-900">{result.specialty}</p>
+        <p className="mt-1 text-lg font-semibold text-foreground">{result.specialty}</p>
       </div>
 
       <DoctorCard doctor={result.doctor} redirectUrl={result.redirect_url} />
 
       <div>
-        <p className="text-base font-medium uppercase tracking-wide text-gray-500">
+          <p className="text-base font-medium uppercase tracking-wide text-muted-foreground">
           Αιτιολόγηση
         </p>
-        <p className="mt-1 text-base text-gray-700 leading-relaxed">{result.reasoning}</p>
+        <p className="mt-1 text-base text-foreground leading-relaxed">{result.reasoning}</p>
       </div>
     </div>
   )
diff --git a/frontend/app/dashboard/components/TriageQueue.tsx b/frontend/app/dashboard/components/TriageQueue.tsx
index 6d1d96f..4d7bcd4 100644
--- a/frontend/app/dashboard/components/TriageQueue.tsx
+++ b/frontend/app/dashboard/components/TriageQueue.tsx
@@ -7,28 +7,28 @@ export default function TriageQueue() {
   const entries = useTriageStream()
 
   return (
-    <div className="bg-white shadow rounded-lg overflow-hidden">
-      <table className="min-w-full divide-y divide-gray-200">
-        <thead className="bg-gray-100">
+        <div className="bg-card shadow rounded-lg overflow-hidden border border-border">
+        <table className="min-w-full divide-y divide-border">
+        <thead className="bg-muted">
           <tr>
-            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
+            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
               Ώρα (Τοπική)
             </th>
-            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
+            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
               ID Ασθενούς
             </th>
-            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
+            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
               Επίπεδο MTS
             </th>
-            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
+            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
               Ειδικότητα
             </th>
           </tr>
         </thead>
-        <tbody className="bg-white divide-y divide-gray-200">
+        <tbody className="bg-card divide-y divide-border">
           {entries.length === 0 ? (
             <tr>
-              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
+              <td colSpan={4} className="px-6 py-4 text-center text-sm text-muted-foreground">
                 Η ουρά είναι άδεια. Δεν υπάρχουν νέα περιστατικά.
              </td>
             </tr>
diff --git a/frontend/app/dashboard/components/TriageQueueItem.tsx b/frontend/app/dashboard/components/TriageQueueItem.tsx
index 7442908..3d6971f 100644
--- a/frontend/app/dashboard/components/TriageQueueItem.tsx
+++ b/frontend/app/dashboard/components/TriageQueueItem.tsx
@@ -23,7 +23,7 @@ const MTS_COLORS: Record<number, string> = {
 export default function TriageQueueItem({ entry }: TriageQueueItemProps) {
   const badgeClass = MTS_COLORS[entry.mts_level] ?? "bg-gray-500 text-white"
   const label = MTS_LABELS[entry.mts_level] ?? `Επίπεδο ${entry.mts_level}`
-  const rowClass = entry.mts_level <= 2 ? "bg-red-50" : "bg-white"
+  const rowClass = entry.mts_level <= 2 ? "bg-destructive/10" : "bg-card"
   const patientId = entry.patient_id.slice(0, 8)
 
   const parsedDate = new Date(entry.timestamp)
@@ -33,10 +33,10 @@ export default function TriageQueueItem({ entry }: TriageQueueItemProps) {
 
   return (
     <tr className={rowClass}>
-      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
+      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
         {formattedTime}
       </td>
-      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
+      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
         {patientId}...
       </td>
       <td className="px-6 py-4 whitespace-nowrap">
@@ -47,7 +47,7 @@ export default function TriageQueueItem({ entry }: TriageQueueItemProps) {
           {label}
         </span>
       </td>
-      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
+      <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
         {entry.specialty}
      </td>
     </tr>
diff --git a/frontend/app/dashboard/page.tsx b/frontend/app/dashboard/page.tsx
index 1c682a8..8b2cb90 100644
--- a/frontend/app/dashboard/page.tsx
+++ b/frontend/app/dashboard/page.tsx
@@ -2,9 +2,9 @@ import TriageQueue from "@/app/dashboard/components/TriageQueue"
 
 export default function Dashboard() {
   return (
-    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
+    <div className="min-h-screen bg-muted flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full">
-        <h1 className="text-3xl font-bold text-gray-900 mb-8 border-b pb-4">
+        <h1 className="text-3xl font-bold text-foreground mb-8 border-b border-border pb-4">
           Πίνακας Ελέγχου Νοσηλευτών
         </h1>
        <TriageQueue />
diff --git a/frontend/app/globals.css b/frontend/app/globals.css
index a2dc41e..5abd525 100644
--- a/frontend/app/globals.css
+++ b/frontend/app/globals.css
@@ -3,11 +3,34 @@
 :root {
   --background: #ffffff;
   --foreground: #171717;
+  --primary: #2563eb;
+  --primary-hover: #1d4ed8;
+  --muted: #f3f4f6;
+  --muted-foreground: #6b7280;
+  --border: #e5e7eb;
+  --card: #ffffff;
+  --card-foreground: #171717;
+  --destructive: #dc2626;
+  --destructive-foreground: #ffffff;
+  --success: #16a34a;
+  --warning: #ca8a04;
+  --info: #0891b2;
 }
 
 @theme inline {
   --color-background: var(--background);
   --color-foreground: var(--foreground);
+  --color-primary: var(--primary);
+  --color-muted: var(--muted);
+  --color-muted-foreground: var(--muted-foreground);
+  --color-border: var(--border);
+  --color-card: var(--card);
+  --color-card-foreground: var(--card-foreground);
+  --color-destructive: var(--destructive);
+  --color-destructive-foreground: var(--destructive-foreground);
+  --color-success: var(--success);
+  --color-warning: var(--warning);
+  --color-info: var(--info);
   --font-sans: var(--font-geist-sans);
   --font-mono: var(--font-geist-mono);
 }
@@ -16,9 +39,55 @@
   :root {
     --background: #0a0a0a;
     --foreground: #ededed;
+    --primary: #3b82f6;
+    --primary-hover: #60a5fa;
+    --muted: #1f2937;
+    --muted-foreground: #9ca3af;
+    --border: #374151;
+    --card: #1f2937;
+    --card-foreground: #ededed;
+    --destructive: #ef4444;
+    --destructive-foreground: #ffffff;
+    --success: #22c55e;
+   --warning: #eab308;
+    --info: #06b6d4;
   }
 }
 
+[data-theme="light"] {
+  --background: #ffffff;
+  --foreground: #171717;
+  --primary: #2563eb;
+  --primary-hover: #1d4ed8;
+  --muted: #f3f4f6;
+  --muted-foreground: #6b7280;
+  --border: #e5e7eb;
+  --card: #ffffff;
+  --card-foreground: #171717;
+  --destructive: #dc2626;
+  --destructive-foreground: #ffffff;
+  --success: #16a34a;
+  --warning: #ca8a04;
+  --info: #0891b2;
+}
+
+[data-theme="dark"] {
+  --background: #0a0a0a;
+  --foreground: #ededed;
+  --primary: #3b82f6;
+  --primary-hover: #60a5fa;
+  --muted: #1f2937;
+  --muted-foreground: #9ca3af;
+  --border: #374151;
+  --card: #1f2937;
+  --card-foreground: #ededed;
+  --destructive: #ef4444;
+  --destructive-foreground: #ffffff;
+  --success: #22c55e;
+  --warning: #eab308;
+  --info: #06b6d4;
+}
+
 body {
   background: var(--background);
   color: var(--foreground);
diff --git a/frontend/app/layout.tsx b/frontend/app/layout.tsx
index 3ff85f5..a2677b6 100644
--- a/frontend/app/layout.tsx
+++ b/frontend/app/layout.tsx
@@ -1,6 +1,8 @@
 import type { Metadata } from "next";
 import { Geist, Geist_Mono } from "next/font/google";
 import "./globals.css";
+import { ThemeProvider } from "@/app/lib/theme-context";
+import ThemeToggle from "@/app/components/ThemeToggle";
 
 const geistSans = Geist({
   variable: "--font-geist-sans",
@@ -27,7 +29,21 @@ export default function RootLayout({
       lang="el"
       className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
     >
-      <body className="min-h-full flex flex-col">{children}</body>
+      <body className="min-h-full flex flex-col">
+        <ThemeProvider>
+          <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
+            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
+              <div className="flex h-16 items-center justify-between">
+                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
+                  MEDΩ
+                </h1>
+                <ThemeToggle />
+              </div>
+            </div>
+          </header>
+          <main className="flex-1">{children}</main>
+        </ThemeProvider>
+      </body>
    </html>
   );
 }
diff --git a/frontend/app/page.tsx b/frontend/app/page.tsx
index 033711a..e265854 100644
--- a/frontend/app/page.tsx
+++ b/frontend/app/page.tsx
@@ -9,24 +9,22 @@ export default function Home() {
   const [result, setResult] = useState<TriageResponse | null>(null)
 
   return (
-    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white py-12 px-4 sm:px-6 lg:px-8">
+    <main className="flex min-h-screen flex-col items-center justify-center bg-muted py-12 px-4 sm:px-6 lg:px-8">
       <div className="w-full max-w-3xl">
         <div className="mb-10 text-center">
-          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
-            <button
-              onClick={() => setResult(null)}
-              className="hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-600 rounded-lg"
-              title="Επιστροφή στην αρχική"
-            >
-              MED<span className="text-blue-600">Ω</span>
-            </button>
-          </h1>
-          <p className="mt-6 text-xl font-medium text-slate-700">
+          <button
+            onClick={() => setResult(null)}
+            className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-4 focus-visible:ring-primary rounded-lg"
+            title="Επιστροφή στην αρχική"
+          >
+            MED<span className="text-primary">Ω</span>
+          </button>
+          <p className="mt-6 text-xl font-medium text-foreground">
            Έξυπνο σύστημα αξιολόγησης συμπτωμάτων και καθοδήγησης
          </p>
         </div>
 
-        <div className="overflow-hidden rounded-3xl bg-white p-8 shadow-2xl ring-1 ring-slate-200 sm:p-12 transition-all duration-300">
+        <div className="overflow-hidden rounded-3xl bg-card p-8 shadow-2xl ring-1 ring-border sm:p-12 transition-all duration-300">
           {result === null ? (
             <TriageForm onResult={setResult} />
           ) : (
@@ -34,11 +32,11 @@ export default function Home() {
           )}
        </div>
 
-        <div className="mt-10 rounded-2xl border-2 border-red-200 bg-red-50 p-6 text-center shadow-sm">
-          <p className="text-lg font-medium text-red-900">
+        <div className="mt-10 rounded-2xl border-2 border-destructive/20 bg-destructive/10 p-6 text-center shadow-sm">
+          <p className="text-lg font-medium text-destructive">
             Σε περίπτωση απειλητικής για τη ζωής ανάγκης, καλέστε αμέσως το
          </p>
-          <p className="mt-2 text-4xl font-black tracking-widest text-red-700">
+          <p className="mt-2 text-4xl font-black tracking-widest text-destructive">
             166
           </p>
         </div>
```

## New Files

### frontend/app/lib/theme-context.tsx
```tsx
"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark"

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light")
  const [mounted, setMounted] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem("theme") as Theme | null
    if (stored) {
      setTheme(stored)
    } else {
      const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      setTheme(systemPrefersDark ? "dark" : "light")
    }
    setMounted(true)
  }, [])

  // Apply theme to document and localStorage
  useEffect(() => {
    if (mounted) {
      document.documentElement.setAttribute("data-theme", theme)
      localStorage.setItem("theme", theme)
    }
  }, [theme, mounted])

  // Listen for system preference changes
  useEffect(() => {
    if (mounted && !localStorage.getItem("theme")) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? "dark" : "light")
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [mounted])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context
}
```

### frontend/app/components/ThemeToggle.tsx
```tsx
"use client"

import { useTheme } from "@/app/lib/theme-context"

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full p-2 transition-colors hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? (
        // Moon icon for dark mode
        <svg
          className="h-5 w-5 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      ) : (
        // Sun icon for light mode
        <svg
          className="h-5 w-5 text-gray-200"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      )}
    </button>
  )
}
```

## Instructions

Review the code changes above and identify:

1. **Logical inconsistencies** - Does the code make sense? Are there contradictions?
2. **Missing pieces** - What seems incomplete or broken?
3. **Potential bugs** - What could fail at runtime?
4. **Code quality issues** - Poor patterns, anti-patterns, maintainability concerns
5. **Security concerns** - Any obvious vulnerabilities?
6. **Performance issues** - Inefficient approaches or potential problems

Focus on being adversarial and finding real problems, not being helpful or explaining why things might work. Assume the code is wrong until proven otherwise.

Return your findings as a structured list with:
- **Finding**: Clear description of the problem
- **Severity**: Critical/High/Medium/Low
- **Evidence**: Specific code location or logic flaw
- **Impact**: What could go wrong

Be thorough but concise. Don't repeat the same finding multiple times.