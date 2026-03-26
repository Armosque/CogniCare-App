import { NextResponse } from "next/server";

/**
 * Health check endpoint (12-Factor: Port binding).
 * Usado por load balancers, orquestadores y monitoreo para verificar que el proceso está vivo.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "cognicare",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
    { status: 200 }
  );
}
