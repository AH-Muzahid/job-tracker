import React from "react"
import Link from "next/link"
import { FileText, ArrowLeft, Shield, CheckCircle } from "lucide-react"

export const metadata = {
  title: "Terms of Service | CareerTrack",
  description: "CareerTrack Terms of Service and Platform Usage Policies",
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-primary transition-colors mb-6"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to CareerTrack
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary border border-primary/20">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">Last updated: September 2026</p>
            </div>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" /> 1. Acceptance of Terms
            </h2>
            <p className="text-muted-foreground">
              By accessing and using CareerTrack, you agree to comply with these Terms of Service. If you disagree with any portion of these terms, please discontinue using the service.
            </p>
          </section>

          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-primary" /> 2. Proper Usage & Email Outreach
            </h2>
            <p className="text-muted-foreground">
              CareerTrack provides tools for career planning, application tracking, and recruiter outreach. You agree not to:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Use the automated outreach dispatch for spamming or unpermitted bulk email distributions.</li>
              <li>Attempt to reverse-engineer, exploit, or bypass authentication and rate-limiting security mechanisms.</li>
            </ul>
          </section>

          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" /> 3. Service Availability & Modifications
            </h2>
            <p className="text-muted-foreground">
              CareerTrack continually enhances features, intelligence engines, and AI integrations. We reserve the right to modify or discontinue features with appropriate notification to users.
            </p>
          </section>
        </div>

        <div className="pt-8 border-t border-border/60 text-xs text-muted-foreground font-mono text-center">
          &copy; {new Date().getFullYear()} CareerTrack. All rights reserved.
        </div>
      </div>
    </main>
  )
}
