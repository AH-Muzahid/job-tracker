// Returns Efferd-compliant neutral company avatar style.
// Fixed (not random) — avoids SSR/client hydration mismatch.
export function getCompanyColor(): string {
  return "bg-muted/40 border-border text-muted-foreground"
}

export function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "J"
  )
}
