"use client"

import { useLang } from "@/app/lib/lang-context"

const AVATAR_GRADIENTS = [
  "from-blue-400 to-blue-600",
  "from-indigo-400 to-blue-500",
  "from-sky-400 to-indigo-500",
  "from-blue-500 to-cyan-500",
  "from-indigo-500 to-blue-600",
  "from-cyan-400 to-blue-500",
  "from-blue-400 to-indigo-600",
]

const TEAM = AVATAR_GRADIENTS.map((gradient, i) => ({ id: i + 1, gradient }))

export default function TeamSection() {
  const { t } = useLang()

  return (
    <section
      id="about"
      className="snap-section grid grid-cols-1 lg:grid-cols-2 min-h-screen border-t border-border"
    >
      {/* Left: Project info */}
      <div
        id="about-content"
        className="flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-24 lg:border-r border-border border-b lg:border-b-0"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">
          {t.team.about}
        </p>

        <div className="space-y-3 mb-8">
          <div className="h-9 w-3/4 rounded-lg bg-muted" />
          <div className="h-9 w-1/2 rounded-lg bg-muted/60" />
        </div>

        <div className="space-y-2 mb-6">
          {[100, 90, 95, 80, 88].map((w, i) => (
            <div key={i} className="h-3.5 rounded bg-muted/50" style={{ width: `${w}%` }} />
          ))}
        </div>
        <div className="space-y-2 mb-10">
          {[92, 85, 70].map((w, i) => (
            <div key={i} className="h-3.5 rounded bg-muted/40" style={{ width: `${w}%` }} />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {["AI Triage", "FastAPI", "Next.js", "Run:ai", "Ollama", "K8s"].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Right: Team wall */}
      <div
        id="team"
        className="flex flex-col items-center justify-center px-8 sm:px-14 lg:px-20 py-24 bg-muted/20"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-12 self-start lg:self-auto">
          {t.team.team}
        </p>

        <div className="flex flex-wrap justify-center gap-10">
          {TEAM.map(({ id, gradient }) => (
            <div key={id} className="group flex flex-col items-center gap-4 w-28">
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} p-[3px] shadow-xl shadow-primary/15 group-hover:shadow-primary/40 group-hover:scale-105`}
                style={{ transition: "transform 220ms ease, box-shadow 320ms ease" }}
              >
                <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                  <span className="text-2xl font-light text-muted-foreground/25">?</span>
                </div>
              </div>

              <div className="flex flex-col items-center gap-2 w-full">
                <div className="h-3 w-full rounded-full bg-muted" />
                <div className="h-2.5 w-2/3 rounded-full bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
