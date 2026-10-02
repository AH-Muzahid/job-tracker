import { auth, clerkClient } from "@clerk/nextjs/server"
import { getInternalUserId } from "@/lib/auth"

export interface AdminCheckResult {
  isAdmin: boolean
  userId: string | null
  clerkUserId: string | null
  email?: string | null
  reason?: string
}

export function isUserAdminByMetadata(params: {
  clerkUserId?: string | null
  email?: string | null
  role?: string | null
  adminUserIds?: string
}): boolean {
  // 1. Direct role check
  if (params.role?.toLowerCase() === "admin") {
    return true
  }

  // 2. Environment list check
  const configuredAdmins = (params.adminUserIds || process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (params.clerkUserId && configuredAdmins.includes(params.clerkUserId.toLowerCase())) {
    return true
  }

  if (params.email && configuredAdmins.includes(params.email.toLowerCase())) {
    return true
  }

  // 3. Explicit dev bypass check
  if (process.env.NODE_ENV === "development" && process.env.DEV_ADMIN_BYPASS === "true") {
    return true
  }

  return false
}

/**
 * Checks current session user's admin privilege safely.
 */
export async function checkAdminStatus(): Promise<AdminCheckResult> {
  const { userId: clerkUserId, sessionClaims } = await auth()
  if (!clerkUserId) {
    return { isAdmin: false, userId: null, clerkUserId: null, reason: "Unauthenticated" }
  }

  const internalUserId = await getInternalUserId()
  const claims = sessionClaims as Record<string, unknown> | undefined
  const metadata = claims?.metadata as Record<string, unknown> | undefined
  const role = (metadata?.role as string) || (claims?.role as string)

  let email: string | null = null
  try {
    const client = await clerkClient()
    const clerkUser = await client.users.getUser(clerkUserId)
    email = clerkUser.emailAddresses?.[0]?.emailAddress ?? null
  } catch {
    // Non-fatal if Clerk lookup fails
  }

  const isAdmin = isUserAdminByMetadata({
    clerkUserId,
    email,
    role,
  })

  return {
    isAdmin,
    userId: internalUserId,
    clerkUserId,
    email,
    reason: isAdmin ? "Authorized Admin" : "User does not have admin permissions",
  }
}

/**
 * Throws 403 Forbidden error if user is not authorized admin.
 */
export async function assertAdmin(): Promise<{ userId: string; clerkUserId: string; email?: string | null }> {
  const status = await checkAdminStatus()
  if (!status.isAdmin || !status.userId || !status.clerkUserId) {
    throw new Error("Forbidden: Admin access required")
  }
  return {
    userId: status.userId,
    clerkUserId: status.clerkUserId,
    email: status.email,
  }
}
