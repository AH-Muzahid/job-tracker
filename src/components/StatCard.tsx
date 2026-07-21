import { Card, CardContent } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: number
  className?: string
}

export default function StatCard({ label, value, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col items-center justify-center p-4 text-center">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}
