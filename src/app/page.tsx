import { Metadata } from "next"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import LenisProvider from "@/components/landing/LenisProvider"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero"
import { LogosSection } from "@/components/logos-section"
import Features from "@/components/landing/Features"
import { Integrations } from "@/components/integrations"
import Stats from "@/components/landing/Stats"
import FAQ from "@/components/landing/FAQ"
import CTABanner from "@/components/landing/CTABanner"
import { TestimonialsSection } from "@/components/testimonials-section"
import { Footer } from "@/components/Footer"

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
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <div className="relative mx-auto w-full max-w-7xl">
            <div className="absolute inset-y-0 left-0 w-px bg-border/40 md:bg-border" />
            <div className="absolute inset-y-0 right-0 w-px bg-border/40 md:bg-border" />
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