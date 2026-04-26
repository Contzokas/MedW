"use client"

import { useLang } from "@/app/lib/lang-context"
import Image from "next/image"

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
  { id: 1, nameKey: "athanasios", roleKey: "ux", imgSrc: "https://i.pravatar.cc/150?u=6", gradient: AVATAR_GRADIENTS[0], socials: { linkedin: "https://www.linkedin.com/in/athanasios-neofytos-7a10a92a0/", github: "https://github.com/Thanoufrios" } },
  { id: 2, nameKey: "constantinos", roleKey: "ai", imgSrc: "https://avatars.githubusercontent.com/u/136539747?v=4", gradient: AVATAR_GRADIENTS[1], socials: { linkedin: "https://www.linkedin.com/in/constantinos-tzokas/", github: "https://github.com/Contzokas"} },
  { id: 3, nameKey: "dimitrisD", roleKey: "backend", imgSrc: "https://avatars.githubusercontent.com/u/77115711?v=4", gradient: AVATAR_GRADIENTS[2], socials: { linkedin: "https://www.linkedin.com/in/dimitrios-dimitriadis-40111a309/", github: "https://github.com/dimitriadisdim" } },
  { id: 4, nameKey: "dimitrisP", roleKey: "frontend", imgSrc: "/team/mitsos.jpeg", gradient: AVATAR_GRADIENTS[3], socials: { linkedin: "https://www.linkedin.com/in/dimitris-papamargaritis-4065a028b/", github: "https://github.com/DimitrisPapamargaritis" } },
  { id: 5, nameKey: "orestis", roleKey: "infra", imgSrc: "https://avatars.githubusercontent.com/u/39314198?v=4", gradient: AVATAR_GRADIENTS[4], socials: { linkedin: "https://www.linkedin.com/in/bushpreni/", github: "https://github.com/itsmeorestis" } },
  { id: 6, nameKey: "sotiris", roleKey: "data_eng", imgSrc: "/team/sotiris.jpeg", gradient: AVATAR_GRADIENTS[5], socials: { linkedin: "https://www.linkedin.com/in/sotiris-papadopoulos-5627642b1/", github: "https://github.com/Sotirispapad" } },
  { id: 7, nameKey: "stella", roleKey: "pm", imgSrc: "/team/stella.jpeg", gradient: AVATAR_GRADIENTS[6], socials: { linkedin: "https://www.linkedin.com/in/stellaalousi/", github: "https://github.com/stellalousi" } },
] as const

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
            <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {t.team.projectTitle}
            </h3>
          </div>

          <div className="space-y-4 mb-10 text-muted-foreground text-sm sm:text-base leading-relaxed max-w-2xl">
            <p>{t.team.projectBody1}</p>
            <p>{t.team.projectBody2}</p>
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
            {TEAM.map(({ id, nameKey, roleKey, imgSrc, gradient, socials }) => (
              <div key={id} className="group flex flex-col items-center gap-4 w-28 text-center cursor-default transition-all hover:-translate-y-1">
                <div
                  className={`w-24 h-24 rounded-full bg-gradient-to-br ${gradient} p-1 shadow-xl shadow-primary/15 group-hover:shadow-primary/40 group-hover:scale-105`}
                  style={{ transition: "transform 220ms ease, box-shadow 320ms ease" }}
                >
                  <img src={imgSrc} alt={t.team.members[nameKey]} className="w-full h-full rounded-full object-cover bg-card shadow-inner" />
                </div>

                <div className="flex flex-col items-center gap-1.5 w-full mt-2">
                  <div className="text-sm font-semibold text-foreground/90 leading-tight">
                    {t.team.members[nameKey]}
                  </div>
                  <div className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                    {t.team.roles[roleKey]}
                  </div>
                  
                  {/* Social Links */}
                  <div className="flex gap-2.5 mt-1.5">
                    {socials.linkedin !== "" && (
                      <a href={socials.linkedin} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-[#0A66C2] transition-colors" aria-label={`LinkedIn ${t.team.members[nameKey]}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect width="4" height="12" x="2" y="9"></rect><circle cx="4" cy="4" r="2"></circle></svg>
                      </a>
                    )}
                    {socials.github !== "" && (
                      <a href={socials.github} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label={`GitHub ${t.team.members[nameKey]}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
                      </a>
                    )}
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
