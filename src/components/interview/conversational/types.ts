export type InterviewStep = "setup" | "interview" | "report"

export type InterviewerTone = "friendly" | "strict" | "startup-cto" | "architect"

export type VoiceGender = "female" | "male"

export type InterviewLanguage = "en" | "bn" | "mixed"

export interface DialogueMessage {
  role: "interviewer" | "candidate"
  text: string
  timestamp: string
}

export interface StarBreakdown {
  situation?: string
  task?: string
  action?: string
  result?: string
}

export interface KnowledgeGapItem {
  id: string
  topic: string
  type: "technical" | "behavioral"
  severity: "high" | "medium" | "low"
  questionAsked: string
  candidateAnswerSummary: string
  weaknessReason: string
  idealAnswer: string
  starBreakdown?: {
    situation?: string
    task?: string
    action?: string
    result?: string
  }
  keyTakeaways: string[]
  followUpPracticePrompt: string
}

export interface InterviewReportData {
  verdict: "Strong Hire" | "Hire" | "Lean Hire" | "Needs Improvement"
  overallScore: number
  technicalScore: number
  clarityScore: number
  executiveSummary?: string
  starBreakdown?: StarBreakdown
  strengths?: string[]
  improvementAreas?: string[]
  knowledgeGaps?: KnowledgeGapItem[]
}

export interface InterviewPhaseInfo {
  phaseNumber: number
  totalPhases: number
  phaseTitle: string
  isFinalWrapUp: boolean
}

export interface ConversationalVoiceInterviewModalProps {
  isOpen: boolean
  onClose: () => void
  initialRole?: string
  initialCompany?: string
  initialType?: string
  applicationId?: string
  onSessionSaved?: () => void
}
