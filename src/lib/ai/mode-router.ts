import type { AIMode } from "./context-builder"

const JD_PATTERNS = [
  /requirements?/i, /responsibilities?/i, /qualifications?/i,
  /about the (role|position|job)/i, /what you['’]ll do/i,
  /what we['’]re looking for/i, /key skills/i,
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

export function classifyMode(message: string): AIMode {
  if (isLikelyJD(message)) return "jd-scan"
  if (APPLICATION_PATTERNS.some((p) => p.test(message))) return "application"
  if (TRACKER_PATTERNS.some((p) => p.test(message))) return "tracker"
  if (RESPONSE_PATTERNS.some((p) => p.test(message))) return "response"
  if (INTERVIEW_PATTERNS.some((p) => p.test(message))) return "interview"
  if (WEEKLY_PATTERNS.some((p) => p.test(message))) return "weekly"
  if (RECOVERY_PATTERNS.some((p) => p.test(message))) return "recovery"
  if (PROFILE_PATTERNS.some((p) => p.test(message))) return "profile"
  return "jd-scan"
}

function isLikelyJD(text: string): boolean {
  let matchCount = 0
  for (const pattern of JD_PATTERNS) {
    if (pattern.test(text)) matchCount++
  }
  const wordCount = text.split(/\s+/).length
  return matchCount >= 2 && wordCount > 50
}
