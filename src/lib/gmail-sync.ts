/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma, withDbRetry } from "@/lib/prisma"
import { getAuthenticatedGmailClient } from "@/lib/gmail"
import { invalidateCache } from "@/lib/redis"
import { inngest } from "@/inngest/client"

export interface EmailClassification {
  intent: "INTERVIEW" | "OFFER" | "REJECTION" | "CONFIRMATION" | "GENERAL"
  confidence: number
  targetStatus?: string
  summary: string
  meetingUrl?: string
  round?: string
  interviewDate?: Date
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
 * Extracts meeting URL (Zoom, Google Meet, Microsoft Teams, Calendly) from email text.
 */
export function extractMeetingUrl(text: string): string | null {
  if (!text) return null

  const patterns = [
    /https:\/\/(?:[a-zA-Z0-9.-]+\.)?zoom\.us\/[jsw]\/[a-zA-Z0-9?=_&%-]+/i,
    /https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}(?:\?[^\s<>"')]+)?/i,
    /https:\/\/teams\.microsoft\.com\/l\/meetup-join\/[^\s<>"')]+/i,
    /https:\/\/(?:www\.)?calendly\.com\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)?/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) return match[0]
  }

  return null
}

/**
 * Extracts interview round name from email text.
 */
export function extractInterviewRound(text: string): string | null {
  if (!text) return null

  if (/\b(?:recruiter screen|screening call|initial screening|recruiter call|introductory call)\b/i.test(text)) {
    return "Recruiter Screen"
  }
  if (/\b(?:technical screen|tech screen|coding screen|technical interview)\b/i.test(text)) {
    return "Technical Screen"
  }
  if (/\b(?:hiring manager(?: interview)?|hm interview)\b/i.test(text)) {
    return "Hiring Manager"
  }
  if (/\b(?:system design(?: interview)?)\b/i.test(text)) {
    return "System Design"
  }
  if (/\b(?:take-home|technical assessment|coding challenge|assessment)\b/i.test(text)) {
    return "Technical Assessment"
  }
  if (/\b(?:behavioral(?: interview)?|culture fit(?: interview)?)\b/i.test(text)) {
    return "Behavioral"
  }
  if (/\b(?:final round|onsite(?: interview)?)\b/i.test(text)) {
    return "Final Round"
  }

  return null
}

/**
 * Extracts interview scheduled date from email text.
 */
export function extractInterviewDate(text: string): Date | null {
  if (!text) return null

  // 1. ISO format: 2026-10-15T14:00:00Z or 2026-10-15 14:00
  const isoMatch = text.match(/\b(202[6-9]-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:[T\s](?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?)?(?:Z|[+-][01]\d:?[0-5]\d)?)\b/)
  if (isoMatch) {
    const d = new Date(isoMatch[1])
    if (!isNaN(d.getTime())) return d
  }

  // 2. Formats like: "October 15, 2026", "Oct 15, 2026 at 2:00 PM", "15 October 2026"
  const englishDateMatch = text.match(/\b(?:(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.,]?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+202[6-9]|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[.,]?\s+202[6-9])(?:\s+(?:at\s+)?\d{1,2}(?::\d{2})?\s*(?:am|pm)?)?\b/i)
  if (englishDateMatch) {
    const cleanStr = englishDateMatch[0]
      .replace(/(\d+)(?:st|nd|rd|th)/i, "$1")
      .replace(/\s+at\s+/i, " ")
    const d = new Date(cleanStr)
    if (!isNaN(d.getTime())) return d
  }

  return null
}

/**
 * Recursively decodes and extracts plain text from a Gmail message payload.
 */
export function extractBodyText(payload: any): string {
  if (!payload) return ""

  const decodeData = (data?: string): string => {
    if (!data) return ""
    try {
      const normalized = data.replace(/-/g, "+").replace(/_/g, "/")
      return Buffer.from(normalized, "base64").toString("utf-8")
    } catch {
      return ""
    }
  }

  const stripHtml = (html: string): string => {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  }

  let text = ""

  if (payload.body?.data) {
    const decoded = decodeData(payload.body.data)
    text = payload.mimeType === "text/html" ? stripHtml(decoded) : decoded
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text += " " + decodeData(part.body.data)
      } else if (part.mimeType === "text/html" && part.body?.data && !text) {
        text += " " + stripHtml(decodeData(part.body.data))
      } else if (part.parts) {
        text += " " + extractBodyText(part)
      }
    }
  }

  return text.trim()
}

/**
 * Heuristic & Keyword-based Outcome Classifier for Recruiter Replies.
 * Identifies Interview Invitations, Offers, Rejections, Confirmations, and General Follow-ups.
 */
export function classifyEmailOutcome(subject: string, snippet: string, bodyText: string = ""): EmailClassification {
  const rawText = `${subject} ${snippet} ${bodyText}`
  const text = rawText.toLowerCase()

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
      const meetingUrl = extractMeetingUrl(rawText) || undefined
      const round = extractInterviewRound(rawText) || undefined
      const interviewDate = extractInterviewDate(rawText) || undefined

      return {
        intent: "INTERVIEW",
        confidence: 0.9,
        targetStatus: "Interview",
        summary: round
          ? `${round} interview invitation detected.`
          : "Interview invitation or scheduling request detected.",
        meetingUrl,
        round,
        interviewDate,
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

  // 4. Application Confirmation / Receipt Signals
  const confirmationPatterns = [
    /\bthank you for (applying|your application)\b/,
    /\bthanks for (applying|your application)\b/,
    /\bwe have received your application\b/,
    /\bwe received your application\b/,
    /\bapplication (received|has been received|confirmation)\b/,
    /\bconfirming receipt of your application\b/,
    /\bsuccessfully submitted your application\b/,
    /\byour application to .* has been received\b/,
    /\byour application for .* has been received\b/,
  ]
  for (const pattern of confirmationPatterns) {
    if (pattern.test(text)) {
      return {
        intent: "CONFIRMATION",
        confidence: 0.9,
        targetStatus: "Applied",
        summary: "Application confirmation received from company.",
      }
    }
  }

  // 5. General Inquiry
  return {
    intent: "GENERAL",
    confidence: 0.6,
    summary: "General recruiter response or correspondence.",
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
        interviewDate: true,
        interviewRound: true,
        interviewMeetingUrl: true,
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

    // Subject or snippet match (e.g. "Google Interview" or "Frontend Engineer @ Google")
    if (
      subject.toLowerCase().includes(compName) ||
      snippet.toLowerCase().includes(compName) ||
      (app.jobTitle &&
        (subject.toLowerCase().includes(app.jobTitle.toLowerCase()) ||
          snippet.toLowerCase().includes(app.jobTitle.toLowerCase())))
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
        const bodyText = extractBodyText(msgData.payload)

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
          const classification = classifyEmailOutcome(subjectHeader, snippet, bodyText)

          let updatedStatus = matchedApp.status
          let shouldUpdateStatus = false

          if (classification.targetStatus && classification.targetStatus !== matchedApp.status) {
            // Apply logical status progression
            const statusWeights: Record<string, number> = {
              Staged: 1,
              STAGED: 1,
              Saved: 1,
              SAVED: 1,
              Applied: 2,
              APPLIED: 2,
              Assessment: 3,
              ASSESSMENT: 3,
              Interview: 4,
              INTERVIEW: 4,
              Offer: 5,
              OFFER: 5,
              Rejected: 0,
              REJECTED: 0,
            }

            const currentWeight = statusWeights[matchedApp.status] ?? 0
            const targetWeight = statusWeights[classification.targetStatus] ?? 0

            // If advancing or setting to Rejected
            if (targetWeight > currentWeight || classification.targetStatus === "Rejected") {
              updatedStatus = classification.targetStatus
              shouldUpdateStatus = true
            }
          }

          const hasNewInterviewDetails =
            classification.intent === "INTERVIEW" &&
            (Boolean(classification.meetingUrl && classification.meetingUrl !== matchedApp.interviewMeetingUrl) ||
              Boolean(classification.round && classification.round !== matchedApp.interviewRound) ||
              Boolean(
                classification.interviewDate &&
                  classification.interviewDate.toISOString() !== matchedApp.interviewDate?.toISOString()
              ))

          // 4. Update Application & Record StatusChange
          if (shouldUpdateStatus || hasNewInterviewDetails) {
            await withDbRetry(async () => {
              const updateData: any = {
                notes: matchedApp.notes
                  ? `${matchedApp.notes}\n[Email Sync ${new Date().toLocaleDateString()}]: ${classification.summary}${
                      classification.meetingUrl ? ` (Meeting: ${classification.meetingUrl})` : ""
                    }`
                  : `[Email Sync ${new Date().toLocaleDateString()}]: ${classification.summary}${
                      classification.meetingUrl ? ` (Meeting: ${classification.meetingUrl})` : ""
                    }`,
                updatedAt: new Date(),
              }

              if (shouldUpdateStatus) {
                updateData.status = updatedStatus
              }
              if (classification.interviewDate) {
                updateData.interviewDate = classification.interviewDate
              }
              if (classification.round) {
                updateData.interviewRound = classification.round
              }
              if (classification.meetingUrl) {
                updateData.interviewMeetingUrl = classification.meetingUrl
              }

              await prisma.application.update({
                where: { id: matchedApp.id },
                data: updateData,
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
                    meetingUrl: classification.meetingUrl,
                    round: classification.round,
                    interviewDate: classification.interviewDate ? classification.interviewDate.toISOString() : undefined,
                    snippet: snippet.slice(0, 150),
                  },
                },
              })

              // 4b. Auto-initialize mock interview prep context if interview detected
              if (classification.intent === "INTERVIEW") {
                const existingSession = await prisma.interviewSession.findFirst({
                  where: {
                    userId,
                    applicationId: matchedApp.id,
                  },
                })

                if (!existingSession) {
                  await prisma.interviewSession.create({
                    data: {
                      userId,
                      applicationId: matchedApp.id,
                      targetRole: matchedApp.jobTitle || "Software Engineer",
                      targetCompany: matchedApp.companyName,
                      interviewType: classification.round || "Technical Screen",
                      language: "mixed",
                      dialogue: [],
                    },
                  })
                }

                // 4b-ii. Trigger automated company research dossier pipeline via Inngest
                try {
                  await inngest.send({
                    name: "application/interview.scheduled",
                    data: {
                      applicationId: matchedApp.id,
                      userId,
                      companyName: matchedApp.companyName,
                      jobTitle: matchedApp.jobTitle,
                      interviewDate: classification.interviewDate ? classification.interviewDate.toISOString() : undefined,
                      interviewRound: classification.round,
                    },
                  })
                } catch (inngestErr) {
                  console.warn("[gmail-sync] Failed to dispatch dossier inngest event:", inngestErr)
                }
              }

              // 4c. Invalidate Redis caches
              await invalidateCache(
                `dashboard:stats:${userId}`,
                `applications:${userId}`,
                `user:stats:${userId}`
              )
            })

            result.statusUpdates++
          }

          // 5. Create In-App Notification
          await withDbRetry(() =>
            prisma.notification.create({
              data: {
                userId,
                title:
                  classification.intent === "INTERVIEW"
                    ? `🎯 Interview Invitation: ${matchedApp.companyName}`
                    : `📬 Recruiter Reply: ${matchedApp.companyName}`,
                message: `Received email "${subjectHeader}" from ${senderEmail}. ${
                  shouldUpdateStatus
                    ? `Application status automatically updated from ${matchedApp.status} to ${updatedStatus}.`
                    : `Context: ${classification.summary}`
                }${classification.meetingUrl ? ` Meeting Link: ${classification.meetingUrl}` : ""}`,
                type: classification.intent === "INTERVIEW" ? "INTERVIEW" : "FOLLOW_UP",
                link:
                  classification.intent === "INTERVIEW"
                    ? `/interview-prep?applicationId=${matchedApp.id}`
                    : `/applications/${matchedApp.id}`,
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
