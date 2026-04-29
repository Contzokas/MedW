"use client"

import { useState, useEffect } from "react"
import { usePWA } from "@/app/lib/usePWA"
import { useLang } from "@/app/lib/lang-context"

const DISMISS_KEY = "medw_install_dismissed"

export default function InstallPrompt() {
  const { canInstall, isInstalled, isIOS, install } = usePWA()
  const { lang } = useLang()
  const [dismissed, setDismissed] = useState(true) // start hidden, check storage
  const [iosHintShown, setIosHintShown] = useState(false)

  useEffect(() => {
    try {
      const d = localStorage.getItem(DISMISS_KEY)
      setDismissed(!!d)
    } catch {
      setDismissed(true)
    }
  }, [])

  // Show iOS safari hint once per session
  useEffect(() => {
    if (isIOS && !dismissed) {
      const t = setTimeout(() => setIosHintShown(true), 1200)
      return () => clearTimeout(t)
    }
  }, [isIOS, dismissed])

  const dismiss = () => {
    setDismissed(true)
    setIosHintShown(false)
    try { localStorage.setItem(DISMISS_KEY, "1") } catch { /* noop */ }
  }

  const copy = {
    en: {
      title: "Install MEDΩ",
      body: "Add to your home screen for the best experience.",
      install: "Install",
      iosBody: 'Tap the Share button then "Add to Home Screen".',
    },
    el: {
      title: "Εγκατάσταση MEDΩ",
      body: "Προσθέστε στην αρχική οθόνη για καλύτερη εμπειρία.",
      install: "Εγκατάσταση",
      iosBody: 'Πατήστε "Κοινοποίηση" και μετά "Προσθήκη στην οθόνη Αρχικής".',
    },
  }[lang]

  // Don't render if already installed or dismissed
  if (isInstalled || dismissed) return null

  // Android / Chrome — native prompt
  if (canInstall) {
    return (
      <div
        role="complementary"
        aria-label={copy.title}
        className="install-prompt-bar"
      >
        <div className="install-prompt-inner">
          {/* Icon */}
          <div className="install-prompt-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
              <path d="M12 8v8M8 12l4 4 4-4" />
            </svg>
          </div>
          <div className="install-prompt-text">
            <span className="install-prompt-title">{copy.title}</span>
            <span className="install-prompt-body">{copy.body}</span>
          </div>
          <button
            id="install-prompt-btn"
            onClick={install}
            className="install-prompt-btn-install"
          >
            {copy.install}
          </button>
          <button
            id="install-prompt-close"
            onClick={dismiss}
            className="install-prompt-btn-close"
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  // iOS Safari hint
  if (isIOS && iosHintShown) {
    return (
      <div
        role="complementary"
        aria-label={copy.title}
        className="install-prompt-bar"
      >
        <div className="install-prompt-inner">
          <div className="install-prompt-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 6H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
          </div>
          <div className="install-prompt-text">
            <span className="install-prompt-title">{copy.title}</span>
            <span className="install-prompt-body">{copy.iosBody}</span>
          </div>
          <button
            id="install-prompt-ios-close"
            onClick={dismiss}
            className="install-prompt-btn-close"
            aria-label="Dismiss"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    )
  }

  return null
}
