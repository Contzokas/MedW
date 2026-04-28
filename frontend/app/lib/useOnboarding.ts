"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "medw_onboarding_done"

export interface OnboardingState {
  isOpen: boolean
  step: number
  totalSteps: number
  next: () => void
  prev: () => void
  skip: () => void
  restart: () => void
}

export function useOnboarding(totalSteps: number = 4): OnboardingState {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    try {
      const done = localStorage.getItem(STORAGE_KEY)
      if (!done) {
        // Slight delay so the page content settles before tour pops up
        const t = setTimeout(() => setIsOpen(true), 800)
        return () => clearTimeout(t)
      }
    } catch {
      // localStorage unavailable — skip auto-open
    }
  }, [])

  const finish = useCallback(() => {
    setIsOpen(false)
    try { localStorage.setItem(STORAGE_KEY, "1") } catch { /* noop */ }
  }, [])

  const next = useCallback(() => {
    setStep((s) => {
      const next = s + 1
      if (next >= totalSteps) { finish(); return s }
      return next
    })
  }, [totalSteps, finish])

  const prev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1))
  }, [])

  const skip = useCallback(() => finish(), [finish])

  const restart = useCallback(() => {
    setStep(0)
    setIsOpen(true)
  }, [])

  return { isOpen, step, totalSteps, next, prev, skip, restart }
}
