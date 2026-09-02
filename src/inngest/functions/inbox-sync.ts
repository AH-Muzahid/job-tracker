import { inngest } from "../client"
import { prisma, withDbRetry } from "@/lib/prisma"
import { syncUserInbox } from "@/lib/gmail-sync"

/**
 * Autonomous Inbound Email & Recruiter Reply Sync Agent
 * Runs every 1 hour to poll connected Google inboxes and auto-update application pipelines.
 */
export const inboxSyncScheduler = inngest.createFunction(
  {
    id: "inbox-sync-scheduler",
    name: "1-Hour Inbound Gmail Sync & Status Updater",
    triggers: [
      { cron: "0 * * * *" }, // Runs every 1 hour
      { event: "app/inbox-sync.trigger" },
    ],
  },
  async ({ step, event }) => {
    const targetUserId = event?.data && "userId" in event.data ? (event.data as { userId?: string }).userId : undefined

    // Step 1: Fetch accounts with connected Google OAuth
    const accounts = await step.run("fetch-connected-google-accounts", async () => {
      if (targetUserId) {
        return [{ userId: targetUserId }]
      }

      return withDbRetry(() =>
        prisma.connectedAccount.findMany({
          where: { provider: "google" },
          select: { userId: true },
        })
      )
    })

    let totalScanned = 0
    let totalMatched = 0
    let totalUpdated = 0

    // Step 2: Iterate and sync each connected user inbox
    for (const acc of accounts) {
      const syncResult = await step.run(`sync-inbox-${acc.userId}`, async () => {
        return syncUserInbox(acc.userId)
      })

      totalScanned += syncResult.messagesScanned
      totalMatched += syncResult.repliesMatched
      totalUpdated += syncResult.statusUpdates
    }

    return {
      status: "completed",
      usersProcessed: accounts.length,
      totalScanned,
      totalMatched,
      totalUpdated,
    }
  }
)
