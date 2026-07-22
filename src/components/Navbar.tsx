"use client"

import { useUser } from "@clerk/nextjs"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface NavbarProps {
  mobileOpen: boolean
  onMobileToggle: () => void
}

export default function Navbar({ mobileOpen, onMobileToggle }: NavbarProps) {
  const { isSignedIn } = useUser()

  if (!isSignedIn) return null

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 mr-3 text-muted-foreground hover:text-foreground"
        onClick={onMobileToggle}
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      <span className="text-sm font-semibold">CareerTrack</span>
    </header>
  )
}
