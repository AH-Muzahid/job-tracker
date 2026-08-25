import type { AIMode } from "./context-builder"

const JD_PATTERNS = [
  /requirements?/i, /responsibilities?/i, /qualifications?/i,
  /about the (role|position|job)/i, /what you['’]ll do/i,
  /what we['’]re looking for/i, /key skills/i,
  /the role/i, /tech stack/i, /experience:/i, /location:/i,
  /job description/i, /nice to have/i, /bonus points/i,
  /apply to/i, /salary:/i, /minimum qualifications/i
]

const APPLICATION_PATTERNS = [
  /i want to apply/i, /generate (cover letter|email|outreach)/i,
  /write (an|a|the) (email|cover letter|application)/i,
  /draft (an?|the) (application|email)/i,
]

const TRACKER_PATTERNS = [
  /i applied/i, /(just|already) applied/i, /got (rejected|accepted)/i,
  /received (a|an) (task|offer|assignment)/i,
  /(got|had) (an?|the) interview/i, /follow.?up/i,
  /rejected (from|by)/i, /offer (from|by)/i,
  /pipeline/i, /applications?/i, /tracker/i,
  /summary.*(application|pipeline|status|job)/i,
  /(?:add|create|save|track|record|update|change|mark|set)\s+(?:a\s+)?(?:new\s+)?(?:application|status|role|job)/i,
  /(?:in|to)\s+(?:applied|interview|assessment|saved|offer|rejected)\s+status/i,
  /update\s+status/i,
]

const RESPONSE_PATTERNS = [
  /dear/i, /regards/i, /best regards/i, /sincerely/i,
  /thank you for (applying|your interest|reaching out)/i,
  /we are (pleased|happy|excited) to (inform|invite)/i,
  /unfortunately|regret to inform/i,
]

const INTERVIEW_PATTERNS = [
  /interview/i, /coding (task|challenge|test)/i,
  /take.?home/i, /assignment/i, /live coding/i,
  /help me prepare/i, /practice/i,
]

const WEEKLY_PATTERNS = [
  /weekly goals/i, /set goals/i, /this week/i,
  /week(ly)? (plan|review|summary)/i,
  /goals for (this|the) week/i,
]

const RECOVERY_PATTERNS = [
  /feels? (stuck|down|frustrated|hopeless)/i,
  /(feeling|experiencing) burnout/i,
  /no (responses|replies|interviews)/i,
  /what am i doing wrong/i,
  /i (keep|always) get(ting)? rejected/i,
]

const PROFILE_PATTERNS = [
  /update (my )?profile/i, /set up (my )?profile/i,
  /onboarding/i, /first time/i,
  /upload (resume|my resume)/i,
]

const DIRECT_JD_PROMPTS = [
  /(analyze|evaluate|review|scan|check|match)\s+(this\s+)?(job|jd|role|position|posting)/i,
  /job\s+(description|posting)/i,
  /fit\s+for\s+(this\s+)?(role|job|position)/i,
]

export function classifyMode(message: string): AIMode {
  if (isLikelyJD(message)) return "jd-scan"
  if (APPLICATION_PATTERNS.some((p) => p.test(message))) return "application"
  if (TRACKER_PATTERNS.some((p) => p.test(message))) return "tracker"
  if (RESPONSE_PATTERNS.some((p) => p.test(message))) return "response"
  if (INTERVIEW_PATTERNS.some((p) => p.test(message))) return "interview"
  if (WEEKLY_PATTERNS.some((p) => p.test(message))) return "weekly"
  if (RECOVERY_PATTERNS.some((p) => p.test(message))) return "recovery"
  if (PROFILE_PATTERNS.some((p) => p.test(message))) return "profile"
  return "general"
}

function isLikelyJD(text: string): boolean {
  if (DIRECT_JD_PROMPTS.some((p) => p.test(text))) return true

  let matchCount = 0
  for (const pattern of JD_PATTERNS) {
    if (pattern.test(text)) matchCount++
  }
  const wordCount = text.split(/\s+/).length
  return (matchCount >= 2 && wordCount > 30) || (matchCount >= 1 && /https?:\/\//i.test(text))
}
