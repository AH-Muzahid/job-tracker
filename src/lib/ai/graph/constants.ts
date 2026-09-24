/**
 * Shared constants and policy defaults for CareerTrack AI Agent Graph
 */

export const GREETING_REGEX =
  /^(hi|hello|hey|hey there|hi there|hello there|halo|good morning|good afternoon|good evening|sup|yo|assalamu\s*alaikum|salaam|kemon acho)[\s!.?]*$/i

export const MAX_PLAN_STEPS = 5

export const MAX_TOOL_RESULT_BYTES = 2048 // 2KB cap for responder context injection

export const MAX_MESSAGE_HISTORY = 50

export const FALLBACK_GREETING_MESSAGE =
  "Hello! I am your CareerTrack AI assistant. I'm here to help you track job applications, optimize your resumes, practice interview questions, and discover new opportunities. How can I help you today?"

export const PLANNING_ERROR_FALLBACK =
  "I had trouble formulating an execution plan for that request. Could you please provide more details or rephrase?"
