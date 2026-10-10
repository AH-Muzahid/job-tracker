import { inngest } from "@/inngest/client"
import { recordJobRunToRing } from "./telemetry-ring"

export type PipelineCategory =
  | "Job Discovery"
  | "Autonomous Agent"
  | "Application Workflow"
  | "Intelligence & Memory"
  | "Communications & Calendar"

export interface InngestPipelineMetadata {
  id: string
  name: string
  description: string
  category: PipelineCategory
  triggerType: "cron" | "event" | "hybrid"
  cronSchedule?: string
  triggerEvent: string
  retries: number
}

export const INNGEST_PIPELINE_CATALOG: InngestPipelineMetadata[] = [
  {
    id: "daily-job-hunt-scheduler",
    name: "Daily Job Hunt Scheduler",
    description: "Scans active user profiles daily every morning at 8:00 AM BST and dispatches tailored job match alerts.",
    category: "Job Discovery",
    triggerType: "hybrid",
    cronSchedule: "0 2 * * * (Daily 02:00 UTC / 08:00 BST)",
    triggerEvent: "app/job-hunt.trigger",
    retries: 2,
  },
  {
    id: "process-user-audit-batch",
    name: "Process User Audit Batch Worker",
    description: "Worker that executes parallel semantic scoring and sends email digests for user batches.",
    category: "Job Discovery",
    triggerType: "event",
    triggerEvent: "career/batch.audit.process",
    retries: 2,
  },
  {
    id: "batch-job-release-scheduler",
    name: "6-Hour Staged Job Release Scheduler",
    description: "Master 6-hour fanout dispatcher that publishes staged job batches and refreshes discovery feed.",
    category: "Job Discovery",
    triggerType: "hybrid",
    cronSchedule: "0 */6 * * * (Every 6h UTC)",
    triggerEvent: "app/job-batch.trigger",
    retries: 2,
  },
  {
    id: "process-user-job-batch-worker",
    name: "Process User Job Batch Worker",
    description: "Executes 7-day rolling archival and promotes scored opportunities from STAGED to PUBLISHED.",
    category: "Job Discovery",
    triggerType: "event",
    triggerEvent: "career/job-batch.process",
    retries: 2,
  },
  {
    id: "linkedin-harvest-scheduler",
    name: "LinkedIn Opportunities Harvester",
    description: "Collects high-signal LinkedIn opportunities, enforces language gate and deduplication.",
    category: "Job Discovery",
    triggerType: "event",
    triggerEvent: "discovery/linkedin-harvest.trigger",
    retries: 2,
  },
  {
    id: "global-job-crawl-scheduler",
    name: "Global Job Board Crawler",
    description: "Multi-board scrapers crawler that pulls external listings into the CanonicalJob catalog.",
    category: "Job Discovery",
    triggerType: "hybrid",
    cronSchedule: "0 */4 * * * (Every 4h UTC)",
    triggerEvent: "discovery/global-crawl.trigger",
    retries: 2,
  },
  {
    id: "agent-proactive-daemon",
    name: "Autonomous Proactive Career Daemon",
    description: "Inspects stale applications (>7 days without reply), generates follow-up drafts and notifications.",
    category: "Autonomous Agent",
    triggerType: "hybrid",
    cronSchedule: "0 8 * * * (Daily 08:00 UTC)",
    triggerEvent: "agent/proactive.scan",
    retries: 2,
  },
  {
    id: "career-orchestrator-pipeline",
    name: "Career Orchestrator Autonomous Pipeline",
    description: "Runs LangGraph end-to-end autonomous goal execution, discovery, and package generation.",
    category: "Autonomous Agent",
    triggerType: "event",
    triggerEvent: "career/orchestrator.execute",
    retries: 2,
  },
  {
    id: "summarize-chat-session",
    name: "Chat Session Summarizer",
    description: "Synthesizes closed interactive chats into episodic memories and updates user preferences.",
    category: "Intelligence & Memory",
    triggerType: "event",
    triggerEvent: "app/chat.summarize",
    retries: 2,
  },
  {
    id: "inbox-sync-scheduler",
    name: "Google / Outlook Inbox Sync Scheduler",
    description: "Synchronizes Gmail and Outlook inboxes to detect interview invitations and offer status updates.",
    category: "Communications & Calendar",
    triggerType: "hybrid",
    cronSchedule: "0 * * * * (Hourly UTC)",
    triggerEvent: "app/inbox-sync.trigger",
    retries: 2,
  },
  {
    id: "interview-reminder-pipeline",
    name: "Interview Reminder Pipeline",
    description: "Monitors upcoming interview schedules and alerts candidates with briefing prep notes.",
    category: "Communications & Calendar",
    triggerType: "hybrid",
    cronSchedule: "*/30 * * * * (Every 30m UTC)",
    triggerEvent: "app/interview-reminders.check",
    retries: 2,
  },
  {
    id: "company-dossier-pipeline",
    name: "Company Dossier Intelligence Pipeline",
    description: "Builds deep company research dossiers, leadership backgrounds, and salary intelligence.",
    category: "Application Workflow",
    triggerType: "event",
    triggerEvent: "application/dossier.generate",
    retries: 2,
  },
  {
    id: "weekly-memory-hygiene",
    name: "Weekly Memory Hygiene & Decay Digest",
    description: "Decays stale episodic memories, consolidates core traits, and strengthens knowledge graph.",
    category: "Intelligence & Memory",
    triggerType: "hybrid",
    cronSchedule: "0 3 * * 0 (Sun 03:00 UTC)",
    triggerEvent: "app/memory-hygiene.trigger",
    retries: 2,
  },
  {
    id: "weekly-goal-digest-agent",
    name: "Weekly Goal Digest & Strategy Review",
    description: "Analyzes weekly target achievements, application milestones, and formulates next week's focus.",
    category: "Autonomous Agent",
    triggerType: "hybrid",
    cronSchedule: "0 20 * * 0 (Sun 20:00 UTC)",
    triggerEvent: "app/weekly-goals.review",
    retries: 2,
  },
]

export function getInngestPipelineById(id: string): InngestPipelineMetadata | undefined {
  return INNGEST_PIPELINE_CATALOG.find((p) => p.id === id)
}

/**
 * Dispatches an on-demand event to Inngest for a specific pipeline.
 */
export async function triggerInngestPipeline(
  pipelineId: string,
  payload: Record<string, unknown> = {}
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  const pipeline = getInngestPipelineById(pipelineId)
  if (!pipeline) {
    return { success: false, error: `Unknown pipeline ID: ${pipelineId}` }
  }

  const startTime = Date.now()

  try {
    const response = await inngest.send({
      name: pipeline.triggerEvent,
      data: {
        ...payload,
        triggeredAt: new Date().toISOString(),
        triggeredBy: payload.triggeredBy || "admin-ops-console",
      },
    })

    const eventId = response?.ids?.[0] || `evt_${Date.now()}`
    const durationMs = Date.now() - startTime

    // Record job trigger to ring buffer with rich logs
    void recordJobRunToRing({
      functionId: pipeline.id,
      eventId,
      status: "completed",
      durationMs,
      startedAt: new Date().toISOString(),
      details: {
        eventName: pipeline.triggerEvent,
        category: pipeline.category,
        cronSchedule: pipeline.cronSchedule || "On-Demand Only",
        retries: pipeline.retries,
        triggeredBy: payload.triggeredBy || "admin-ops-console",
      },
      logs: [
        `[${new Date().toLocaleTimeString()}] Event dispatched: ${pipeline.triggerEvent}`,
        `[${new Date().toLocaleTimeString()}] Event ID: ${eventId}`,
        `[${new Date().toLocaleTimeString()}] Duration: ${durationMs}ms`,
        `[${new Date().toLocaleTimeString()}] Handed off to Inngest Background Worker successfully.`,
      ],
    })

    return {
      success: true,
      eventId,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    const durationMs = Date.now() - startTime
    void recordJobRunToRing({
      functionId: pipeline.id,
      status: "failed",
      durationMs,
      error: errorMsg,
      startedAt: new Date().toISOString(),
      logs: [
        `[${new Date().toLocaleTimeString()}] Trigger Attempt Failed: ${pipeline.triggerEvent}`,
        `[${new Date().toLocaleTimeString()}] Error: ${errorMsg}`,
      ],
    })

    return {
      success: false,
      error: errorMsg,
    }
  }
}
