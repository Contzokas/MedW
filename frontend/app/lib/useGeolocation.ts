"use client"

import { useState, useCallback, useEffect, useRef } from "react"

export interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
  denied: boolean
  ipBased: boolean
  request: () => void
  dismiss: () => void
  dismissed: boolean
}

const GEO_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 10_000,
  maximumAge: 300_000,
}

export function useGeolocation(): GeolocationState {
  const [latitude, setLatitude] = useState<number | null>(null)
  const [longitude, setLongitude] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [denied, setDenied] = useState(false)
  const [ipBased, setIpBased] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const ipRan = useRef(false)

  const dismiss = useCallback(() => setDismissed(true), [])

  useEffect(() => {
    if (ipRan.current) return
    ipRan.current = true

    let cancelled = false
    fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(5000) })
      .then((res) => {
        if (!res.ok || cancelled) return null
        return res.json() as Promise<{ latitude?: number; longitude?: number; error?: boolean }>
      })
      .then((data) => {
        if (cancelled || !data || data.error || !data.latitude || !data.longitude) return
        setLatitude(data.latitude)
        setLongitude(data.longitude)
        setIpBased(true)
      })
      .catch(() => { /* IP geolocation unavailable */ })

    return () => { cancelled = true }
  }, [])

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported")
      setDenied(true)
      return
    }
    setDismissed(false)
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
        setIpBased(false)
        setLoading(false)
      },
      (err) => {
        setLoading(false)
        if (err.code === err.PERMISSION_DENIED) {
          setDenied(true)
        }
        setError(err.message)
      },
      GEO_OPTIONS,
    )
  }, [])

  return { latitude, longitude, error, loading, denied, ipBased, request, dismiss, dismissed }
}
