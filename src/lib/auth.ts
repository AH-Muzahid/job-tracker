import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function getInternalUserId() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) return null

  let user = await prisma.user.findUnique({
    where: { clerkUserId },
    select: { id: true },
  })

  if (!user) {
    const clerkUser = await (await clerkClient()).users.getUser(clerkUserId)
    const email = clerkUser.emailAddresses?.[0]?.emailAddress
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email

    user = await prisma.user.create({
      data: {
        clerkUserId,
        name: name || "",
        email: email || "",
      },
      select: { id: true },
    })
  }

  return user.id
}
