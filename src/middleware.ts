import { clerkMiddleware } from "@clerk/nextjs/server"

const PROTECTED_PATHS = [
  "/dashboard", "/applications",
  "/ai-assistant", "/profile-setup", "/weekly-goals",
  "/companies", "/resumes", "/calendar", "/interview-prep", "/settings",
]

const PROTECTED_API_PATHS = [
  "/api/applications", "/api/dashboard",
  "/api/ai", "/api/user", "/api/weekly-goals",
  "/api/companies", "/api/resumes", "/api/tags",
  "/api/prep-questions", "/api/prep-notes", "/api/settings",
]

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl

  const isProtected = PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    PROTECTED_API_PATHS.some((p) => pathname.startsWith(p))

  if (isProtected) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
}
