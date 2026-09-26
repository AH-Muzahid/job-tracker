export interface OpportunityDetailData {
  id: string
  matchId: string | null
  title: string
  company: string
  location: string
  isRemote: boolean
  url: string
  sourceBoard: string
  tags: string[]
  salary: string
  cleanSalary: string
  description: string
  postedAt: string
  visaSponsorship: string
  employmentType: string
  fitScore: number
  matchRationale: string | null
  isSaved: boolean
  isStaged: boolean
  appliedStatus: string | null
  applicationId: string | null
  scores: {
    overall: number
    skillsMatch: number
    experienceMatch: number
    roleFit: number
    companyFit: number
  }
  rationaleParsed?: {
    scoreBreakdown?: string
    roleMatch?: string
    techStack?: string
    experienceFit?: string
    strategyTip?: string
    allPoints?: { title: string; content: string; icon?: string }[]
  }
  companyEnrichment?: {
    verified: boolean
    stage?: string
    teamSize?: string
    domain?: string
    description?: string
  }
}

export interface SimilarOpportunityItem {
  id: string
  jobId: string
  title: string
  company: string
  location: string
  isRemote: boolean
  url: string
  fitScore: number
  tags: string[]
  isSaved: boolean
}

export type DetailTab = "overview" | "match" | "company" | "similar"
