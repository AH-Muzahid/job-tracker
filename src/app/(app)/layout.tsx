import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 mx-auto w-full max-w-screen-xl px-4 py-6 sm:px-6">
        {children}
      </main>
      <Footer />
    </div>
  )
}
