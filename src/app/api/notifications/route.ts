/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { ResponseUtil } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  const { searchParams } = new URL(request.url)
  const unreadOnly = searchParams.get("unreadOnly") === "true"
  const limit = parseInt(searchParams.get("limit") || "20", 10)

  try {
    const notifications = await withDbRetry(() =>
      prisma.notification.findMany({
        where: {
          userId,
          ...(unreadOnly ? { isRead: false } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      })
    )

    const unreadCount = await withDbRetry(() =>
      prisma.notification.count({
        where: { userId, isRead: false },
      })
    )

    return ResponseUtil.success({
      notifications,
      unreadCount,
    })
  } catch (error: any) {
    return ResponseUtil.error(error?.message || "Failed to fetch notifications", 500)
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return ResponseUtil.unauthorized()
  }

  try {
    const body = await request.json().catch(() => ({}))
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      await withDbRetry(() =>
        prisma.notification.updateMany({
          where: { userId, isRead: false },
          data: { isRead: true },
        })
      )
      return ResponseUtil.success({ message: "All notifications marked as read." })
    }

    if (notificationId) {
      const updated = await withDbRetry(() =>
        prisma.notification.update({
          where: { id: notificationId, userId },
          data: { isRead: true },
        })
      )
      return ResponseUtil.success({ notification: updated })
    }

    return ResponseUtil.badRequest("notificationId or markAllAsRead is required")
  } catch (error: any) {
    return ResponseUtil.error(error?.message || "Failed to update notifications", 500)
  }
}
