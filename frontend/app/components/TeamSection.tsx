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

const TEAM = [
  { id: 1, name: "Athanasios Neofytos", role: "UX/UI Designer", imgSrc: "https://i.pravatar.cc/150?u=6", gradient: AVATAR_GRADIENTS[0] },
  { id: 2, name: "Constantinos Tzokas", role: "AI Engineer", imgSrc: "https://avatars.githubusercontent.com/u/136539747?v=4", gradient: AVATAR_GRADIENTS[1] },
  { id: 3, name: "Dimitris Dimitriadis", role: "Backend Developer", imgSrc: "https://avatars.githubusercontent.com/u/39314198?v=4", gradient: AVATAR_GRADIENTS[2] },
  { id: 4, name: "Dimitris Papapmargaritis", role: "Frontend Developer", imgSrc: "https://media.licdn.com/dms/image/v2/D5603AQHYtaX_lXwxZg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1695826227699?e=1778716800&v=beta&t=74537WlWLLUuqU6sL0buWfH-1m92cYiEKH4Li8jYi4o", gradient: AVATAR_GRADIENTS[3] },
  { id: 5, name: "Orestis Bushpreni", role: "Data Scientist", imgSrc: "https://avatars.githubusercontent.com/u/77115711?v=4", gradient: AVATAR_GRADIENTS[4] },
  { id: 6, name: "Sotiris Paoadopoulos", role: "Product Manager", imgSrc: "https://media.licdn.com/dms/image/v2/D5603AQEthqn8o0dpiQ/profile-displayphoto-shrink_800_800/B56ZR6TNKdGoAg-/0/1737218644049?e=1778716800&v=beta&t=QIb6WVYngpobWbpcMIRtT7U0xfAS6WgBNgtzMS3O_tA", gradient: AVATAR_GRADIENTS[5] },
  { id: 7, name: "Stella Alousi", role: "UX/UI Designer", imgSrc: "https://media.licdn.com/dms/image/v2/D4D03AQHsQ0eBcG4hlA/profile-displayphoto-shrink_800_800/B4DZY.ZAGxHIAc-/0/1744803464330?e=1778716800&v=beta&t=hTNsLsMbeo8D9KQDy6voz_w2wZsveJriFTEhihWHG8M", gradient: AVATAR_GRADIENTS[6] },
]

export default function TeamSection() {
  const { t } = useLang()

  return (
    <section
      id="about"
      className="snap-section flex flex-col min-h-screen border-t border-border"
    >
      {/* Full-width logo header */}
      <div className="flex flex-col items-center justify-center pt-20 pb-12 px-4 border-b border-border">
        <h2 className="text-6xl sm:text-7xl font-black tracking-tight text-foreground select-none">
          MED<span className="logo-omega text-primary">Ω</span>
        </h2>
        <p className="mt-3 text-xs font-medium tracking-[0.15em] uppercase text-muted-foreground">
          {t.hero.subtitle}
        </p>
      </div>

      {/* Two-column grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Left: Project info */}
        <div
          id="about-content"
          className="flex flex-col justify-center px-8 sm:px-14 lg:px-20 py-16 lg:border-r border-border border-b lg:border-b-0"
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
          className="flex flex-col items-center justify-center px-8 sm:px-14 lg:px-20 py-16 bg-muted/20"
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-12 self-start lg:self-auto">
            {t.team.team}
          </p>

          <div className="flex flex-wrap justify-center gap-10 lg:gap-14 max-w-2xl">
            {TEAM.map(({ id, name, role, imgSrc, gradient }) => (
              <div key={id} className="group flex flex-col items-center gap-4 w-28 text-center cursor-default transition-all hover:-translate-y-1">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} p-1 shadow-xl shadow-primary/15 group-hover:shadow-primary/40 group-hover:scale-105`}
                  style={{ transition: "transform 220ms ease, box-shadow 320ms ease" }}
                >
                  <img src={imgSrc} alt={name} className="w-full h-full rounded-full object-cover bg-card shadow-inner" />
                </div>

                <div className="flex flex-col items-center gap-1.5 w-full mt-2">
                  <div className="text-sm font-semibold text-foreground/90 leading-tight">
                    {name}
                  </div>
                  <div className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                    {role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
