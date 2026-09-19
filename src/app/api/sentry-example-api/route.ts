import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

// Test endpoint to verify Sentry exception reporting
export async function GET() {
  try {
    throw new Error("Sentry Test Error from CareerTrack Backend API");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json({
      success: true,
      message: "Sentry test exception captured successfully. Check your Sentry dashboard.",
      timestamp: new Date().toISOString(),
    });
  }
}
