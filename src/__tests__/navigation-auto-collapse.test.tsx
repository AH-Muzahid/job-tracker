import { describe, it, expect, vi } from "vitest"
import React, { useEffect } from "react"
import { render } from "@testing-library/react"

const mockSetOpen = vi.fn()
const mockSetOpenMobile = vi.fn()

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({
    setOpen: mockSetOpen,
    setOpenMobile: mockSetOpenMobile,
    isMobile: false,
  }),
}))

let mockAiSidebarOpen = false

vi.mock("@/lib/store", () => ({
  useUI: (selector?: (s: any) => any) => {
    const state = { aiSidebarOpen: mockAiSidebarOpen }
    return selector ? selector(state) : state
  },
}))

import { useSidebar } from "@/components/ui/sidebar"
import { useUI } from "@/lib/store"

function TestNavigationAutoCollapse() {
  const aiSidebarOpen = useUI((s) => s.aiSidebarOpen)
  const { setOpen, isMobile, setOpenMobile } = useSidebar()

  useEffect(() => {
    if (aiSidebarOpen) {
      setOpen(false)
      if (isMobile) {
        setOpenMobile(false)
      }
    }
  }, [aiSidebarOpen, setOpen, isMobile, setOpenMobile])

  return null
}

describe("Navigation Auto Collapse on AI Chat Sidebar Open", () => {
  it("calls setOpen(false) when aiSidebarOpen transitions to true", () => {
    mockAiSidebarOpen = true
    render(<TestNavigationAutoCollapse />)

    expect(mockSetOpen).toHaveBeenCalledWith(false)
  })
})
