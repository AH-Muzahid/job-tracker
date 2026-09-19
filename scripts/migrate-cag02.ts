import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("Checking and adding columns to ApplicationAnalysis...")
  await prisma.$executeRawUnsafe(`ALTER TABLE "ApplicationAnalysis" ADD COLUMN IF NOT EXISTS "outreachSubject" TEXT;`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "ApplicationAnalysis" ADD COLUMN IF NOT EXISTS "outreachBody" TEXT;`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "ApplicationAnalysis" ADD COLUMN IF NOT EXISTS "outreachChecklist" JSONB;`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "ApplicationAnalysis" ADD COLUMN IF NOT EXISTS "outreachGeneratedAt" TIMESTAMP(3);`)
  await prisma.$executeRawUnsafe(`ALTER TABLE "ApplicationAnalysis" ADD COLUMN IF NOT EXISTS "tailoredResumeJson" JSONB;`)
  console.log("Migration executed successfully!")
}

main()
  .catch((err) => {
    console.error("Migration failed:", err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
