import { serve } from "inngest/next"
import { inngest } from "@/inngest/client"
import { dailyJobHuntFunction } from "@/inngest/functions/daily-job-hunt"
import { weeklyGoalDigestFunction } from "@/inngest/functions/weekly-goal-digest"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    dailyJobHuntFunction,
    weeklyGoalDigestFunction,
  ],
})
