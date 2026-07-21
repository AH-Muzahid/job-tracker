import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

async function getOrCreateUser(clerkUserId: string) {
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

  return user
}

export async function GET() {
  const { userId: clerkUserId } = await auth()
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await getOrCreateUser(clerkUserId)

  const allApps = await prisma.application.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })

  const total = allApps.length

  const stats = {
    total,
    saved: allApps.filter((a) => a.status === "Saved").length,
    applied: allApps.filter((a) => a.status === "Applied").length,
    assessment: allApps.filter((a) => a.status === "Assessment").length,
    interview: allApps.filter((a) => a.status === "Interview").length,
    rejected: allApps.filter((a) => a.status === "Rejected").length,
    offer: allApps.filter((a) => a.status === "Offer").length,
    recent: allApps.slice(0, 5),
  }

  return NextResponse.json(stats)
}
