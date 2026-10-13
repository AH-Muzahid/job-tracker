import { prisma, withDbRetry } from "@/lib/prisma"

export class AIAccessError extends Error {
  constructor(message = "Application not found") { super(message); this.name = "AIAccessError" }
}

/** Call before generating, retrieving evidence or mutating an application asset. */
export async function requireOwnedApplication(userId: string, applicationId: string) {
  const application = await withDbRetry(() => prisma.application.findFirst({
    where: { id: applicationId, userId },
  }))
  if (!application) throw new AIAccessError()
  return application
}
