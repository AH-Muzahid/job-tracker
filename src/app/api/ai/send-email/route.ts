export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { sendEmail, formatOutreachEmailHtml } from "@/lib/email"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

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

    const body = await request.json()
    const { to, subject, body: emailBody, applicationId, candidateName } = body

    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      )
    }

    let application = null
    if (applicationId) {
      application = await withDbRetry(() =>
        prisma.application.findFirst({
          where: { id: applicationId, userId },
        })
      )
    }

    const htmlContent = formatOutreachEmailHtml({
      candidateName: candidateName || "Job Applicant",
      bodyText: emailBody,
      companyName: application?.companyName,
      jobTitle: application?.jobTitle,
    })

    const sendResult = await sendEmail({
      to,
      subject,
      html: htmlContent,
      text: emailBody,
    })

    if (!sendResult.success) {
      return NextResponse.json(
        { error: sendResult.error || "Failed to dispatch email" },
        { status: 500 }
      )
    }

    // If an applicationId was attached, record note and optionally advance status to Applied
    if (application) {
      const noteEntry = `[${new Date().toLocaleDateString()}] Email sent to ${to}: "${subject}"`
      await withDbRetry(async () => {
        const updateData: { notes: string; status?: string } = {
          notes: application.notes ? `${application.notes}\n${noteEntry}` : noteEntry,
        }
        if (application.status === "Saved") {
          updateData.status = "Applied"
        }

        await prisma.application.update({
          where: { id: application.id },
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
    const errorMsg = error instanceof Error ? error.message : "Internal server error"
    console.error("send-email route error:", error)
    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    )
  }
}
