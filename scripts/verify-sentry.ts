import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

console.log("Initializing Sentry verification with DSN:", dsn ? `${dsn.slice(0, 30)}...` : "None");

Sentry.init({
  dsn,
  tracesSampleRate: 1.0,
});

async function run() {
  try {
    throw new Error("CareerTrack Sentry Integration Test: Node Verification Event");
  } catch (error) {
    const eventId = Sentry.captureException(error);
    console.log("Captured test exception! Event ID:", eventId);
    console.log("Flushing events to Sentry ingest server...");
    const flushed = await Sentry.flush(5000);
    console.log("Flush completed:", flushed ? "SUCCESS (event delivered)" : "FAILED (timeout)");
  }
}

run();
