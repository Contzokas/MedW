import { NextRequest, NextResponse } from "next/server"

/**
 * Catch-all API route that proxies requests to the backend.
 *
 * BACKEND_URL is read on every request (true runtime config),
 * unlike next.config.ts rewrites which are baked at build time.
 *
 * Example:
 *   GET /api/proxy/api/v1/health  →  GET http://backend:8000/api/v1/health
 *   POST /api/proxy/api/v1/triage →  POST http://backend:8000/api/v1/triage
 */
function getBackendUrl(): string {
  const url = process.env.BACKEND_URL?.replace(/\/$/, "")
  if (!url) {
    throw new Error(
      "BACKEND_URL environment variable is not set. " +
        "Set it to the backend service address (e.g. http://backend:8000)."
    )
  }
  return url
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return proxyRequest(request, await params)
}

async function proxyRequest(
  request: NextRequest,
  params: { path: string[] }
) {
  let backendUrl: string
  try {
    backendUrl = getBackendUrl()
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message },
      { status: 502 }
    )
  }

  const path = params.path.join("/")
  const target = `${backendUrl}/${path}`

  // Forward query string
  const search = request.nextUrl.search
  const url = search ? `${target}${search}` : target

  // Build headers (strip host so backend gets its own)
  const headers = new Headers(request.headers)
  headers.delete("host")

  try {
    const backendRes = await fetch(url, {
      method: request.method,
      headers,
      body: request.body,
      // @ts-expect-error duplex is needed for streaming body
      duplex: "half",
    })

    // Stream the response back to the client
    const responseHeaders = new Headers(backendRes.headers)
    // Remove hop-by-hop headers
    responseHeaders.delete("transfer-encoding")

    return new Response(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    console.error(`Proxy error → ${url}:`, err)
    return NextResponse.json(
      {
        error: "Backend unreachable",
        target: url,
        detail: (err as Error).message,
      },
      { status: 502 }
    )
  }
}
