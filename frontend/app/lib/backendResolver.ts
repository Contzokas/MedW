const API_PROXY_BASE = "/api/proxy"
const LOCAL_PORT_FORWARD_BACKEND = "http://localhost:8000"
const HEALTH_ENDPOINT = "/api/v1/health"
const HEALTHCHECK_TIMEOUT_MS = 700

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "")
}

function isAbsoluteHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://")
}

function isLocalhost(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "::1"
  )
}

function getDirectBackendCandidates(): string[] {
  const candidates: string[] = []

  const configuredBackend = process.env.NEXT_PUBLIC_BACKEND_URL
  if (configuredBackend) {
    candidates.push(stripTrailingSlash(configuredBackend))
  }

  if (isLocalhost()) {
    candidates.push(LOCAL_PORT_FORWARD_BACKEND)
  }

  return [...new Set(candidates)]
}

async function isBackendReachable(baseUrl: string): Promise<boolean> {
  if (!isAbsoluteHttpUrl(baseUrl)) {
    return false
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), HEALTHCHECK_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}${HEALTH_ENDPOINT}`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timeout)
  }
}

let apiBasePromise: Promise<string> | null = null

async function resolveApiBaseUncached(): Promise<string> {
  const candidates = getDirectBackendCandidates()

  for (const candidate of candidates) {
    if (await isBackendReachable(candidate)) {
      return candidate
    }
  }

  return API_PROXY_BASE
}

export async function resolveApiBase(): Promise<string> {
  if (!apiBasePromise) {
    apiBasePromise = resolveApiBaseUncached()
  }

  return apiBasePromise
}

export function buildApiUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalizedPath}`
}
