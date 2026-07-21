import Link from "next/link"
import { auth } from "@clerk/nextjs/server"

export default async function HomePage() {
  const { userId } = await auth()
  const isSignedIn = !!userId

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">CareerTrack Lite</h1>
          <nav className="flex gap-4">
            {isSignedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  href="/applications"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Applications
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground"
                >
                  Sign In
                </Link>
                <Link
                  href="/sign-up"
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 py-24 text-center">
          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Track Your Job Applications
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground">
            CareerTrack Lite helps you organize and manage your job search. Keep
            track of applications, interviews, offers, and more — all in one
            place.
          </p>
          {!isSignedIn && (
            <Link
              href="/sign-up"
              className="inline-block rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Start Tracking Free
            </Link>
          )}
          {isSignedIn && (
            <Link
              href="/dashboard"
              className="inline-block rounded-md bg-primary px-8 py-3 text-lg font-medium text-primary-foreground hover:bg-primary/90"
            >
              Go to Dashboard
            </Link>
          )}
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>CareerTrack Lite &mdash; Your Name &mdash; Student ID</p>
      </footer>
    </div>
  )
}
