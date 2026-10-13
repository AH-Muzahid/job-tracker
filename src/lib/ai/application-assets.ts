import { z } from "zod"
import { prisma, withDbRetry } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"
import { AIAccessError } from "./ownership"

const identity = z.string().min(1).max(128)
const patchSchema = z.record(z.string().max(100), z.json()).refine((value) => JSON.stringify(value).length <= 150000)

/** Merge only changed asset keys in the DB; concurrent writers retain unrelated assets. */
export async function mergeApplicationAssets(userId: string, applicationId: string, patch: Record<string, unknown>, transaction?: Pick<Prisma.TransactionClient, "$executeRaw">) {
  identity.parse(userId); identity.parse(applicationId)
  const validated = patchSchema.parse(JSON.parse(JSON.stringify(patch)))
  const client = transaction || prisma
  const affected = await withDbRetry(() => client.$executeRaw`
    INSERT INTO "ApplicationAnalysis" ("id", "applicationId", "tailoredResumeJson", "analyzedAt")
    SELECT ${crypto.randomUUID()}, "id", ${JSON.stringify(validated)}::jsonb, CURRENT_TIMESTAMP
    FROM "Application" WHERE "id" = ${applicationId} AND "userId" = ${userId}
    ON CONFLICT ("applicationId") DO UPDATE
    SET "tailoredResumeJson" = COALESCE("ApplicationAnalysis"."tailoredResumeJson", '{}'::jsonb) || EXCLUDED."tailoredResumeJson"
  `)
  if (affected !== 1) throw new AIAccessError()
}
