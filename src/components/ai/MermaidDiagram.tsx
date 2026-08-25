"use client"

import React, { useEffect, useRef, useState, useId } from "react"
import { useTheme } from "next-themes"
import { Copy, Check, Maximize2, Minimize2, ZoomIn, ZoomOut, RotateCcw, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface MermaidDiagramProps {
  code: string
  className?: string
}

export default function MermaidDiagram({ code, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svgContent, setSvgContent] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { resolvedTheme } = useTheme()
  const uniqueId = useId().replace(/:/g, "_")

  const cleanCode = React.useMemo(() => {
    return code
      .trim()
      .replace(/^```mermaid\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim()
  }, [code])

  useEffect(() => {
    let isMounted = true

    async function renderMermaid() {
      if (!cleanCode) return
      setLoading(true)
      setError(null)

      try {
        const mermaid = (await import("mermaid")).default
        const isDark = resolvedTheme === "dark" || document.documentElement.classList.contains("dark")

        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "neutral",
          themeVariables: isDark
            ? {
                primaryColor: "#3b82f6",
                primaryTextColor: "#f3f4f6",
                primaryBorderColor: "#1d4ed8",
                lineColor: "#60a5fa",
                secondaryColor: "#1e293b",
                tertiaryColor: "#0f172a",
                background: "#09090b",
                mainBkg: "#18181b",
                nodeBorder: "#3f3f46",
                clusterBkg: "#18181b",
                clusterBorder: "#27272a",
                defaultLinkColor: "#a1a1aa",
                titleColor: "#fafafa",
                edgeLabelBackground: "#18181b",
                actorBkg: "#18181b",
                actorBorder: "#3b82f6",
                actorTextColor: "#fafafa",
                actorLineColor: "#3f3f46",
                signalColor: "#60a5fa",
                signalTextColor: "#f3f4f6",
                labelBoxBkgColor: "#18181b",
                labelBoxBorderColor: "#3f3f46",
                labelTextColor: "#f3f4f6",
                loopTextColor: "#f3f4f6",
                noteBorderColor: "#eab308",
                noteBkgColor: "#27272a",
                noteTextColor: "#fef08a",
                activationBorderColor: "#3b82f6",
                activationBkgColor: "#1e3a8a",
                sequenceNumberColor: "#ffffff",
              }
            : {
                primaryColor: "#2563eb",
                primaryTextColor: "#1e293b",
                primaryBorderColor: "#93c5fd",
                lineColor: "#3b82f6",
                secondaryColor: "#f1f5f9",
                tertiaryColor: "#ffffff",
                background: "#ffffff",
                mainBkg: "#ffffff",
                nodeBorder: "#cbd5e1",
                clusterBkg: "#f8fafc",
                clusterBorder: "#e2e8f0",
                defaultLinkColor: "#64748b",
                titleColor: "#0f172a",
                edgeLabelBackground: "#ffffff",
              },
          securityLevel: "loose",
          fontFamily: "inherit",
          fontSize: 13,
        })

        const renderId = `mermaid_${uniqueId}_${Date.now()}`
        const { svg } = await mermaid.render(renderId, cleanCode)

        if (isMounted) {
          setSvgContent(svg)
          setLoading(false)
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Mermaid diagram render error:", err)
          setError(err instanceof Error ? err.message : "Failed to parse diagram syntax")
          setLoading(false)
        }
      }
    }

    renderMermaid()

    return () => {
      isMounted = false
    }
  }, [cleanCode, resolvedTheme, uniqueId])

  const handleCopy = () => {
    navigator.clipboard.writeText(cleanCode)
    setCopied(true)
    toast.success("Copied Mermaid code to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadSvg = () => {
    if (!svgContent) return
    const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `diagram-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("Diagram SVG downloaded")
  }

  return (
    <div
      className={cn(
        "my-4 rounded-xl border border-border bg-card/70 overflow-hidden shadow-2xs not-prose transition-all",
        isFullscreen && "fixed inset-4 z-50 bg-background/95 backdrop-blur-md flex flex-col p-4 shadow-2xl border-2 border-primary/40",
        className
      )}
    >
      {/* Top Diagram Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 text-xs">
        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <span className="size-2 rounded-full bg-blue-500" />
          <span className="font-semibold text-foreground">Interactive Diagram</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="size-3" />
          </Button>

          <span className="text-[10px] font-mono text-muted-foreground w-8 text-center tabular-nums">
            {Math.round(zoom * 100)}%
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setZoom(1)}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw className="size-3" />
          </Button>

          <div className="h-3 w-px bg-border mx-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDownloadSvg}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Download SVG"
          >
            <Download className="size-3" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleCopy}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="size-6 text-muted-foreground hover:text-foreground cursor-pointer"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-3" /> : <Maximize2 className="size-3" />}
          </Button>
        </div>
      </div>

      {/* Diagram Canvas Body */}
      <div
        ref={containerRef}
        className={cn(
          "relative overflow-auto p-4 sm:p-6 flex items-center justify-center min-h-[160px] bg-background/50",
          isFullscreen && "flex-1 min-h-0"
        )}
      >
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse py-8">
            <span className="size-2 rounded-full bg-primary animate-ping" />
            <span>Rendering visual diagram...</span>
          </div>
        )}

        {error && (
          <div className="w-full space-y-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs">
            <p className="font-semibold text-destructive">Diagram syntax error:</p>
            <p className="font-mono text-[11px] text-muted-foreground">{error}</p>
            <pre className="p-2 rounded bg-background/80 border border-border text-[11px] font-mono overflow-x-auto">
              {cleanCode}
            </pre>
          </div>
        )}

        {!loading && !error && svgContent && (
          <div
            className="transition-transform duration-150 origin-center flex items-center justify-center max-w-full [&>svg]:max-w-full [&>svg]:h-auto"
            style={{ transform: `scale(${zoom})` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </div>
    </div>
  )
}
