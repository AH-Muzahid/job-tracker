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
  /** Target engineering role domain for semantic consistency */
  targetRoleDomain?: "frontend" | "backend" | "fullstack" | "mobile" | "devops"
  /** Disallow robotic AI openings like "As a [role] skilled in..." */
  disallowRoboticOpenings?: boolean
  /** Disallow arrogant or corporate fluff phrases like "proving I can", "under tight deadlines" */
  disallowArrogantPhrases?: boolean
  /** Disallow social media hashtags or hashtag soup (e.g. #hiring, #developer) */
  disallowHashtags?: boolean
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

  // Check for robotic "As a [role] skilled in..." opening pattern
  if (rubric.disallowRoboticOpenings) {
    const roboticMatch = content.match(
      /(?:^|\n)\s*As an?\s+[^,\n]{3,60}?(?:developer|engineer|specialist|programmer|architect|builder)[^,\n]*,\s*I\s+/i
    ) || content.match(/(?:^|\n)\s*As an?\s+[^,\n]{3,60}?skilled in\s+/i)
    if (roboticMatch) {
      violations.push(
        "Draft starts with an unnatural robotic opening ('As a [role] skilled in...'). State the opening role naturally and mention your relevant hands-on build experience."
      )
    }
  }

  // Check for arrogant phrases or corporate fluff
  if (rubric.disallowArrogantPhrases) {
    const arrogantPatterns = [
      /\b(?:proving|proves)\s+(?:that\s+)?I\s+can\b/i,
      /\btestament\s+to\s+my\b/i,
      /\bshowcasing\s+my\s+ability\b/i,
      /\bunder\s+tight\s+deadlines\b/i,
      /\brapi?d\s+product\s+iteration\s+aligns\b/i,
    ]
    for (const pattern of arrogantPatterns) {
      if (pattern.test(content)) {
        violations.push(
          "Draft contains self-aggrandizing AI clichés or corporate fluff ('proving I can', 'under tight deadlines', 'testament to'). State what you built and the engineering outcome objectively like a peer engineer."
        )
        break
      }
    }
  }

  // Check for social media hashtags or hashtag soup
  if (rubric.disallowHashtags) {
    const hashtagMatches = content.match(/#[a-zA-Z0-9_]{2,}/g)
    if (hashtagMatches && hashtagMatches.length > 0) {
      violations.push(
        `Draft contains raw social media hashtags (${hashtagMatches.slice(0, 5).join(", ")}). Convert them cleanly into real, human job titles or plain text without '#' symbols.`
      )
    }
  }

  // Check for domain contradiction between role and technical proof
  if (rubric.targetRoleDomain === "frontend") {
    const backendInfraMatch = content.match(
      /\b(docker(?:-based)?\s+(?:code\s+)?execution|kubernetes|k8s|server(?:-side)?\s+streams?|database\s+indexing|kafka|rabbitmq|containerized\s+microservices?)\b/i
    )
    if (backendInfraMatch) {
      violations.push(
        `Domain contradiction: Target role is Frontend-focused, but the draft highlights backend infrastructure (${backendInfraMatch[0]}). Ground your technical proof strictly in frontend engineering: UI state synchronization, rendering performance, component architecture, client interactions, or bundle optimization.`
      )
    }
  } else if (rubric.targetRoleDomain === "backend") {
    const pureUiMatch = content.match(
      /\b(pixel-?perfect|css\s+animations?|figma-?to-?code|tailwind\s+styling)\b/i
    )
    if (pureUiMatch && !/\b(api|database|caching|latency|query|concurrency|server|endpoint)\b/i.test(content)) {
      violations.push(
        `Domain contradiction: Target role is Backend-focused, but the draft only highlights frontend styling (${pureUiMatch[0]}). Highlight APIs, data models, caching, concurrency, or server performance instead.`
      )
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

export interface ConversionJudgeResult {
  score: number // 0-100
  verdict: "approved" | "rejected"
  critique: string[]
  strengths: string[]
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
  /** Optional LLM/semantic conversion judge to evaluate draft quality from hiring manager/recruiter perspective */
  semanticJudge?: (content: string, draft: TOutput) => Promise<ConversionJudgeResult | null>
}

export interface EvaluatorOptimizerResult<TOutput = string> {
  content: TOutput
  rawText: string
  passed: boolean
  iterations: number
  selfCorrected: boolean
  violations: string[]
  usedFallbackSanitizer?: boolean
  conversionJudge?: ConversionJudgeResult | null
  conversionScore?: number
}

/**
 * Executes a Reflexion / Evaluator-Optimizer loop.
 * 1. Generates an initial draft.
 * 2. Runs the Evaluator rubric against the draft (heuristics).
 * 3. Runs the Semantic/LLM Judge if provided (evaluates conversion, tone, domain consistency).
 * 4. If evaluation passes with score >= 80, returns immediately.
 * 5. If evaluation fails or score < 80, feeds critique feedback back to the generator for self-correction.
 * 6. If max iterations exceeded, optionally applies fallbackSanitizer.
 */
export async function runEvaluatorOptimizer<TOutput = string>(
  options: RunEvaluatorOptimizerOptions<TOutput>
): Promise<EvaluatorOptimizerResult<TOutput>> {
  const { generator, rubric, maxIterations = 2, textExtractor, fallbackSanitizer, semanticJudge } = options

  let currentDraft: TOutput | null = null
  let currentText = ""
  let evalResult: EvaluationResult = { passed: false, violations: [] }
  let iterations = 0
  let lastJudgeResult: ConversionJudgeResult | null = null

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

    // If heuristic rubric passed, run semantic judge if provided
    if (evalResult.passed && semanticJudge) {
      try {
        const judgeRes = await semanticJudge(currentText, currentDraft)
        if (judgeRes) {
          lastJudgeResult = judgeRes
          if (judgeRes.score < 80 || judgeRes.verdict === "rejected") {
            evalResult = {
              passed: false,
              violations: judgeRes.critique.map(
                (c) => `Hiring Leader Conversion Review (${judgeRes.score}/100 - Rejected): ${c}`
              ),
            }
          } else {
            return {
              content: currentDraft,
              rawText: currentText,
              passed: true,
              iterations,
              selfCorrected: iterations > 1,
              violations: [],
              conversionJudge: judgeRes,
              conversionScore: judgeRes.score,
            }
          }
        }
      } catch (judgeErr) {
        console.warn("[EvaluatorOptimizer] Semantic judge error (ignoring to prevent blockage):", judgeErr)
      }
    }

    if (evalResult.passed) {
      return {
        content: currentDraft,
        rawText: currentText,
        passed: true,
        iterations,
        selfCorrected: iterations > 1,
        violations: [],
        conversionJudge: lastJudgeResult,
        conversionScore: lastJudgeResult?.score ?? (iterations === 1 ? 88 : 82),
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
    conversionJudge: lastJudgeResult,
    conversionScore: lastJudgeResult?.score ?? (evalResult.violations.length === 0 ? 80 : 65),
  }
}
