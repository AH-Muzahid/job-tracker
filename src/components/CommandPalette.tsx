"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Search, LayoutDashboard, Briefcase, Building2, Brain, FileText, CalendarDays, Settings, ArrowRight } from "lucide-react"
import { useUI } from "@/lib/store"

const pages = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Applications", href: "/applications", icon: Briefcase },
  { title: "Companies", href: "/companies", icon: Building2 },
  { title: "Interview Prep", href: "/interview-prep", icon: Brain },
  { title: "Resumes", href: "/resumes", icon: FileText },
  { title: "Calendar", href: "/calendar", icon: CalendarDays },
  { title: "Settings", href: "/settings", icon: Settings },
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

  const filteredPages = pages.filter((p) =>
    !query.trim() || p.title.toLowerCase().includes(query.toLowerCase())
  )

  const allItems = [
    ...filteredPages.map((p) => ({
      id: p.href,
      title: p.title,
      href: p.href,
      icon: <p.icon className="h-4 w-4" />,
    })),
    ...results,
  ]

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleSelect = (href: string) => {
    router.push(href)
    setSearchOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((i) => (i + 1) % allItems.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((i) => (i - 1 + allItems.length) % allItems.length)
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      handleSelect(allItems[selectedIndex].href)
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
                Type to search...
              </div>
            )}
            {loading && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            )}
            {filteredPages.length > 0 && !query.trim() && (
              <div className="mb-1">
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pages</div>
                {filteredPages.map((page, i) => {
                  const ItemIcon = page.icon
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelect(page.href)}
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
            {results.length > 0 && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Applications</div>
                {results.map((result, i) => {
                  const idx = filteredPages.length + i
                  return (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result.href)}
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
            {query.trim() && filteredPages.length > 0 && results.length === 0 && !loading && (
              <div>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Pages</div>
                {filteredPages.map((page, i) => {
                  const ItemIcon = page.icon
                  return (
                    <button
                      key={page.href}
                      onClick={() => handleSelect(page.href)}
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
