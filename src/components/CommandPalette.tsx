"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, LayoutDashboard, Briefcase, Building2, Brain, FileText, CalendarDays, Settings, ArrowRight, Plus, Mail } from "lucide-react"
import { useUI } from "@/lib/store"
import { toast } from "sonner"

const pages = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Applications", href: "/applications", icon: Briefcase },
  { title: "Companies", href: "/companies", icon: Building2 },
  { title: "Interview Prep", href: "/interview-prep", icon: Brain },
  { title: "Resumes", href: "/resumes", icon: FileText },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Settings", href: "/settings", icon: Settings },
]

const slashCommands = [
  { title: "/status", placeholder: "/status [Company] [Status]", description: "Change status of a job (e.g. /status Acme Applied)", icon: Briefcase },
  { title: "/add", placeholder: "/add [Company] [Title]", description: "Add a new job application (e.g. /add Google Frontend)", icon: Plus },
  { title: "/outreach", placeholder: "/outreach [Company]", description: "Open AI outreach draft workbench", icon: Mail },
  { title: "/prep", placeholder: "/prep [Company]", description: "Open AI interview prep workbench", icon: Brain },
]

interface SearchResult {
  id: string
  title: string
  subtitle?: string
  href: string
  icon: React.ReactNode
}

export default function CommandPalette() {
  const router = useRouter()
  const searchOpen = useUI((s) => s.searchOpen)
  const setSearchOpen = useUI((s) => s.setSearchOpen)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/applications?search=${encodeURIComponent(q)}&limit=5`)
      if (res.ok) {
        const data = await res.json()
        const items = (data.applications || []).map((app: Record<string, unknown>) => ({
          id: app.id as string,
          title: (app.position || app.company || "Untitled") as string,
          subtitle: app.company as string | undefined,
          href: `/applications`,
          icon: <Briefcase className="h-4 w-4" />,
        }))
        setResults(items)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        search(query)
      } else {
        setResults([])
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query, search])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
      if (e.key === "Escape" && searchOpen) {
        setSearchOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchOpen, setSearchOpen])

  useEffect(() => {
    if (searchOpen) {
      setQuery("")
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  const handleCommandExecute = async (cmdText: string) => {
    const parts = cmdText.trim().split(" ")
    const command = parts[0].toLowerCase()

    if (command === "/add") {
      const company = parts[1]
      const title = parts.slice(2).join(" ")
      if (!company || !title) {
        toast.error("Format: /add [Company] [Title]")
        return
      }
      setLoading(true)
      try {
        const res = await fetch("/api/applications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyName: company,
            jobTitle: title,
            source: "LinkedIn",
            status: "Saved",
            applicationDate: new Date().toISOString(),
          }),
        })
        if (!res.ok) throw new Error()
        const app = await res.json()
        toast.success(`Application created for ${title} at ${company}!`)
        setSearchOpen(false)
        router.push(`/applications/${app.id}`)
        router.refresh()
      } catch {
        toast.error("Failed to create application via command")
      } finally {
        setLoading(false)
      }
    } else if (command === "/status") {
      const status = parts[parts.length - 1]
      const queryName = parts.slice(1, parts.length - 1).join(" ")
      const validStatuses = ["Saved", "Applied", "Assessment", "Interview", "Rejected", "Offer"]
      const matchedStatus = validStatuses.find(s => s.toLowerCase() === status.toLowerCase())

      if (!queryName || !matchedStatus) {
        toast.error("Format: /status [Company] [Saved|Applied|Assessment|Interview|Rejected|Offer]")
        return
      }

      setLoading(true)
      try {
        const searchRes = await fetch(`/api/applications?search=${encodeURIComponent(queryName)}&limit=1`)
        const data = await searchRes.json()
        const app = data.applications?.[0] || data.data?.[0]
        if (!app) {
          toast.error(`Application matching "${queryName}" not found`)
          return
        }

        const updateRes = await fetch(`/api/applications/${app.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: matchedStatus }),
        })
        if (!updateRes.ok) throw new Error()
        toast.success(`Updated ${app.companyName} status to ${matchedStatus}!`)
        setSearchOpen(false)
        router.refresh()
      } catch {
        toast.error("Failed to update status via command")
      } finally {
        setLoading(false)
      }
    } else if (command === "/outreach" || command === "/prep") {
      const queryName = parts.slice(1).join(" ")
      if (!queryName) {
        toast.error(`Format: ${command} [Company]`)
        return
      }
      setLoading(true)
      try {
        const searchRes = await fetch(`/api/applications?search=${encodeURIComponent(queryName)}&limit=1`)
        const data = await searchRes.json()
        const app = data.applications?.[0] || data.data?.[0]
        if (!app) {
          toast.error(`Application matching "${queryName}" not found`)
          return
        }
        setSearchOpen(false)
        router.push(`/applications/${app.id}`)
      } catch {
        toast.error("Failed to process command")
      } finally {
        setLoading(false)
      }
    } else {
      toast.error("Unknown command")
    }
  }

  const isCommand = query.startsWith("/")
  const filteredCommands = isCommand
    ? slashCommands.filter((sc) => sc.title.toLowerCase().startsWith(query.toLowerCase().split(" ")[0]))
    : []

  const filteredPages = isCommand
    ? []
    : pages.filter((p) =>
        !query.trim() || p.title.toLowerCase().includes(query.toLowerCase())
      )

  const allItems = isCommand
    ? filteredCommands.map((sc) => ({
        id: sc.title,
        title: sc.placeholder,
        subtitle: sc.description,
        href: sc.title + " ",
        icon: <sc.icon className="h-4 w-4" />,
        isCmd: true
      }))
    : [
        ...filteredPages.map((p) => ({
          id: p.href,
          title: p.title,
          subtitle: undefined,
          href: p.href,
          icon: <p.icon className="h-4 w-4" />,
          isCmd: false
        })),
        ...results.map((r) => ({
          ...r,
          isCmd: false
        })),
      ]

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = (item: typeof allItems[0]) => {
    if (item.isCmd) {
      setQuery(item.href)
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      router.push(item.href)
      setSearchOpen(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => (allItems.length > 0 ? (i + 1) % allItems.length : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => (allItems.length > 0 ? (i - 1 + allItems.length) % allItems.length : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const currentItem = allItems[selectedIndex]
      if (currentItem) {
        if (isCommand && query.trim().split(" ").length > 1) {
          handleCommandExecute(query)
        } else {
          handleSelect(currentItem)
        }
      }
    }
  }

  useEffect(() => {
    if (selectedIndex >= allItems.length) {
      setSelectedIndex(Math.max(0, allItems.length - 1))
    }
  }, [allItems.length, selectedIndex])

  if (!searchOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => setSearchOpen(false)}
      />
      <div className="fixed inset-x-0 top-[15vh] mx-auto max-w-lg px-4">
        <div className="rounded-xl border bg-background shadow-2xl">
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search pages, applications..."
              className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
              ESC
            </kbd>
          </div>
          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {allItems.length === 0 && query.trim() && !loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
            {allItems.length === 0 && !query.trim() && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type to search pages, or type / for commands...
              </div>
            )}
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {isCommand && filteredCommands.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Slash Commands</div>
                {allItems.map((item, i) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                      selectedIndex === i ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
                    }`}
                  >
                    {item.icon}
                    <div className="flex-1 text-left">
                      <div className="font-mono text-xs font-semibold text-indigo-400">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">{item.subtitle}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {!isCommand && filteredPages.length > 0 && !query.trim() && (
              <div className="mb-1">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pages</div>
                {filteredPages.map((page, i) => {
                  const ItemIcon = page.icon
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelect({ id: page.href, title: page.title, href: page.href, icon: null, isCmd: false })}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                        selectedIndex === i ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-left">{page.title}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            )}
            {!isCommand && results.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Applications</div>
                {results.map((result, i) => {
                  const idx = filteredPages.length + i
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect({ id: result.id, title: result.title, href: result.href, icon: null, isCmd: false })}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                        selectedIndex === idx ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
                      }`}
                    >
                      {result.icon}
                      <div className="flex-1 text-left">
                        <div>{result.title}</div>
                        {result.subtitle && (
                          <div className="text-xs text-muted-foreground">{result.subtitle}</div>
                        )}
                      </div>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            )}
            {!isCommand && query.trim() && filteredPages.length > 0 && results.length === 0 && !loading && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pages</div>
                {filteredPages.map((page, i) => {
                  const ItemIcon = page.icon
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelect({ id: page.href, title: page.title, href: page.href, icon: null, isCmd: false })}
                      onMouseEnter={() => setSelectedIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-sm transition-colors ${
                        selectedIndex === i ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent"
                      }`}
                    >
                      <ItemIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="flex-1 text-left">{page.title}</span>
                      <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
