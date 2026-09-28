export interface EvaluationRubric {
  /** Disallow brackets/tokens like [Company Name], [Your Name], [Hiring Manager] */
  disallowPlaceholders?: boolean
  /** Maximum allowed character count (e.g. 300 for LinkedIn connection notes) */
  maxCharacters?: number
  /** Minimum required character count */
  minCharacters?: number
  /** Specific mandatory keywords or skills that must appear in the text */
  requiredKeywords?: string[]
  /** Specific banned cliché or hallucination phrases */
  bannedPhrases?: string[]
  /** Custom semantic validator callback */
  customValidator?: (content: string) => { passed: boolean; feedback?: string }
}

export interface EvaluationResult {
  passed: boolean
  violations: string[]
}

/**
 * Checks if a string contains bracketed placeholders, avoiding false positives on markdown links.
 * E.g. matches "[Company Name]", "[Insert Date]" but ignores "[Portfolio](https://...)"
 */
export function detectPlaceholders(text: string): string[] {
  const placeholders: string[] = []
  // Matches [word] not followed immediately by (url)
  const regex = /\[(?!\s*https?:\/\/)([^\]\n]{2,50})\](?!\()/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    const candidate = match[1].trim()
    // Common placeholder tokens
    const isLikelyPlaceholder =
      /^(company|hiring|recruiter|your|candidate|job|title|insert|target|role|date|skill|team|placeholder|fill|name|email|phone)/i.test(
        candidate
      ) ||
      candidate.includes("...") ||
      candidate.includes("Name") ||
      candidate.includes("Company") ||
      candidate.includes("Manager")

    if (isLikelyPlaceholder) {
      placeholders.push(`[${candidate}]`)
    }
  }

  return Array.from(new Set(placeholders))
}

/**
 * Evaluates draft content against an EvaluationRubric.
 * Returns whether it passed and an array of actionable critique feedback.
 */
export function evaluateDraft(content: string, rubric: EvaluationRubric): EvaluationResult {
  const violations: string[] = []

  if (rubric.disallowPlaceholders) {
    const foundPlaceholders = detectPlaceholders(content)
    if (foundPlaceholders.length > 0) {
      violations.push(
        `Draft contains unresolved placeholders that must be replaced with real data: ${foundPlaceholders.join(", ")}`
      )
    }
  }

  if (rubric.maxCharacters !== undefined && content.length > rubric.maxCharacters) {
    violations.push(
      `Draft exceeds maximum allowed length of ${rubric.maxCharacters} characters (current length: ${content.length}). Please compress.`
    )
  }

  if (rubric.minCharacters !== undefined && content.length < rubric.minCharacters) {
    violations.push(
      `Draft is under minimum required length of ${rubric.minCharacters} characters (current length: ${content.length}).`
    )
  }

  if (rubric.requiredKeywords && rubric.requiredKeywords.length > 0) {
    const missing = rubric.requiredKeywords.filter((kw) => !content.toLowerCase().includes(kw.toLowerCase()))
    if (missing.length > 0) {
      violations.push(`Draft is missing key technical competencies/keywords: ${missing.join(", ")}`)
    }
  }

  if (rubric.bannedPhrases && rubric.bannedPhrases.length > 0) {
    const foundBanned = rubric.bannedPhrases.filter((bp) => content.toLowerCase().includes(bp.toLowerCase()))
    if (foundBanned.length > 0) {
      violations.push(`Draft contains prohibited phrases: ${foundBanned.join(", ")}`)
    }
  }

  if (rubric.customValidator) {
    const customRes = rubric.customValidator(content)
    if (!customRes.passed && customRes.feedback) {
      violations.push(customRes.feedback)
    }
  }

  return {
    passed: violations.length === 0,
    violations,
  }
}

export interface GeneratorContext {
  iteration: number
  previousDraft?: string
  critiqueFeedback?: string[]
}

export interface RunEvaluatorOptimizerOptions<TOutput = string> {
  generator: (ctx: GeneratorContext) => Promise<TOutput>
  rubric: EvaluationRubric
  maxIterations?: number
  textExtractor?: (output: TOutput) => string
  fallbackSanitizer?: (content: string) => string
}

export interface EvaluatorOptimizerResult<TOutput = string> {
  content: TOutput
  rawText: string
  passed: boolean
  iterations: number
  selfCorrected: boolean
  violations: string[]
  usedFallbackSanitizer?: boolean
}

/**
 * Executes a Reflexion / Evaluator-Optimizer loop.
 * 1. Generates an initial draft.
 * 2. Runs the Evaluator rubric against the draft.
 * 3. If evaluation passes, returns immediately (1 iteration).
 * 4. If evaluation fails, feeds critique feedback back to the generator for self-correction.
 * 5. If max iterations exceeded, optionally applies fallbackSanitizer.
 */
export async function runEvaluatorOptimizer<TOutput = string>(
  options: RunEvaluatorOptimizerOptions<TOutput>
): Promise<EvaluatorOptimizerResult<TOutput>> {
  const { generator, rubric, maxIterations = 2, textExtractor, fallbackSanitizer } = options

  let currentDraft: TOutput | null = null
  let currentText = ""
  let evalResult: EvaluationResult = { passed: false, violations: [] }
  let iterations = 0

  while (iterations < maxIterations) {
    iterations++

    const ctx: GeneratorContext = {
      iteration: iterations,
      previousDraft: currentText || undefined,
      critiqueFeedback: evalResult.violations.length > 0 ? evalResult.violations : undefined,
    }

    currentDraft = await generator(ctx)
    currentText = textExtractor ? textExtractor(currentDraft) : String(currentDraft)

    evalResult = evaluateDraft(currentText, rubric)

    if (evalResult.passed) {
      return {
        content: currentDraft,
        rawText: currentText,
        passed: true,
        iterations,
        selfCorrected: iterations > 1,
        violations: [],
      }
    }
  }

  // Max iterations reached without passing
  let finalDraft: TOutput = currentDraft as TOutput
  let usedFallback = false

  if (fallbackSanitizer) {
    if (typeof finalDraft === "string") {
      finalDraft = fallbackSanitizer(finalDraft) as unknown as TOutput
      currentText = String(finalDraft)
      usedFallback = true
    }
  }

  return {
    content: finalDraft,
    rawText: currentText,
    passed: evalResult.passed,
    iterations,
    selfCorrected: false,
    violations: evalResult.violations,
    usedFallbackSanitizer: usedFallback,
  }
}
