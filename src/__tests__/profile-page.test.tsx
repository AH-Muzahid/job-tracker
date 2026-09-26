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

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/profile",
}))

import ProfilePage from "@/app/(app)/profile/page"
import { MobileBottomNav } from "@/components/mobile-bottom-nav"

describe("Mobile-First Profile Page & Bottom Nav (Design Taste & Impeccable)", () => {
  it("renders candidate identity: display name, subtitle, and uppercase initials avatar", () => {
    const html = renderToString(<ProfilePage />)

    expect(html).toContain("AH Muzahid")
    expect(html).toContain("Job Seeker")
    expect(html).toContain("AH")
    expect(html).toContain("Edit Profile")
    expect(html).toContain('href="/profile-setup"')
  })

  it("renders all 6 menu navigation rows matching the mobile reference mockup", () => {
    const html = renderToString(<ProfilePage />)

    // 1. Career Profile
    expect(html).toContain("Career Profile")
    expect(html).toContain('href="/profile-setup"')

    // 2. Resume
    expect(html).toContain("Resume")
    expect(html).toContain('href="/resumes"')

    // 3. Preferences
    expect(html).toContain("Preferences")
    expect(html).toContain('href="/settings?tab=general"')

    // 4. Job Alerts
    expect(html).toContain("Job Alerts")
    expect(html).toContain('href="/discovery"')

    // 5. Integrations
    expect(html).toContain("Integrations")
    expect(html).toContain('href="/settings?tab=integrations"')

    // 6. Settings
    expect(html).toContain("Settings")
    expect(html).toContain('href="/settings"')
  })

  it("renders Sign Out button in account actions", () => {
    const html = renderToString(<ProfilePage />)

    expect(html).toContain("Sign Out")
  })

  it("links MobileBottomNav Profile tab directly to /profile with active indicator", () => {
    const html = renderToString(<MobileBottomNav />)

    expect(html).toContain('href="/profile"')
    expect(html).toContain("Profile")
    // When pathname is /profile, it should have active styling
    expect(html).toContain("text-primary")
  })
})
