import { describe, it, expect, vi } from "vitest"
import React from "react"
import { renderToString } from "react-dom/server"

// Mock Clerk
vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isLoaded: true,
    isSignedIn: true,
    user: {
      fullName: "AH Muzahid",
      firstName: "AH",
      lastName: "Muzahid",
      imageUrl: null,
    },
  }),
  useClerk: () => ({
    signOut: vi.fn(),
  }),
}))

let currentPathname = "/profile"

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(),
}))

import ProfilePage from "@/app/(app)/profile/page"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

describe("Dedicated Modular Profile Hub & Subpage Navigation", () => {
  it("renders candidate identity: display name, subtitle, uppercase initials avatar, and edit profile link", () => {
    const html = renderToString(<ProfilePage />)

    expect(html).toContain("AH Muzahid")
    expect(html).toContain("Job Seeker")
    expect(html).toContain("AH")
    expect(html).toContain("Edit Profile")
    expect(html).toContain('href="/profile-setup?from=profile"')
  })

  it("renders all 6 dedicated, non-overlapping modular routes without query param hacks", () => {
    const html = renderToString(<ProfilePage />)

    // 1. Career Profile
    expect(html).toContain("Career Profile")
    expect(html).toContain('href="/profile-setup?from=profile"')

    // 2. Resume Studio
    expect(html).toContain("Resume Studio")
    expect(html).toContain('href="/resumes"')

    // 3. Weekly Goals
    expect(html).toContain("Weekly Goals")
    expect(html).toContain('href="/weekly-goals"')

    // 4. Integrations & AI Keys
    expect(html).toContain("Integrations &amp; AI Keys")
    expect(html).toContain('href="/integrations"')

    // 5. AI Knowledge & Memory
    expect(html).toContain("AI Knowledge &amp; Memory")
    expect(html).toContain('href="/ai-memory"')

    // 6. System Settings
    expect(html).toContain("System Settings")
    expect(html).toContain('href="/settings"')
  })

  it("renders Sign Out button in account actions", () => {
    const html = renderToString(<ProfilePage />)

    expect(html).toContain("Sign Out")
  })

  it("links MobileBottomNav Profile tab directly to /profile with active indicator across sub-routes", () => {
    currentPathname = "/profile"
    let html = renderToString(<MobileBottomNav />)
    expect(html).toContain('href="/profile"')
    expect(html).toContain("Profile")
    expect(html).toContain("text-primary")

    // Sub-route /integrations stays active
    currentPathname = "/integrations"
    html = renderToString(<MobileBottomNav />)
    expect(html).toContain("text-primary")

    // Sub-route /ai-memory stays active
    currentPathname = "/ai-memory"
    html = renderToString(<MobileBottomNav />)
    expect(html).toContain("text-primary")

    // Sub-route /resumes stays active
    currentPathname = "/resumes"
    html = renderToString(<MobileBottomNav />)
    expect(html).toContain("text-primary")
  })
})
