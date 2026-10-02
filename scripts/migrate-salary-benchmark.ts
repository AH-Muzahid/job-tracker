import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("Creating SalaryBenchmark table and indexes if not exists...")
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SalaryBenchmark" (
      "id" TEXT NOT NULL,
      "company" TEXT NOT NULL,
      "role" TEXT,
      "location" TEXT,
      "salaryMin" DOUBLE PRECISION,
      "salaryMax" DOUBLE PRECISION,
      "salaryMedian" DOUBLE PRECISION,
      "salaryIndex" DOUBLE PRECISION,
      "currency" TEXT NOT NULL DEFAULT 'USD',
      "sampleSize" INTEGER DEFAULT 1,
      "source" TEXT NOT NULL,
      "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
      "category" TEXT,
      "metadata" JSONB,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "SalaryBenchmark_pkey" PRIMARY KEY ("id")
    );
  `)

  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalaryBenchmark_company_idx" ON "SalaryBenchmark"("company");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalaryBenchmark_role_idx" ON "SalaryBenchmark"("role");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalaryBenchmark_location_idx" ON "SalaryBenchmark"("location");`)
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "SalaryBenchmark_company_role_idx" ON "SalaryBenchmark"("company", "role");`)

  console.log("Successfully created SalaryBenchmark table and indexes.")
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
