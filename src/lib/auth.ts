import { cache } from "react"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma, withDbRetry } from "@/lib/prisma"

const userIdCache = new Map<string, string>()

export const getInternalUserId = cache(async function getInternalUserId() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  const cachedId = userIdCache.get(clerkUserId)
  if (cachedId) return cachedId

  let user = await withDbRetry(() =>
    prisma.user.findUnique({
      where: { clerkUserId },
      select: { id: true },
    })
  )

  if (!user) {
    const clerkUser = await (await clerkClient()).users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses?.[0]?.emailAddress
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email

    user = await withDbRetry(() =>
      prisma.user.create({
        data: {
          clerkUserId,
          name: name || "",
          email: email || "",
        },
        select: { id: true },
      })
    )
  }

  if (user?.id) {
    userIdCache.set(clerkUserId, user.id)
  }

  return user.id
})
