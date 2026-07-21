"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Download, Moon, Sun, User, Bell } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }
    setDark(document.documentElement.classList.contains("dark"))
  }, [isLoaded, isSignedIn, router])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  async function exportData() {
    try {
      const res = await fetch("/api/applications?pageSize=500")
      const data = await res.json()
      const applications = data.data || []

      const headers = ["Company", "Job Title", "Source", "Status", "Date", "URL", "Notes"]
      const rows = applications.map((a: Record<string, unknown>) => [
        a.companyName, a.jobTitle, a.source, a.status,
        new Date(a.applicationDate as string).toLocaleDateString(),
        a.jobUrl || "", a.notes || "",
      ])

      const csv = [headers, ...rows].map((r) => r.map((c: unknown) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
      const blob = new Blob([csv], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `careertrack-export-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("Exported successfully")
    } catch {
      toast.error("Export failed")
    }
  }

  if (!isLoaded) {
    return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-40 w-full" /></div>
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><User className="h-4 w-4" /> Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{user?.fullName || "User"}</p>
              <p className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/user-profile")}>
              Manage
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Sun className="h-4 w-4" /> Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark Mode</p>
              <p className="text-xs text-muted-foreground">Toggle between light and dark theme</p>
            </div>
            <Button variant="outline" size="sm" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4 mr-1.5" /> : <Moon className="h-4 w-4 mr-1.5" />}
              {dark ? "Light" : "Dark"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Download className="h-4 w-4" /> Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Export Applications</p>
              <p className="text-xs text-muted-foreground">Download all applications as CSV</p>
            </div>
            <Button variant="outline" size="sm" onClick={exportData}>
              <Download className="h-4 w-4 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2"><Bell className="h-4 w-4" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Reminders</p>
              <p className="text-xs text-muted-foreground">Get notified about interview deadlines</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              Coming Soon
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
