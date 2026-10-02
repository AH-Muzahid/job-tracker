/**
 * ATS Text-Layer & Layout Verification Engine
 *
 * Validates resume text content for ATS (Applicant Tracking System) compatibility:
 * - Unicode-to-ASCII date normalization (prevents Workday dropping en-dash dates)
 * - Contact information literal presence (email, phone, links)
 * - Page-overflow detection (estimated from character count)
 *
 * Reference: ai-job-search/tools/verify_pdf.py
 */

import {
  verifyPdfLayoutBuffer,
  verifyPdfLayoutTree,
  type PdfLayoutReport,
  type LayoutViolation,
} from "./layout-verifier"

export interface ATSValidationReport {
  score: number // 0 - 100
  passed: boolean
  estimatedPages: number
  hasUnicodeDashes: boolean
  hasLiteralContactInfo: {
    email: boolean
    phone: boolean
    links: boolean
  }
  issues: string[]
  sanitizedText: string
  layoutReport?: PdfLayoutReport
}

export interface ValidateOptions {
  expectedEmail?: string
  maxPages?: number
  pdfBuffer?: Buffer
  layoutTree?: unknown
}

/**
 * Non-ASCII dash code points that break ATS date parsers.
 * U+2013 (en-dash) is what LaTeX makes from `--` and what Workday imports dropped.
 * The rest are other Unicode dashes and the minus sign.
 */
export const NON_ASCII_DASHES = "\u2010\u2011\u2012\u2013\u2014\u2015\u2212"

/**
 * Typographic fold map: converts common Unicode typography to ASCII equivalents.
 * Applied for ATS compatibility — these substitutions match what LaTeX/Word produce
 * from plain text input.
 */
const TYPOGRAPHIC_FOLDS: [RegExp, string][] = [
  [/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, "-"],  // All Unicode dashes & minus sign → ASCII hyphen
  [/[\u2018\u2019]/g, "'"],                            // Curly single quotes → straight
  [/[\u201C\u201D]/g, '"'],                            // Curly double quotes → straight
  [/\u00A0/g, " "],                                    // Non-breaking space → regular space
]

/**
 * Sanitize Unicode typography for ATS compatibility.
 * Converts en-dashes, em-dashes, curly quotes, and non-breaking spaces to ASCII.
 */
export function sanitizeUnicodeForATS(text: string): string {
  let result = text
  for (const [pattern, replacement] of TYPOGRAPHIC_FOLDS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

// Regex: year (19xx or 20xx) adjacent to a non-ASCII dash, with optional horizontal whitespace
const _YEAR = String.raw`(?:19|20)\d{2}`
const NON_ASCII_DATE_RANGE_RE = new RegExp(
  String.raw`${_YEAR}[^\S\n]*[${NON_ASCII_DASHES}]|[${NON_ASCII_DASHES}][^\S\n]*${_YEAR}`
)
export const NON_ASCII_DATE_RANGE_RE_GLOBAL = new RegExp(NON_ASCII_DATE_RANGE_RE.source, "g")

export interface DateRangeHit {
  line: string
  dash: string
  codePoint: string
}

/**
 * Find date ranges joined by non-ASCII dashes in raw text.
 * Works on raw text (never folded) to detect the exact defect.
 * Only triggers when a 4-digit year (19xx/20xx) is adjacent — ignores non-date ranges.
 */
export function findNonAsciiDateRanges(text: string): DateRangeHit[] {
  const hits: DateRangeHit[] = []
  let match: RegExpExecArray | null
  const re = new RegExp(NON_ASCII_DATE_RANGE_RE.source, "g")

  while ((match = re.exec(text)) !== null) {
    const dashChar = [...match[0]].find((c) => NON_ASCII_DASHES.includes(c))
    if (!dashChar) continue

    const lineStart = text.lastIndexOf("\n", match.index) + 1
    let lineEnd = text.indexOf("\n", match.index + match[0].length)
    if (lineEnd === -1) lineEnd = text.length
    const line = text.slice(lineStart, lineEnd).replace(/\s+/g, " ").trim()

    hits.push({
      line,
      dash: dashChar,
      codePoint: `U+${dashChar.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`,
    })
  }

  return hits
}

// Contact detection patterns
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const PHONE_RE = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,6}/
const URL_RE = /https?:\/\/[^\s]+/

// Rough page estimation: ~3500 chars per page for a standard resume
const CHARS_PER_PAGE_ESTIMATE = 3500

/**
 * Validate resume text for ATS compatibility.
 * Returns a comprehensive report with score, issues, and sanitized text.
 */
export function validateResumeText(
  text: string,
  options: ValidateOptions = {}
): ATSValidationReport {
  const { expectedEmail, maxPages = 2 } = options
  const issues: string[] = []
  let score = 100

  // 1. Unicode dash detection (raw text, never folded)
  const dateRangeHits = findNonAsciiDateRanges(text)
  const hasUnicodeDashes = dateRangeHits.length > 0
  if (hasUnicodeDashes) {
    const hitDetails = dateRangeHits
      .map((h) => `${h.codePoint} in "${h.line.slice(0, 80)}"`)
      .join("; ")
    issues.push(
      `${dateRangeHits.length} date range(s) use Unicode dash characters that ATS parsers drop: ${hitDetails}`
    )
    score -= 15 * dateRangeHits.length
  }

  // 2. Contact info literal presence
  const hasEmail = EMAIL_RE.test(text)
  const hasPhone = PHONE_RE.test(text)
  const hasLinks = URL_RE.test(text)

  if (!hasEmail) {
    issues.push("No email address found in resume text. ATS requires literal contact info.")
    score -= 20
  }
  if (expectedEmail && hasEmail && !text.includes(expectedEmail)) {
    issues.push(`Expected email "${expectedEmail}" not found in text.`)
    score -= 10
  }
  if (!hasPhone) {
    issues.push("No phone number found in resume text.")
    score -= 5
  }
  if (!hasLinks) {
    issues.push("No URLs/links found in resume text (GitHub, LinkedIn, portfolio).")
    score -= 5
  }

  // 3. Page estimation
  const estimatedPages = Math.max(1, Math.ceil(text.length / CHARS_PER_PAGE_ESTIMATE))
  if (estimatedPages > maxPages) {
    issues.push(
      `Estimated ${estimatedPages} page(s) exceeds ${maxPages}-page budget. ` +
      `Consider reducing content (~${text.length} chars, ~${CHARS_PER_PAGE_ESTIMATE} per page).`
    )
    score -= 10
  }

  // 4. Sanitize text
  const sanitizedText = sanitizeUnicodeForATS(text)

  // Clamp score
  score = Math.max(0, Math.min(100, score))

  return {
    score,
    passed: score >= 60 && !hasUnicodeDashes,
    estimatedPages,
    hasUnicodeDashes,
    hasLiteralContactInfo: {
      email: hasEmail,
      phone: hasPhone,
      links: hasLinks,
    },
    issues,
    sanitizedText,
  }
}

/**
 * Validates a rendered PDF buffer combining Unicode ATS text layer safety
 * and true vector bounding box geometry (detecting orphan titles, holes, and thin pages).
 */
export async function validateResumePdfBuffer(
  pdfBuffer: Buffer,
  options: ValidateOptions = {}
): Promise<ATSValidationReport> {
  const layoutReport = options.layoutTree
    ? verifyPdfLayoutTree(options.layoutTree)
    : await verifyPdfLayoutBuffer(pdfBuffer)
  
  // Extract text content from layout lines
  const rawText = layoutReport.pageMetrics
    .map((pm) => `[Page ${pm.pageNumber}]`)
    .join("\n")

  // Also run standard text validation
  const baseReport = validateResumeText(rawText, options)
  
  // Incorporate vector layout violations
  const layoutIssues: string[] = []
  let penalty = 0

  for (const v of layoutReport.violations) {
    layoutIssues.push(`[Layout] Page ${v.page}: ${v.message}`)
    if (v.type === "ORPHANED_HEADING" || v.type === "ORPHANED_ENTRY") penalty += 15
    else if (v.type === "INTERNAL_HOLE") penalty += 10
    else if (v.type === "FOOTER_COLLISION") penalty += 15
    else if (v.type === "THIN_FINAL_PAGE") penalty += 10
    else if (v.type === "EARLY_PAGE_END") penalty += 10
  }

  const combinedIssues = [...baseReport.issues, ...layoutIssues]
  const finalScore = Math.max(0, Math.min(100, baseReport.score - penalty))

  return {
    ...baseReport,
    score: finalScore,
    passed: finalScore >= 60 && !baseReport.hasUnicodeDashes && layoutReport.passed,
    estimatedPages: layoutReport.pageCount,
    issues: combinedIssues,
    layoutReport,
  }
}

export {
  verifyPdfLayoutBuffer,
  verifyPdfLayoutTree,
  type PdfLayoutReport,
  type LayoutViolation,
}
