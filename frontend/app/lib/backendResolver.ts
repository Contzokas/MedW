const API_PROXY_BASE = "/api/proxy"
const LOCAL_BACKEND = "http://localhost:8000"
const CACHE_TTL_MS = 2 * 60 * 1000

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "")
}

function isAbsoluteHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://")
}

function isLocalhost(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  )
}

async function resolveApiBaseUncached(): Promise<string> {
  // Use the BACKEND_URL resolved at deploy time — served via /api/config.
  // The browser (on VPN) can reach the NodePort directly, so no proxy needed.
  try {
    const res = await fetch("/api/config", { cache: "no-store" })
    if (res.ok) {
      const data = (await res.json()) as { backendUrl: string | null }
      const url = data.backendUrl
      if (url && isAbsoluteHttpUrl(url)) return stripTrailingSlash(url)
    }
  } catch { /* ignore — fall through */ }

  // Localhost fallback for local Docker Compose dev
  if (isLocalhost()) return LOCAL_BACKEND

  // Last resort: server-side proxy (only works in local dev)
  return API_PROXY_BASE
}

let apiBasePromise: Promise<string> | null = null
let apiBaseCachedAt = 0

export async function resolveApiBase(): Promise<string> {
  const now = Date.now()
  if (!apiBasePromise || now - apiBaseCachedAt > CACHE_TTL_MS) {
    apiBasePromise = resolveApiBaseUncached()
    apiBaseCachedAt = now
  }
  return apiBasePromise
}

export function buildApiUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalizedPath}`
}
