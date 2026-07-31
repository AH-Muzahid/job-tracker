import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { ResponseUtil } from "@/lib/api-response"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
  }

  const rateCheck = checkRateLimit(`bulk-applications:${userId}`, 20, 60 * 1000)
  if (!rateCheck.success) {
    return rateLimitResponse(rateCheck)
  }

  try {
    const body = await req.json()
    const { action, ids, payload } = body

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        ResponseUtil.error("Minimum 1 application ID is required", 400),
        { status: 400 }
      )
    }

    // Verify all requested IDs belong to the authenticated user
    const validApplications = await withDbRetry(() =>
      prisma.application.findMany({
        where: { id: { in: ids }, userId },
        select: { id: true, status: true },
      })
    )

    const validIds = validApplications.map((app) => app.id)

    if (validIds.length === 0) {
      return NextResponse.json(
        ResponseUtil.error("No valid applications found for this user", 404),
        { status: 404 }
      )
    }

    if (action === "delete") {
      const deleteResult = await withDbRetry(() =>
        prisma.application.deleteMany({
          where: { id: { in: validIds }, userId },
        })
      )

      return NextResponse.json(
        ResponseUtil.success({
          message: `Successfully deleted ${deleteResult.count} applications`,
          count: deleteResult.count,
        })
      )
    }

    if (action === "update_status") {
      const newStatus = payload?.status
      if (!newStatus || typeof newStatus !== "string") {
        return NextResponse.json(
          ResponseUtil.error("Valid status string is required for update_status", 400),
          { status: 400 }
        )
      }

      await withDbRetry(async () => {
        // Create StatusChange history records for status changes
        const statusChangesData = validApplications
          .filter((app) => app.status !== newStatus)
          .map((app) => ({
            applicationId: app.id,
            fromStatus: app.status,
            toStatus: newStatus,
          }))

        await prisma.$transaction([
          prisma.application.updateMany({
            where: { id: { in: validIds }, userId },
            data: { status: newStatus },
          }),
          ...(statusChangesData.length > 0
            ? [prisma.statusChange.createMany({ data: statusChangesData })]
            : []),
        ])
      })

      return NextResponse.json(
        ResponseUtil.success({
          message: `Successfully updated status for ${validIds.length} applications`,
          count: validIds.length,
          status: newStatus,
        })
      )
    }

    if (action === "add_tag") {
      const tagId = payload?.tagId
      if (!tagId || typeof tagId !== "string") {
        return NextResponse.json(
          ResponseUtil.error("Valid tagId string is required for add_tag", 400),
          { status: 400 }
        )
      }

      const tagExists = await withDbRetry(() =>
        prisma.tag.findFirst({ where: { id: tagId, userId } })
      )

      if (!tagExists) {
        return NextResponse.json(ResponseUtil.error("Tag not found", 404), { status: 404 })
      }

      const applicationTagsData = validIds.map((id) => ({
        applicationId: id,
        tagId,
      }))

      await withDbRetry(() =>
        prisma.applicationTag.createMany({
          data: applicationTagsData,
          skipDuplicates: true,
        })
      )

      return NextResponse.json(
        ResponseUtil.success({
          message: `Successfully added tag to ${validIds.length} applications`,
          count: validIds.length,
        })
      )
    }

    return NextResponse.json(
      ResponseUtil.error("Invalid action. Supported: delete, update_status, add_tag", 400),
      { status: 400 }
    )
  } catch (err) {
    console.error("Bulk operations API error:", err)
    return NextResponse.json(
      ResponseUtil.error("Failed to process bulk operation", 500),
      { status: 500 }
    )
  }
}
