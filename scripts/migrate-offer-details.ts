import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("Adding offerDetails JSONB column to Application table...")
  await prisma.$executeRawUnsafe(`ALTER TABLE "Application" ADD COLUMN IF NOT EXISTS "offerDetails" JSONB;`)
  console.log("Successfully verified/added offerDetails column.")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
