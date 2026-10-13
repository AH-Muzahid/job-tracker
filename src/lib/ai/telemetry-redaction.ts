
const sensitive = /^(?:apiKey|secret|password|authorization|accessToken|refreshToken|token|jwt|fullName|name|candidateName|notes|bodyText|body|content|messages|goal|plan|textContent|embedding|responseContent|dialogue|prompt|systemPrompt)$/i
export function redactTelemetry(data: unknown, depth = 0): unknown {
  if (depth > 8) return "[REDACTED]"
  // Free text may contain names and arbitrary credentials that regexes cannot identify.
  // Operational traces retain numeric metrics/structure; textual content is excluded by default.
  if (typeof data === "string") return "[REDACTED TEXT]"
  if (Array.isArray(data)) return data.slice(0, 30).map((item) => redactTelemetry(item, depth + 1))
  if (data && typeof data === "object") return Object.fromEntries(Object.entries(data).slice(0, 50).map(([key, value]) => [key, sensitive.test(key) ? "[REDACTED]" : redactTelemetry(value, depth + 1)]))
  return data
}
