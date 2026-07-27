import { cache } from "react"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma, withDbRetry } from "@/lib/prisma"

export const getInternalUserId = cache(async function getInternalUserId() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

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

  return user.id
})
