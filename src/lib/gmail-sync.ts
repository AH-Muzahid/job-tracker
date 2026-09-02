/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getAuthenticatedGmailClient } from "@/lib/gmail"

export interface EmailClassification {
  intent: "INTERVIEW" | "OFFER" | "REJECTION" | "GENERAL"
  confidence: number
  targetStatus?: string
  summary: string
}

export interface InboundSyncResult {
  userId: string
  messagesScanned: number
  repliesMatched: number
  statusUpdates: number
  notificationsCreated: number
  errors: string[]
}

/**
 * Heuristic & Keyword-based Outcome Classifier for Recruiter Replies.
 * Identifies Interview Invitations, Offers, Rejections, and General Follow-ups.
 */
export function classifyEmailOutcome(subject: string, snippet: string, bodyText: string = ""): EmailClassification {
  const text = `${subject} ${snippet} ${bodyText}`.toLowerCase()

  // 1. Offer Signals (highest precedence)
  const offerPatterns = [
    /\boffer letter\b/,
    /\bpleased to offer\b/,
    /\bofficial offer\b/,
    /\bformal offer\b/,
    /\bcompensation package\b/,
    /\bjob offer\b/,
    /\bcongratulations.*offer\b/,
  ]
  for (const pattern of offerPatterns) {
    if (pattern.test(text)) {
      return {
        intent: "OFFER",
        confidence: 0.95,
        targetStatus: "Offer",
        summary: "Job offer detected in recruiter correspondence.",
      }
    }
  }

  // 2. Interview & Scheduling Signals
  const interviewPatterns = [
    /\binterview\b/,
    /\bschedule a (call|chat|time|meeting)\b/,
    /\bcalendar link\b/,
    /\bcalendly\b/,
    /\bavailability for a\b/,
    /\bnext round\b/,
    /\btechnical screen\b/,
    /\bhiring manager interview\b/,
    /\btake-home (assessment|test|assignment)\b/,
    /\bzoom link\b/,
    /\bgoogle meet\b/,
    /\bphone screen\b/,
    /\binvite you to\b/,
  ]
  for (const pattern of interviewPatterns) {
    if (pattern.test(text)) {
      return {
        intent: "INTERVIEW",
        confidence: 0.9,
        targetStatus: "Interview",
        summary: "Interview invitation or scheduling request detected.",
      }
    }
  }

  // 3. Rejection Signals
  const rejectionPatterns = [
    /\bunfortunately\b/,
    /\bnot moving forward\b/,
    /\bdecided to pursue other\b/,
    /\bother candidates\b/,
    /\bposition has been filled\b/,
    /\bwill not be advancing\b/,
    /\bdecided not to proceed\b/,
    /\bwe regret to inform\b/,
    /\bnot a match at this time\b/,
  ]
  for (const pattern of rejectionPatterns) {
    if (pattern.test(text)) {
      return {
        intent: "REJECTION",
        confidence: 0.92,
        targetStatus: "Rejected",
        summary: "Application rejection notice detected.",
      }
    }
  }

  // 4. General Inquiry
  return {
    intent: "GENERAL",
    confidence: 0.6,
    summary: "General recruiter response or application receipt acknowledgement.",
  }
}

/**
 * Matches an incoming email to an active Application in the user's pipeline.
 */
export async function matchMessageToApplication(
  userId: string,
  senderEmail: string,
  subject: string,
  snippet: string = ""
) {
  // Extract domain from sender: recruiter@stripe.com -> stripe.com
  const emailDomain = senderEmail.includes("@") ? senderEmail.split("@")[1].toLowerCase() : ""
  const rootDomainName = emailDomain.split(".")[0] // e.g. "stripe"

  const applications = await withDbRetry(() =>
    prisma.application.findMany({
      where: { userId },
      select: {
        id: true,
        companyName: true,
        jobTitle: true,
        status: true,
        notes: true,
        company: {
          select: { name: true, website: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    })
  )

  if (applications.length === 0) return null

  // 1. Direct Company Name or Domain Match
  for (const app of applications) {
    const compName = app.companyName.toLowerCase()
    const registeredCompName = app.company?.name?.toLowerCase() || ""

    // Domain match (e.g. stripe in stripe.com)
    if (
      rootDomainName &&
      (rootDomainName === compName ||
        compName.includes(rootDomainName) ||
        rootDomainName.includes(compName) ||
        (registeredCompName && rootDomainName.includes(registeredCompName)))
    ) {
      return app
    }

    // Subject match (e.g. "Google Interview" or "Frontend Engineer @ Google")
    if (
      subject.toLowerCase().includes(compName) ||
      (app.jobTitle && subject.toLowerCase().includes(app.jobTitle.toLowerCase()))
    ) {
      return app
    }
  }

  return null
}

/**
 * Scans the user's personal Gmail inbox, identifies recruiter replies,
 * updates application statuses, creates audit logs, and creates in-app notifications.
 */
export async function syncUserInbox(userId: string): Promise<InboundSyncResult> {
  const result: InboundSyncResult = {
    userId,
    messagesScanned: 0,
    repliesMatched: 0,
    statusUpdates: 0,
    notificationsCreated: 0,
    errors: [],
  }

  try {
    const authData = await getAuthenticatedGmailClient(userId)
    if (!authData) {
      result.errors.push("No active Google account connected")
      return result
    }

    const { gmail, email: userEmail } = authData

    // 1. Fetch recent unread inbox messages
    const listRes = await gmail.users.messages.list({
      userId: "me",
      q: "label:INBOX newer_than:7d",
      maxResults: 20,
    })

    const messageHeaders = listRes.data.messages || []
    result.messagesScanned = messageHeaders.length

    if (messageHeaders.length === 0) {
      return result
    }

    for (const msgSummary of messageHeaders) {
      if (!msgSummary.id) continue

      try {
        const msgRes = await gmail.users.messages.get({
          userId: "me",
          id: msgSummary.id,
          format: "full",
        })

        const msgData = msgRes.data
        const headers = msgData.payload?.headers || []

        const fromHeader = headers.find((h: any) => h.name?.toLowerCase() === "from")?.value || ""
        const subjectHeader = headers.find((h: any) => h.name?.toLowerCase() === "subject")?.value || "(No Subject)"
        const snippet = msgData.snippet || ""

        // Extract clean sender email
        const emailMatch = fromHeader.match(/<([^>]+)>/) || [null, fromHeader]
        const senderEmail = (emailMatch[1] || fromHeader).trim().toLowerCase()

        // Ignore self-sent emails
        if (senderEmail === userEmail.toLowerCase()) continue

        // 2. Match message to an active application
        const matchedApp = await matchMessageToApplication(userId, senderEmail, subjectHeader, snippet)

        if (matchedApp) {
          result.repliesMatched++

          // 3. Classify email outcome
          const classification = classifyEmailOutcome(subjectHeader, snippet)

          let updatedStatus = matchedApp.status
          let shouldUpdateStatus = false

          if (classification.targetStatus && classification.targetStatus !== matchedApp.status) {
            // Apply logical status progression
            const statusWeights: Record<string, number> = {
              Saved: 1,
              Applied: 2,
              Interview: 3,
              Offer: 4,
              Rejected: 0,
            }

            const currentWeight = statusWeights[matchedApp.status] || 0
            const targetWeight = statusWeights[classification.targetStatus] || 0

            // If advancing to Interview or Offer, or setting to Rejected
            if (targetWeight > currentWeight || classification.targetStatus === "Rejected") {
              updatedStatus = classification.targetStatus
              shouldUpdateStatus = true
            }
          }

          // 4. Update Application & Record StatusChange
          if (shouldUpdateStatus) {
            await withDbRetry(async () => {
              await prisma.application.update({
                where: { id: matchedApp.id },
                data: {
                  status: updatedStatus,
                  notes: matchedApp.notes
                    ? `${matchedApp.notes}\n[Email Sync ${new Date().toLocaleDateString()}]: ${classification.summary}`
                    : `[Email Sync ${new Date().toLocaleDateString()}]: ${classification.summary}`,
                  updatedAt: new Date(),
                },
              })

              await prisma.statusChange.create({
                data: {
                  applicationId: matchedApp.id,
                  fromStatus: matchedApp.status,
                  toStatus: updatedStatus,
                  metadata: {
                    source: "gmail_inbox_sync",
                    sender: senderEmail,
                    subject: subjectHeader,
                    intent: classification.intent,
                    snippet: snippet.slice(0, 150),
                  },
                },
              })
            })

            result.statusUpdates++
          }

          // 5. Create In-App Notification
          await withDbRetry(() =>
            prisma.notification.create({
              data: {
                userId,
                title: `📬 Recruiter Reply: ${matchedApp.companyName}`,
                message: `Received email "${subjectHeader}" from ${senderEmail}. ${
                  shouldUpdateStatus
                    ? `Application status automatically updated from ${matchedApp.status} to ${updatedStatus}.`
                    : `Context: ${classification.summary}`
                }`,
                type: classification.intent === "INTERVIEW" ? "INTERVIEW" : "FOLLOW_UP",
                link: `/applications/${matchedApp.id}`,
              },
            })
          )

          result.notificationsCreated++
        }
      } catch (msgErr: any) {
        result.errors.push(`Failed to process message ${msgSummary.id}: ${msgErr?.message || "Unknown"}`)
      }
    }

    // Update historyId / sync timestamp on connected account
    const latestHistoryId = (listRes.data as any)?.historyId
    if (latestHistoryId) {
      await withDbRetry(() =>
        prisma.connectedAccount.update({
          where: { userId },
          data: {
            historyId: latestHistoryId,
            updatedAt: new Date(),
          },
        })
      ).catch(() => null)
    }

    return result
  } catch (err: any) {
    result.errors.push(err?.message || "Inbox sync failed")
    return result
  }
}
