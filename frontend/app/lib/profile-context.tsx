"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { UserProfile } from "@/app/lib/types"
import { loadProfile, saveProfile, clearProfile } from "@/app/lib/profile-cookie"

interface ProfileContextValue {
  profile: UserProfile | null
  isProfileLoaded: boolean   // true once the cookie has been read (client-side)
  setProfile: (p: UserProfile) => void
  clearProfile: () => void
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null)
  const [isProfileLoaded, setIsProfileLoaded] = useState(false)

  // Read cookie on the client only (SSR safe)
  useEffect(() => {
    const saved = loadProfile()
    setProfileState(saved)
    setIsProfileLoaded(true)
  }, [])

  const handleSetProfile = (p: UserProfile) => {
    saveProfile(p)
    setProfileState(p)
  }

  const handleClearProfile = () => {
    clearProfile()
    setProfileState(null)
  }

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isProfileLoaded,
        setProfile: handleSetProfile,
        clearProfile: handleClearProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider")
  return ctx
}
