import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import Providers from "@/components/Providers"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "CareerTrack Lite",
  description: "Track your job applications effortlessly",
  verification: {
    google: "36af505b5fe4b54c",
  },
  other: {
    "google-site-verification": "google36af505b5fe4b54c",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }} afterSignOutUrl="/">
      <html lang="en" suppressHydrationWarning className="dark">
        <body
          className={`${plusJakartaSans.variable} ${geistMono.variable} font-sans antialiased`}
        >
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
            <Providers>
              <TooltipProvider>
                {children}
                <Analytics />
                <Toaster richColors />
              </TooltipProvider>
            </Providers>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
