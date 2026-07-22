"use client"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
      <div className="text-center space-y-4">
        <p className="text-destructive font-medium">Something went wrong</p>
        <p className="text-sm text-muted-foreground">{error.message}</p>
        <button onClick={reset} className="text-sm text-primary hover:underline">Try again</button>
      </div>
    </div>
  )
}
