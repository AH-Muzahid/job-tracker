"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import Sidebar from "@/components/Sidebar"
import Navbar from "@/components/Navbar"
import { useUI } from "@/lib/store"

export default function Shell({ children }: { children: React.ReactNode }) {
  const initTheme = useUI((s) => s.initTheme)
  const pathname = usePathname()
  const isFullscreen = pathname.startsWith("/ai-assistant")

  useEffect(() => { initTheme() }, [initTheme])

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className={isFullscreen ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto px-4 py-6 sm:px-6"}>
          {children}
        </main>
      </div>
    </div>
  )
}
