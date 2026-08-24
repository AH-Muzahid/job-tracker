export function getCompanyColor() {
  return "bg-muted/60 text-foreground border-border"
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
