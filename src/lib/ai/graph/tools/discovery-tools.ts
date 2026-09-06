import { executeCreateApplication } from "./job-tools"

// Re-export all discovery sub-modules for seamless backward-compatibility across the application
export * from "@/lib/discovery/types"
export * from "@/lib/discovery/matching"
export * from "@/lib/discovery/scrapers"
export * from "@/lib/discovery/preferences"
export * from "@/lib/discovery/scoring"

/**
 * Saves an external discovered job directly to the user's Application tracker
 */
export async function executeSaveJobOpportunityToTracker(
  userId: string,
  input: {
    companyName: string
    jobTitle: string
    jobUrl?: string
    location?: string
    salary?: string
    notes?: string
    status?: string
  }
) {
  const noteParts = [
    input.notes,
    input.location ? `Location: ${input.location}` : null,
    input.salary ? `Salary: ${input.salary}` : null,
    "Discovered via CareerTrack Autonomous Multi-Board Job Discovery Engine",
  ].filter(Boolean)

  return await executeCreateApplication(userId, {
    companyName: input.companyName,
    jobTitle: input.jobTitle,
    jobUrl: input.jobUrl,
    source: "Discovery Engine",
    status: input.status || "Saved",
    notes: noteParts.join("\n"),
  })
}
