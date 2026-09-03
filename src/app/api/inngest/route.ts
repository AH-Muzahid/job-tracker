import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { dailyJobHuntScheduler, processUserAuditBatch } from "@/inngest/functions/daily-job-hunt"
import { weeklyGoalDigestFunction } from "@/inngest/functions/weekly-goal-digest"
import { weeklyMemoryHygiene } from "@/inngest/functions/memory-decay-digest"
import { summarizeChatSessionFunction } from "@/inngest/functions/chat-summarizer"
import { inboxSyncScheduler } from "@/inngest/functions/inbox-sync"
import { batchJobReleaseScheduler, processUserJobBatchWorker } from "@/inngest/functions/batch-job-pipeline"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyJobHuntScheduler,
    processUserAuditBatch,
    weeklyGoalDigestFunction,
    weeklyMemoryHygiene,
    summarizeChatSessionFunction,
    inboxSyncScheduler,
    batchJobReleaseScheduler,
    processUserJobBatchWorker,
  ],
})

