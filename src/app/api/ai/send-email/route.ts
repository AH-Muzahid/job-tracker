import { deduplicateDelivery, sideEffectKey } from "@/lib/ai/side-effect-dedup"
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"
import { z } from "zod"

const requestSchema = z.object({
  to: z.string().email().max(254),
  subject: z.string().trim().min(1).max(998).refine((value) => !/[\r\n]/.test(value)),
  body: z.string().trim().min(1).max(50_000),
  applicationId: z.string().min(1).max(128).optional(),
  candidateName: z.string().trim().max(200).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const userId = await getInternalUserId()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateCheck = checkRateLimit(`email-send:${userId}`, 10, 60 * 1000)
    if (!rateCheck.success) {
      return rateLimitResponse(rateCheck)
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid email request: check recipient, subject, and body" },
        { status: 400 }
      )
    }
    const { to, subject, body: emailBody, applicationId, candidateName } = parsed.data

    let application = null
    if (applicationId) {
      application = await withDbRetry(() =>
        prisma.application.findFirst({
          where: { id: applicationId, userId },
        })
      )
      if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 })
    }

    const htmlContent = formatOutreachEmailHtml({
      candidateName: candidateName || "Job Applicant",
      bodyText: emailBody,
      companyName: application?.companyName,
      jobTitle: application?.jobTitle,
    })

    const sendResult = await deduplicateDelivery(sideEffectKey(userId, [to.toLowerCase(), subject, emailBody]), () => sendEmail({
      to,
      subject,
      html: htmlContent,
      text: emailBody,
    }))

    if (!sendResult.success) {
      return NextResponse.json(
        { error: "Failed to dispatch email" },
        { status: 500 }
      )
    }

    // If an applicationId was attached, record note and optionally advance status to Applied
    if (application && !sendResult.simulated && !application.notes?.includes(`Email sent to ${to}: "${subject}"`)) {
      const noteEntry = `[${new Date().toLocaleDateString()}] Email sent to ${to}: "${subject}"`
      await withDbRetry(async () => {
        const updateData: { notes: string; status?: string } = {
          notes: application.notes ? `${application.notes}\n${noteEntry}` : noteEntry,
        }
        if (application.status === "Saved") {
          updateData.status = "Applied"
        }

        await prisma.application.update({
          where: { id: application.id, userId },
          data: updateData,
        })

        if (application.status === "Saved") {
          await prisma.statusChange.create({
            data: {
              applicationId: application.id,
              fromStatus: "Saved",
              toStatus: "Applied",
              changedAt: new Date(),
              metadata: { reason: "Email dispatched via AI Outreach" },
            },
          })
        }
      })
    }

    return NextResponse.json({
      success: true,
      simulated: sendResult.simulated ?? false,
      messageId: sendResult.id,
      message: sendResult.simulated
        ? `Email to ${to} was simulated (configure RESEND_API_KEY for live delivery).`
        : `Email to ${to} successfully sent!`,
    })
  } catch (error: unknown) {
    console.error("send-email route error:", error)
    return NextResponse.json(
      { error: "Unable to send email" },
      { status: 500 }
    )
  }
}
