import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    backendUrl: process.env.BACKEND_URL ?? null,
  })
}
