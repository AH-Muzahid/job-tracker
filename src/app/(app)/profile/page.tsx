"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useUser, useClerk } from "@clerk/nextjs"
import {
  User,
  FileText,
  SlidersHorizontal,
  Bell,
  Cpu,
  Settings,
  ChevronRight,
  LogOut,
  Pencil,
} from "lucide-react"

import { PageContainer } from "@/components/primitives"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface UserProfileData {
  firstName?: string | null
  lastName?: string | null
  headline?: string | null
  targetRoles?: string[]
  location?: string | null
  workPreference?: string | null
}

interface ProfileMenuItem {
  id: string
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const MENU_ITEMS: ProfileMenuItem[] = [
  {
    id: "career-profile",
    label: "Career Profile",
    href: "/profile-setup",
    icon: User,
  },
  {
    id: "resume",
    label: "Resume",
    href: "/resumes",
    icon: FileText,
  },
  {
    id: "preferences",
    label: "Preferences",
    href: "/settings?tab=general",
    icon: SlidersHorizontal,
  },
  {
    id: "job-alerts",
    label: "Job Alerts",
    href: "/discovery",
    icon: Bell,
  },
  {
    id: "integrations",
    label: "Integrations",
    href: "/settings?tab=integrations",
    icon: Cpu,
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

export default function ProfilePage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  const [profile, setProfile] = useState<UserProfileData | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/login")
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (!isSignedIn) return
    let isMounted = true

    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile")
        if (res.ok && isMounted) {
          const data: UserProfileData = await res.json()
          setProfile(data)
        }
      } catch (err) {
        console.error("Failed to load user profile:", err)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [isSignedIn])

  // Resolve user display name
  const displayName =
    user?.fullName ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    "AH Muzahid"

  // Resolve candidate role / headline
  const headline =
    profile?.headline ||
    profile?.targetRoles?.[0] ||
    "Job Seeker"

  // Derive candidate uppercase initials
  const initials = (() => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    }
    if (user?.fullName) {
      const parts = user.fullName.trim().split(/\s+/)
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      }
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (profile?.firstName && profile?.lastName) {
      return `${profile.firstName[0]}${profile.lastName[0]}`.toUpperCase()
    }
    return "AH"
  })()

  if (!isLoaded) {
    return (
      <PageContainer>
        <div className="max-w-md mx-auto w-full space-y-6 pt-4 pb-20">
          {/* Avatar & Header Skeleton */}
          <div className="flex flex-col items-center text-center space-y-3">
            <Skeleton className="size-20 sm:size-24 rounded-full" />
            <div className="space-y-1.5 flex flex-col items-center">
              <Skeleton className="h-6 w-36 rounded-[4px]" />
              <Skeleton className="h-4 w-24 rounded-[4px]" />
            </div>
            <Skeleton className="h-8 w-28 rounded-[6px] mt-2" />
          </div>

          {/* Menu Skeleton */}
          <div className="rounded-[6px] border border-border bg-card overflow-hidden divide-y divide-border">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-3.5 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-[4px]" />
                  <Skeleton className="h-4 w-28 rounded-[4px]" />
                </div>
                <Skeleton className="size-4 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="max-w-md mx-auto w-full space-y-6 pt-2 sm:pt-4 pb-24">
        {/* Top subtle edit trigger */}
        <div className="flex items-center justify-between px-1">
          <Link
            href="/profile-setup"
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-[4px] transition-colors"
            title="Edit Profile"
          >
            <Pencil className="size-4" />
          </Link>
          <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
            Account Hub
          </span>
        </div>

        {/* 1. Identity & Avatar Header */}
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-22 sm:size-24 rounded-full border border-border bg-muted/50 select-none shadow-xs">
            {user?.imageUrl && (
              <AvatarImage
                src={user.imageUrl}
                alt={displayName}
                className="object-cover"
              />
            )}
            <AvatarFallback className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-foreground bg-muted/60">
              {initials}
            </AvatarFallback>
          </Avatar>

          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-foreground mt-3">
            {displayName}
          </h1>

          <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
            {headline}
          </p>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3.5 h-8 px-4 text-xs font-medium rounded-[6px] border-border text-foreground hover:bg-muted/40 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
          >
            <Link href="/profile-setup">
              Edit Profile
            </Link>
          </Button>
        </div>

        {/* 2. Grouped Navigation Menu Card */}
        <nav
          aria-label="Profile navigation"
          className="rounded-[6px] border border-border bg-card overflow-hidden divide-y divide-border/60 shadow-xs"
        >
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "group flex items-center justify-between min-h-[52px] px-4 py-3 transition-colors",
                  "hover:bg-muted/30 active:bg-muted/50 select-none cursor-pointer"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-8 rounded-[4px] bg-muted/40 border border-border/40 flex items-center justify-center shrink-0 text-foreground group-hover:text-primary transition-colors">
                    <Icon className="size-4 stroke-[1.85]" />
                  </div>
                  <span className="text-sm font-medium text-foreground tracking-tight truncate group-hover:text-foreground">
                    {item.label}
                  </span>
                </div>

                <ChevronRight className="size-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 shrink-0" />
              </Link>
            )
          })}
        </nav>

        {/* 3. Account Sign Out Action */}
        <div className="pt-2 flex flex-col items-center">
          <button
            type="button"
            onClick={() => signOut({ redirectUrl: "/" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[4px] text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors cursor-pointer select-none"
          >
            <LogOut className="size-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </PageContainer>
  )
}
