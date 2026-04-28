"use client"

import { useState, useCallback } from "react"

export interface GeolocationState {
  latitude: number | null
  longitude: number | null
  error: string | null
  loading: boolean
  denied: boolean
  request: () => void
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

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported")
      setDenied(true)
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude)
        setLongitude(position.coords.longitude)
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

  return { latitude, longitude, error, loading, denied, request }
}
