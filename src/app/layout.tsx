import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { ClerkProvider } from "@clerk/nextjs"
import { shadcn } from "@clerk/ui/themes"
import { Toaster } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider } from "@/components/theme-provider"
import Providers from "@/components/Providers"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "CareerTrack Lite",
  description: "Track your job applications effortlessly",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ClerkProvider appearance={{ theme: shadcn }}>
      <html lang="en" suppressHydrationWarning className="dark overflow-x-hidden">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
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
