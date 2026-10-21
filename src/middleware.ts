import { clerkMiddleware } from "@clerk/nextjs/server"

// UI pages requiring authentication redirect
const PROTECTED_PATHS = [
  "/dashboard", "/applications", "/discovery", "/brain", "/upskill",
  "/ai-assistant", "/profile-setup", "/weekly-goals",
  "/companies", "/resumes", "/calendar", "/interview-prep", "/settings", "/profile",
  "/integrations", "/ai-memory", "/admin",
]

// Note: API routes authenticate internally via `getInternalUserId()` in their respective route handlers.
// Calling `auth.protect()` in middleware for API paths causes Clerk/Next.js to rewrite fetch requests
// to HTML error pages (<!DOCTYPE...>), breaking client-side JSON parsing.

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  const isPlaywrightBypass =
    process.env.NODE_ENV !== "production" &&
    process.env.PLAYWRIGHT_TEST === "true" &&
    req.cookies.get("playwright_test_auth")?.value === "1"

  if (isPlaywrightBypass) {
    return
  }

  const isProtectedPath =
    PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))

  if (isProtectedPath) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
