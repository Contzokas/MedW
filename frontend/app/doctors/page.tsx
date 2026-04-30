"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { useTriageStream } from "@/app/lib/useTriageStream"
import { resolveApiBase, buildApiUrl } from "@/app/lib/backendResolver"
import { QueueEntry } from "@/app/lib/types"
import { useLang } from "@/app/lib/lang-context"
import { toCaps } from "@/app/lib/casing"

interface Doctor {
  name: string
  specialty: string
  availability: boolean
  fallback_note: string | null
  city: string | null
  lat: number | null
  lon: number | null
}

const MTS_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-red-500",    text: "text-red-500",    label: "Immediate"   },
  2: { bg: "bg-orange-500", text: "text-orange-500", label: "Very Urgent" },
  3: { bg: "bg-yellow-500", text: "text-yellow-500", label: "Urgent"      },
  4: { bg: "bg-green-500",  text: "text-green-500",  label: "Less Urgent" },
  5: { bg: "bg-blue-500",   text: "text-blue-500",   label: "Non-Urgent"  },
}

const QUEUE_MTS_LABELS: Record<number, string> = {
  1: "Immediate", 2: "Very Urgent", 3: "Urgent", 4: "Less Urgent", 5: "Non-Urgent",
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`triage-card rounded-2xl border border-primary/20 bg-card p-5 ${className ?? ""}`}>
      {children}
    </div>
  )
}

function Shimmer({ className }: { className?: string }) {
  return <div className={`skeleton rounded-xl animate-pulse ${className ?? "h-16"}`} />
}

export default function DoctorsPage() {
  const { lang } = useLang()
  const queueEntries = useTriageStream()

  const [doctors, setDoctors] = useState<Doctor[]>([])
  const [doctorsLoading, setDoctorsLoading] = useState(true)

  const [loggedInDoctor, setLoggedInDoctor] = useState<Doctor | null>(null)
  const [selectedDoctor, setSelectedDoctor] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    resolveApiBase()
      .then((base) => fetch(buildApiUrl(base, "/api/v1/doctors")))
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`)
        return res.json() as Promise<Doctor[]>
      })
      .then((data) => { if (!cancelled) { setDoctors(data); setDoctorsLoading(false) } })
      .catch(() => { if (!cancelled) setDoctorsLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setLoginError("")

    if (!selectedDoctor) {
      setLoginError(lang === "el" ? "Επιλέξτε γιατρό" : "Please select a doctor")
      return
    }
    if (password !== "password") {
      setLoginError(lang === "el" ? "Λάθος κωδικός" : "Wrong password")
      return
    }

    setLoginLoading(true)
    setTimeout(() => {
      const doc = doctors.find((d) => d.name === selectedDoctor)
      if (doc) {
        setLoggedInDoctor(doc)
      }
      setLoginLoading(false)
    }, 400)
  }

  const assignedPatients = useMemo(() => {
    if (!loggedInDoctor) return []
    return queueEntries.filter((e) =>
      e.doctor_name === loggedInDoctor.name
    )
  }, [queueEntries, loggedInDoctor])

  const groupedByLevel = useMemo(() => {
    const groups: Record<number, QueueEntry[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] }
    assignedPatients.forEach((p) => {
      if (groups[p.mts_level]) groups[p.mts_level].push(p)
    })
    return groups
  }, [assignedPatients])

  const handleLogout = () => {
    setLoggedInDoctor(null)
    setSelectedDoctor("")
    setPassword("")
    setLoginError("")
  }

  return (
    <div className="hero-section relative min-h-screen flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hero-orb-1 absolute w-[600px] h-[600px] rounded-full -top-32 -left-16" />
        <div className="hero-orb-2 absolute w-[480px] h-[480px] rounded-full -bottom-24 -right-16" />
      </div>

      <div className="relative flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full flex items-center justify-center border border-border/50 bg-card/60 backdrop-blur-md shadow-lg transition-colors hover:bg-card/80"
              aria-label="Back to home"
            >
              <svg className="w-[16px] h-[16px] text-foreground/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="text-xl font-bold text-foreground">
              MED<span className="logo-omega text-primary">Ω</span>
            </h1>
          </div>
          <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase hidden sm:block">
            {toCaps("Doctors Dashboard", lang)}
          </p>
        </div>

        {!loggedInDoctor ? (
          <div className="max-w-md mx-auto w-full">
            <Card className="p-6">
              <h2 className="text-base font-bold text-foreground mb-5 text-center">
                {lang === "el" ? "Σύνδεση Ιατρού" : "Doctor Login"}
              </h2>

              {doctorsLoading ? (
                <div className="space-y-4">
                  <Shimmer className="h-10" />
                  <Shimmer className="h-10" />
                  <Shimmer className="h-10" />
                </div>
              ) : (
                <form onSubmit={handleLogin} className="space-y-3.5">
                  <div>
                      <label htmlFor="doctor-select" className="block text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase mb-1.5">
                      {lang === "el" ? "Επιλέξτε Ιατρό" : "Select Doctor"}
                    </label>
                    <select
                      id="doctor-select"
                      value={selectedDoctor}
                      onChange={(e) => setSelectedDoctor(e.target.value)}
                      className="block w-full rounded-lg border border-border bg-card px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      <option value="">{lang === "el" ? "— Επιλέξτε —" : "— Select —"}</option>
                      {doctors.map((doc) => (
                        <option key={doc.name} value={doc.name}>
                          {doc.name} — {doc.specialty}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                      <label htmlFor="doctor-password" className="block text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase mb-1.5">
                      {lang === "el" ? "Κωδικός" : "Password"}
                    </label>
                    <input
                      id="doctor-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      placeholder="········"
                    />
                  </div>

                  {loginError && (
                    <p className="text-sm text-destructive font-medium text-center">{loginError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover transition-all shadow-md shadow-primary/20"
                  >
                    {loginLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {lang === "el" ? "Σύνδεση..." : "Logging in..."}
                      </span>
                    ) : (
                      lang === "el" ? "Σύνδεση" : "Login"
                    )}
                  </button>
                </form>
              )}
            </Card>
          </div>
        ) : (
          <>
            {/* Logged-in header */}
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-foreground">{loggedInDoctor.name}</p>
                   <p className="text-sm text-muted-foreground">
                    {loggedInDoctor.specialty}
                    {loggedInDoctor.city && ` · ${loggedInDoctor.city}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${loggedInDoctor.availability ? "text-success" : "text-destructive"}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${loggedInDoctor.availability ? "bg-success" : "bg-destructive"}`} />
                    {loggedInDoctor.availability ? (lang === "el" ? "Διαθέσιμος" : "Available") : (lang === "el" ? "Μη Διαθέσιμος" : "Unavailable")}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors font-semibold"
                  >
                    {lang === "el" ? "Αποσύνδεση" : "Logout"}
                  </button>
                </div>
              </div>
            </Card>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4, 5].map((level) => {
                const palette = MTS_COLORS[level] ?? MTS_COLORS[5]
                const count = groupedByLevel[level]?.length ?? 0
                return (
                  <Card key={level}>
                     <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase mb-1">
                      {lang === "el" ? `Επίπεδο ${level}` : `Level ${level}`}
                    </p>
                    <p className={`text-2xl font-black ${palette.text}`}>{count}</p>
                     <p className="text-xs text-muted-foreground mt-0.5">{palette.label}</p>
                  </Card>
                )
              })}
            </div>

            {/* Patient lists by urgency */}
            {[1, 2, 3, 4, 5].map((level) => {
              const patients = groupedByLevel[level] ?? []
              if (patients.length === 0) return null
              const palette = MTS_COLORS[level] ?? MTS_COLORS[5]
              return (
                <Card key={level}>
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${palette.bg}`} />
                     <p className="text-xs font-bold tracking-[0.15em] text-muted-foreground uppercase">
                      {QUEUE_MTS_LABELS[level]} ({patients.length})
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 px-2 text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Time</th>
                          <th className="text-left py-2 px-2 text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Patient ID</th>
                          <th className="text-left py-2 px-2 text-[11px] font-bold tracking-[0.15em] text-muted-foreground uppercase">Specialty</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((entry) => {
                          const date = new Date(entry.timestamp)
                          const time = Number.isNaN(date.getTime())
                            ? "—"
                            : date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                          return (
                            <tr key={`${entry.patient_id}-${entry.timestamp}`} className={`border-b border-border/40 ${level <= 2 ? "bg-destructive/5" : ""}`}>
                              <td className="py-1.5 px-2 text-sm text-muted-foreground font-mono whitespace-nowrap">{time}</td>
                              <td className="py-1.5 px-2 text-sm text-foreground font-mono">{entry.patient_id}</td>
                              <td className="py-1.5 px-2 text-sm text-foreground">{entry.specialty}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )
            })}

            {assignedPatients.length === 0 && (
              <Card>
                <p className="text-sm text-muted-foreground text-center py-8">
                  {lang === "el"
                    ? "Δεν υπάρχουν ασθενείς στην ειδικότητά σας αυτή τη στιγμή."
                    : "No patients in your specialty at the moment."}
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  )
}
