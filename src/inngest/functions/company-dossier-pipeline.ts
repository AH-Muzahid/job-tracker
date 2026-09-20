import { inngest } from "../client"
import { compileCompanyDossier } from "@/lib/ai/agents/company-dossier-agent"

/**
 * Inngest event-driven workflow for automatic company research & interview dossier compilation.
 * Triggers whenever an application moves to "Interview" stage or on manual demand.
 */
export const companyDossierPipeline = inngest.createFunction(
  {
    id: "company-dossier-pipeline",
    name: "Automated Company Research & Interview Dossier Agent",
    retries: 2,
    triggers: [
      { event: "application/interview.scheduled" },
      { event: "application/dossier.generate" },
    ],
  },
  async ({ event, step }) => {
    const { applicationId, userId } = event.data as {
      applicationId: string
      userId: string
    }

    if (!applicationId || !userId) {
      return { skipped: true, reason: "Missing applicationId or userId" }
    }

    const result = await step.run("compile-company-dossier", async () => {
      return compileCompanyDossier(applicationId, userId)
    })

    return result
  }
)
