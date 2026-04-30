"use client"

import { useState, useCallback } from "react"

interface GeolocationState {
  latitude: number | null
  longitude: number | null
  denied: boolean
  loading: boolean
  dismissed: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    denied: false,
    loading: false,
    dismissed: false,
  })

  const request = useCallback(() => {
    if (!navigator.geolocation) return

    setState((prev) => ({ ...prev, loading: true, denied: false }))

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          denied: false,
          loading: false,
          dismissed: false,
        })
      },
      () => {
        setState((prev) => ({ ...prev, denied: true, loading: false }))
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    )
  }, [])

  const dismiss = useCallback(() => {
    setState((prev) => ({ ...prev, dismissed: true }))
  }, [])

  return {
    latitude: state.latitude,
    longitude: state.longitude,
    denied: state.denied,
    loading: state.loading,
    dismissed: state.dismissed,
    request,
    dismiss,
  }
}
