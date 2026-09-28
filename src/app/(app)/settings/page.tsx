"use client"

import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { PageContainer, PageHeader } from "@/components/primitives"

import { AccountInfoCard } from "@/components/settings/AccountInfoCard"
import { PreferencesCard } from "@/components/settings/PreferencesCard"
import { DataManagementCard } from "@/components/settings/DataManagementCard"
import { SystemNotificationsCard } from "@/components/settings/SystemNotificationsCard"

export default function SettingsPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded) {
    return (
      <PageContainer maxWidth="narrow" className="pb-16 space-y-6">
        <PageHeader skeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Skeleton className="h-44 w-full rounded-[6px]" />
          <Skeleton className="h-44 w-full rounded-[6px]" />
        </div>
        <Skeleton className="h-32 w-full rounded-[6px]" />
      </PageContainer>
    )
  }

  return (
    <PageContainer maxWidth="narrow" className="pb-16 space-y-6">
      {/* Standardized Header with Back to Profile */}
      <PageHeader
        backHref="/profile"
        backLabel="Back to Profile"
        overline="SYSTEM / CONFIG"
        title="System Settings"
        description="Manage your account identity, theme preferences, system notifications, and personal data."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Account Info */}
        <AccountInfoCard
          name={user?.fullName}
          email={user?.primaryEmailAddress?.emailAddress}
        />

        {/* Dark mode & Theme Preferences */}
        <PreferencesCard />
      </div>

      {/* CSV Data Export */}
      <DataManagementCard />

      {/* Notifications Card */}
      <SystemNotificationsCard />
    </PageContainer>
  )
}
