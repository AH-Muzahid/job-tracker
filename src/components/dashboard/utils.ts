// Deterministic hash-based company avatar palette to avoid SSR hydration mismatches
const COMPANY_PALETTES = [
  { bg: "bg-blue-500/10 dark:bg-blue-500/15", border: "border-blue-500/25", text: "text-blue-600 dark:text-blue-400" },
  { bg: "bg-violet-500/10 dark:bg-violet-500/15", border: "border-violet-500/25", text: "text-violet-600 dark:text-violet-400" },
  { bg: "bg-emerald-500/10 dark:bg-emerald-500/15", border: "border-emerald-500/25", text: "text-emerald-600 dark:text-emerald-400" },
  { bg: "bg-amber-500/10 dark:bg-amber-500/15", border: "border-amber-500/25", text: "text-amber-600 dark:text-amber-400" },
  { bg: "bg-rose-500/10 dark:bg-rose-500/15", border: "border-rose-500/25", text: "text-rose-600 dark:text-rose-400" },
  { bg: "bg-indigo-500/10 dark:bg-indigo-500/15", border: "border-indigo-500/25", text: "text-indigo-600 dark:text-indigo-400" },
  { bg: "bg-cyan-500/10 dark:bg-cyan-500/15", border: "border-cyan-500/25", text: "text-cyan-600 dark:text-cyan-400" },
  { bg: "bg-teal-500/10 dark:bg-teal-500/15", border: "border-teal-500/25", text: "text-teal-600 dark:text-teal-400" },
  { bg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15", border: "border-fuchsia-500/25", text: "text-fuchsia-600 dark:text-fuchsia-400" },
]

export function getCompanyColor(name?: string): string {
  if (!name) return `${COMPANY_PALETTES[0].bg} ${COMPANY_PALETTES[0].border} ${COMPANY_PALETTES[0].text}`
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % COMPANY_PALETTES.length
  const p = COMPANY_PALETTES[index]
  return `${p.bg} ${p.border} ${p.text}`
}

export function getInitials(name: string) {
  if (!name) return "J"
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "J"
  )
}
