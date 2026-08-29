/**
 * PII detection and masking before LLM injection.
 * Redacts emails, phone numbers, and URLs to prevent PII leakage to external LLM providers.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_REGEX = /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g

/**
 * Mask an email address: "john@example.com" → "j***@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return "***"
  if (local.length === 1) return `***@${domain}`
  return `${local[0]}***@${domain}`
}

/**
 * Mask a URL: "https://linkedin.com/in/john" → "https://***.com/**"
 */
export function maskUrl(url: string): string {
  try {
    const parsed = new URL(url)
    return `${parsed.protocol}//***.com/**`
  } catch {
    return "***"
  }
}

/**
 * Detect if a string contains PII patterns.
 */
export function containsPII(text: string): boolean {
  return EMAIL_REGEX.test(text) || PHONE_REGEX.test(text) || URL_REGEX.test(text)
}

/**
 * Sanitize text by masking all PII patterns.
 * Resets regex lastIndex between calls (since they use /g flag).
 */
export function sanitizePII(text: string): string {
  if (!text) return ""

  let result = text

  // Reset and replace emails
  EMAIL_REGEX.lastIndex = 0
  result = result.replace(EMAIL_REGEX, (match) => maskEmail(match))

  // Reset and replace phone numbers
  PHONE_REGEX.lastIndex = 0
  result = result.replace(PHONE_REGEX, (match) => {
    const digits = match.replace(/\D/g, "")
    if (digits.length >= 10) {
      return `***-***-${digits.slice(-4)}`
    }
    return "***"
  })

  // Reset and replace URLs (only external URLs, not internal links)
  URL_REGEX.lastIndex = 0
  result = result.replace(URL_REGEX, (match) => maskUrl(match))

  return result
}
