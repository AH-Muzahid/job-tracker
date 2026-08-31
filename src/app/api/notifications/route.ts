/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { getInternalUserId } from "@/lib/auth"
import { prisma, withDbRetry } from "@/lib/prisma"
import { ResponseUtil } from "@/lib/api-response"

export async function GET(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
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

    return NextResponse.json(
      ResponseUtil.success({
        notifications,
        unreadCount,
      })
    )
  } catch (error: any) {
    return NextResponse.json(ResponseUtil.error(error?.message || "Failed to fetch notifications"), { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await getInternalUserId()
  if (!userId) {
    return NextResponse.json(ResponseUtil.error("Unauthorized", 401), { status: 401 })
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
      return NextResponse.json(ResponseUtil.success({ message: "All notifications marked as read." }))
    }

    if (notificationId) {
      const updated = await withDbRetry(() =>
        prisma.notification.update({
          where: { id: notificationId, userId },
          data: { isRead: true },
        })
      )
      return NextResponse.json(ResponseUtil.success({ notification: updated }))
    }

    return NextResponse.json(ResponseUtil.error("notificationId or markAllAsRead is required"), { status: 400 })
  } catch (error: any) {
    return NextResponse.json(ResponseUtil.error(error?.message || "Failed to update notifications"), { status: 500 })
  }
}
