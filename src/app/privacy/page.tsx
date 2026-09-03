import React from "react"
import Link from "next/link"
import { ShieldCheck, ArrowLeft, Lock, Database, RefreshCw, Trash2 } from "lucide-react"

export const metadata = {
  title: "Privacy Policy | CareerTrack",
  description: "CareerTrack Privacy Policy, Data Handling, and Google OAuth Compliance",
}

export default function PrivacyPolicyPage() {
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
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
              <p className="text-sm text-muted-foreground font-mono mt-0.5">Last updated: September 2026</p>
            </div>
          </div>
        </div>

        <div className="prose prose-neutral dark:prose-invert max-w-none text-sm leading-relaxed space-y-6">
          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" /> 1. Information We Collect
            </h2>
            <p className="text-muted-foreground">
              CareerTrack collects user information solely to provide job application tracking, AI interview preparation, and automated recruiter outreach assistance:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>Account Credentials:</strong> Handled securely via authentication providers (Clerk / Google OAuth).</li>
              <li><strong>Job Application Pipeline:</strong> Company names, job titles, application dates, statuses, and notes created by the user.</li>
              <li><strong>Google OAuth Data:</strong> If connected, your verified email address and OAuth tokens used to send requested emails and detect recruiter replies.</li>
            </ul>
          </section>

          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> 2. Google OAuth & Sensitive Data Security
            </h2>
            <p className="text-muted-foreground">
              CareerTrack adheres to Google API Services User Data Policy, including the Limited Use requirements:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li><strong>AES-256-GCM Encryption:</strong> All Google OAuth tokens are encrypted at rest using military-grade authenticated AES-256-GCM encryption.</li>
              <li><strong>Limited Scopes:</strong> We only access <code>gmail.send</code> (to dispatch emails you explicitly authorize) and <code>gmail.readonly</code> (to parse interview invitation/status update threads).</li>
              <li><strong>No Third-Party Sale:</strong> We never sell, transfer, or distribute your email contents or personal information to third parties.</li>
            </ul>
          </section>

          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-primary" /> 3. Data Retention & Synchronization
            </h2>
            <p className="text-muted-foreground">
              We retain your application records and encrypted tokens only as long as your account remains active. Background sync operations process only recent candidate-recruiter message threads.
            </p>
          </section>

          <section className="space-y-3 p-5 rounded-xl border border-border/70 bg-card/50">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-primary" /> 4. Your Rights & Account Revocation
            </h2>
            <p className="text-muted-foreground">
              You maintain full ownership of your data. You can disconnect your Google account at any time from the CareerTrack Settings page, which permanently purges your encrypted OAuth tokens.
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
