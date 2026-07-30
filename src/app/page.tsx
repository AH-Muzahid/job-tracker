import { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import LenisProvider from "@/components/landing/LenisProvider"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero"
import { LogosSection } from "@/components/logos-section"
import Features from "@/components/landing/Features"
import Stats from "@/components/landing/Stats"
import { Footer } from "@/components/Footer"

const Integrations = dynamic(() => import("@/components/integrations").then((m) => m.Integrations))
const TestimonialsSection = dynamic(() => import("@/components/testimonials-section").then((m) => m.TestimonialsSection))
const FAQ = dynamic(() => import("@/components/landing/FAQ"))
const CTABanner = dynamic(() => import("@/components/landing/CTABanner"))


export const metadata: Metadata = {
  title: "CareerTrack — Track Your Job Hunt Effortlessly",
  description: "The all-in-one platform for job seekers. Track applications, prep for interviews with AI, scan job descriptions, build tailored resumes, and land your dream job faster.",
  keywords: ["job tracker", "application tracker", "interview prep", "AI resume builder", "job search"],
  authors: [{ name: "CareerTrack" }],
  creator: "CareerTrack",
  publisher: "CareerTrack",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://careertrack.io",
    title: "CareerTrack — Track Your Job Hunt Effortlessly",
    description: "The all-in-one platform for job seekers. Track applications, prep for interviews with AI, scan job descriptions, build tailored resumes, and land your dream job faster.",
    siteName: "CareerTrack",
  },
  twitter: {
    card: "summary_large_image",
    title: "CareerTrack — Track Your Job Hunt Effortlessly",
    description: "The all-in-one platform for job seekers. Track applications, prep for interviews with AI, scan job descriptions, build tailored resumes, and land your dream job faster.",
  },
}

export default async function HomePage() {
  const { userId } = await auth()
  if (userId) {
    redirect("/dashboard")
  }

  return (
    <LenisProvider>
      <div className="relative flex min-h-screen flex-col">
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 mx-auto w-full max-w-7xl -translate-x-1/2">
          <div className="absolute inset-y-0 left-0 w-px bg-border/40 md:bg-border" />
          <div className="absolute inset-y-0 right-0 w-px bg-border/40 md:bg-border" />
        </div>
        <Header />
        <main className="flex-1">
          <div className="relative mx-auto w-full max-w-7xl">
            <HeroSection />
            <LogosSection />
            <Features />
            <Integrations />
            <Stats />
            <FAQ />
          <TestimonialsSection />
            <CTABanner />
            <Footer />
          </div>
        </main>
      </div>
    </LenisProvider>
  )
}