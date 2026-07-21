import { Webhook } from "svix"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { WebhookEvent } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: Request) {
  const SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET

  if (!SIGNING_SECRET) {
    return new NextResponse("Missing webhook signing secret", { status: 500 })
  }

  const headerPayload = await headers()
  const svixId = headerPayload.get("svix-id")
  const svixTimestamp = headerPayload.get("svix-timestamp")
  const svixSignature = headerPayload.get("svix-signature")

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new NextResponse("Missing svix headers", { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(SIGNING_SECRET)
  let evt: WebhookEvent

  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as WebhookEvent
  } catch {
    return new NextResponse("Invalid webhook signature", { status: 400 })
  }

  if (evt.type === "user.created" || evt.type === "user.updated") {
    const { id, email_addresses, first_name, last_name } = evt.data
    const email = email_addresses?.[0]?.email_address
    const name = [first_name, last_name].filter(Boolean).join(" ") || email

    await prisma.user.upsert({
      where: { clerkUserId: id },
      update: { name, email },
      create: {
        clerkUserId: id,
        name,
        email,
      },
    })
  }

  if (evt.type === "user.deleted") {
    const { id } = evt.data
    if (id) {
      await prisma.user.deleteMany({ where: { clerkUserId: id } })
    }
  }

  return NextResponse.json({ success: true })
}
