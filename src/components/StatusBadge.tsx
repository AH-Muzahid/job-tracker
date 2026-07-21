import { Badge } from "@/components/ui/badge"

const statusVariantMap: Record<string, "saved" | "applied" | "assessment" | "interview" | "rejected" | "offer"> = {
  Saved: "saved",
  Applied: "applied",
  Assessment: "assessment",
  Interview: "interview",
  Rejected: "rejected",
  Offer: "offer",
}

export default function StatusBadge({ status }: { status: string }) {
  const variant = statusVariantMap[status] || "default"
  return <Badge variant={variant}>{status}</Badge>
}
