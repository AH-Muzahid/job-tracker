"use client"

import { User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface AccountInfoCardProps {
  name?: string | null
  email?: string | null
}

export function AccountInfoCard({ name, email }: AccountInfoCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <User className="h-4 w-4" /> Account Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Name</span>
          <span className="font-medium">{name || "N/A"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Email</span>
          <span className="font-medium">{email || "N/A"}</span>
        </div>
      </CardContent>
    </Card>
  )
}
