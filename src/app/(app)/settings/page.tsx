"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Download, Moon, Sun, User, Bell, Bot, CheckCircle, XCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()
  const [dark, setDark] = useState(false)
  const [aiProvider, setAiProvider] = useState("openai")
  const [aiApiKey, setAiApiKey] = useState("")
  const [aiBaseUrl, setAiBaseUrl] = useState("")
  const [aiModel, setAiModel] = useState("")
  const [hasApiKey, setHasApiKey] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<boolean | null>(null)

  useEffect(() => {
    if (!isLoaded) return
    if (!isSignedIn) { router.push("/login"); return }
    setDark(document.documentElement.classList.contains("dark"))
    loadAiConfig()
  }, [isLoaded, isSignedIn, router])

  async function loadAiConfig() {
    try {
      const res = await fetch("/api/settings/ai-key")
      if (res.ok) {
        const data = await res.json()
        setHasApiKey(data.hasKey)
        if (data.providerType) setAiProvider(data.providerType)
        if (data.baseUrl) setAiBaseUrl(data.baseUrl)
        if (data.model) setAiModel(data.model)
      }
    } catch {}
  }

  async function saveAiConfig() {
    setSavingAi(true)
    try {
      const res = await fetch("/api/settings/ai-key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: aiProvider,
          apiKey: aiApiKey || undefined,
          baseUrl: aiProvider === "custom-openai" ? aiBaseUrl : undefined,
          model: aiProvider === "custom-openai" ? aiModel : undefined,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      toast.success("AI configuration saved")
      setHasApiKey(true)
    } catch {
      toast.error("Failed to save AI config")
    } finally {
      setSavingAi(false)
    }
  }

  async function testConnection() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
      })
      setTestResult(res.ok)
      if (!res.ok) toast.error("Connection failed. Check your API key.")
    } catch {
      setTestResult(false)
      toast.error("Connection failed")
    } finally {
      setTesting(false)
    }
  }

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
          <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" /> AI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider Type</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              value={aiProvider}
              onChange={(e) => setAiProvider(e.target.value)}
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="custom-openai">Custom (OpenAI-compatible)</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input
              type="password"
              value={aiApiKey}
              onChange={(e) => setAiApiKey(e.target.value)}
              placeholder={hasApiKey ? "•••••••••• (saved)" : "sk-..."}
            />
          </div>

          {aiProvider === "custom-openai" && (
            <>
              <div className="space-y-2">
                <Label>Base URL</Label>
                <Input
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                  placeholder="https://api.openrouter.ai/v1"
                />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="deepseek-chat"
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={saveAiConfig} disabled={savingAi}>
              {savingAi ? "Saving..." : "Save"}
            </Button>
            {hasApiKey && (
              <Button size="sm" variant="outline" onClick={testConnection} disabled={testing}>
                {testing ? "Testing..." : "Test Connection"}
              </Button>
            )}
            {testResult !== null && (
              <span className={`flex items-center gap-1 text-xs ${testResult ? "text-emerald-600" : "text-destructive"}`}>
                {testResult ? <><CheckCircle className="h-3 w-3" /> Connected</> : <><XCircle className="h-3 w-3" /> Failed</>}
              </span>
            )}
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
