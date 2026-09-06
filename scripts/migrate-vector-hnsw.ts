import { prisma } from "../src/lib/prisma"

async function main() {
  console.log("🚀 Starting pgvector & HNSW migration for CanonicalJob...")

  try {
    // 1. Enable pgvector extension
    console.log("Enabling vector extension...")
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`)
    console.log("✅ Extension 'vector' enabled.")

    // 2. Add embedding column if not exists
    console.log("Adding embedding column if not present...")
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'CanonicalJob' AND column_name = 'embedding'
        ) THEN
          ALTER TABLE "CanonicalJob" ADD COLUMN embedding vector(1536);
        END IF;
      END $$;
    `)
    console.log("✅ Column 'embedding vector(1536)' ready.")

    // 3. Add employmentType column if not exists
    console.log("Adding employmentType column if not present...")
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'CanonicalJob' AND column_name = 'employmentType'
        ) THEN
          ALTER TABLE "CanonicalJob" ADD COLUMN "employmentType" TEXT NOT NULL DEFAULT 'full-time';
        END IF;
      END $$;
    `)
    console.log("✅ Column 'employmentType' ready.")

    // 4. Create HNSW index
    console.log("Creating HNSW index on CanonicalJob.embedding...")
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS canonical_job_embedding_hnsw_idx 
      ON "CanonicalJob" 
      USING hnsw (embedding vector_cosine_ops)
      WHERE "isExpired" = false;
    `)
    console.log("✅ HNSW index 'canonical_job_embedding_hnsw_idx' created.")

    // 5. Test index with sample EXPLAIN query
    const dummyVector = new Array(1536).fill(0.01).join(",")
    const explainRes = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(`
      EXPLAIN ANALYZE 
      SELECT id, (1 - (embedding <=> '[${dummyVector}]'::vector)) AS similarity
      FROM "CanonicalJob"
      WHERE "isExpired" = false AND embedding IS NOT NULL
      ORDER BY embedding <=> '[${dummyVector}]'::vector ASC
      LIMIT 25;
    `)
    console.log("📊 Vector Index Query Execution Plan:")
    explainRes.forEach((row) => console.log("   ", row["QUERY PLAN"]))

    console.log("🎉 pgvector & HNSW migration successfully completed!")
  } catch (err) {
    console.error("❌ Migration error:", err)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()
