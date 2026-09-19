"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Zap, ArrowLeft, Bug } from "lucide-react";
import Link from "next/link";

export default function SentryExamplePage() {
  const [apiStatus, setApiStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasDsn = Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);

  const triggerClientError = () => {
    // Deliberately trigger an uncaught test error
    throw new Error("Sentry Test Client Error from CareerTrack: Verify frontend error capturing");
  };

  const triggerCapturedException = () => {
    try {
      throw new Error("Sentry Captured Exception: Manual Sentry.captureException verification");
    } catch (err) {
      Sentry.captureException(err);
      setApiStatus("Frontend exception captured and dispatched to Sentry!");
    }
  };

  const triggerServerError = async () => {
    setLoading(true);
    setApiStatus(null);
    try {
      const res = await fetch("/api/sentry-example-api");
      const data = await res.json();
      setApiStatus(data.message || "Server error triggered successfully!");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to call test API";
      setApiStatus(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <Card className="w-full max-w-xl border-border bg-card shadow-sm">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <Link
              href="/dashboard"
              className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              Back to Dashboard
            </Link>
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-border bg-muted font-mono">
              Sentry Diagnostic
            </span>
          </div>
          <CardTitle className="text-2xl font-bold flex items-center gap-2 pt-2">
            <Bug className="w-6 h-6 text-primary" />
            Sentry Verification Hub
          </CardTitle>
          <CardDescription>
            Test and verify that frontend, backend, and API runtime errors are delivered to your Sentry dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-muted/40 text-sm">
            {hasDsn ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="text-muted-foreground">
                  DSN configured: <strong className="font-mono text-foreground">NEXT_PUBLIC_SENTRY_DSN</strong> is active.
                </span>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                <span className="text-muted-foreground">
                  DSN not detected in client environment yet. Run the wizard or paste your DSN in <code className="font-mono text-foreground">.env.local</code>.
                </span>
              </>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">Verification Actions</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={triggerCapturedException}
                className="justify-start gap-2 h-auto py-3 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-xs">Test Frontend Capture</div>
                  <div className="text-[11px] text-muted-foreground">Sentry.captureException</div>
                </div>
              </Button>

              <Button
                variant="outline"
                onClick={triggerServerError}
                disabled={loading}
                className="justify-start gap-2 h-auto py-3 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-sky-500 shrink-0" />
                <div className="text-left">
                  <div className="font-medium text-xs">Test Server / API Error</div>
                  <div className="text-[11px] text-muted-foreground">/api/sentry-example-api</div>
                </div>
              </Button>
            </div>

            <Button
              variant="destructive"
              onClick={triggerClientError}
              className="w-full gap-2 cursor-pointer mt-2"
            >
              <Bug className="w-4 h-4" />
              Throw Uncaught Client Error (Test Error Boundary)
            </Button>
          </div>

          {apiStatus && (
            <div className="p-3 rounded-md bg-muted text-xs font-mono border border-border">
              {apiStatus}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
