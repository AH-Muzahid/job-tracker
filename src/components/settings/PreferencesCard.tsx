"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function PreferencesCard() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"))
  }, [])

  function toggleDark() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Moon className="h-4 w-4" /> Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground">Toggle dark theme</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggleDark}>
            {dark ? <Sun className="h-4 w-4 mr-1.5" /> : <Moon className="h-4 w-4 mr-1.5" />}
            {dark ? "Light" : "Dark"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
