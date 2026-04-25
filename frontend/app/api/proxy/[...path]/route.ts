import { NextRequest, NextResponse } from "next/server"

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
  const search = request.nextUrl.search
  const url = search ? `${target}${search}` : target

  const headers = new Headers(request.headers)
  headers.delete("host")

  // 5-second timeout: pods cannot reach NodePort services via the node IP
  // (hairpin NAT). On timeout, redirect the browser to the backend directly —
  // the browser (on VPN) can reach NodePorts even when the pod cannot.
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)

  try {
    const backendRes = await fetch(url, {
      method: request.method,
      headers,
      body: request.body,
      // @ts-expect-error duplex is needed for streaming body
      duplex: "half",
      signal: controller.signal,
    })

    clearTimeout(timeout)

    const responseHeaders = new Headers(backendRes.headers)
    responseHeaders.delete("transfer-encoding")

    return new Response(backendRes.body, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: responseHeaders,
    })
  } catch (err) {
    clearTimeout(timeout)
    console.error(`Proxy error → ${url}:`, err)
    // Redirect browser to the backend directly — works when VPN has NodePort access
    return NextResponse.redirect(url, { status: 307 })
  }
}
