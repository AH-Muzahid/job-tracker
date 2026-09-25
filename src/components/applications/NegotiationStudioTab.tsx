"use client"

import { useState, useEffect, useCallback } from "react"
import { DollarSign, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import type { OfferDetailsData } from "@/lib/applications/negotiate-engine"

interface NegotiationStudioTabProps {
  applicationId: string
}

export function NegotiationStudioTab({ applicationId }: NegotiationStudioTabProps) {
  const [data, setData] = useState<OfferDetailsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [baseSalary, setBaseSalary] = useState<number>(140000)
  const [currency, setCurrency] = useState<string>("USD")
  const [selectedTier, setSelectedTier] = useState<number>(1) // Balanced default
  const [copied, setCopied] = useState(false)

  const fetchOfferData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/negotiate`)
      if (res.ok) {
        const result = await res.json()
        setData(result)
        if (result.baseSalary) setBaseSalary(result.baseSalary)
        if (result.currency) setCurrency(result.currency)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchOfferData()
  }, [fetchOfferData])

  async function handleAnalyzeOffer(e: React.FormEvent) {
    e.preventDefault()
    setAnalyzing(true)
    try {
      const res = await fetch(`/api/applications/${applicationId}/negotiate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary: Number(baseSalary),
          currency,
        }),
      })

      if (!res.ok) throw new Error("Failed to benchmark offer")
      const result = await res.json()
      setData(result)
      toast.success("Offer benchmarked & strategy generated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to analyze offer")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleCopyScript = (script: string) => {
    navigator.clipboard.writeText(script)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success("Counter-offer script copied to clipboard!")
  }

  if (loading) {
    return (
      <div className="space-y-4 py-2">
        <Skeleton className="h-14 w-full rounded-[6px] bg-muted" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-[6px] bg-muted" />
          <Skeleton className="h-32 rounded-[6px] bg-muted" />
        </div>
      </div>
    )
  }

  const strategies = data?.strategies || []
  const activeStrategy = strategies[selectedTier] || strategies[0]
  const leverage = data?.leverage
  const band = data?.marketBand

  return (
    <div className="space-y-5">
      {/* 1. Quick Form to Benchmark or Update Offer Details */}
      <form onSubmit={handleAnalyzeOffer} className="p-4 rounded-[6px] border border-border bg-card space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <DollarSign className="size-3.5 text-primary" /> Offer Compensation Parameters
          </h4>
          <span className="text-[10px] font-mono text-muted-foreground">Real-time Market Matrix</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label htmlFor="baseSalary" className="text-xs font-medium">Base Salary Offered</Label>
            <Input
              id="baseSalary"
              type="number"
              value={baseSalary}
              onChange={(e) => setBaseSalary(Number(e.target.value))}
              className="h-9 text-xs rounded-[4px]"
              placeholder="e.g. 150000"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="currency" className="text-xs font-medium">Currency</Label>
            <Input
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              className="h-9 text-xs uppercase rounded-[4px]"
              placeholder="USD"
              required
            />
          </div>

          <div className="flex items-end">
            <Button type="submit" size="sm" disabled={analyzing} className="h-9 text-xs w-full rounded-[4px] shadow-none font-medium">
              {analyzing ? "Benchmarking..." : "Benchmark & Generate Scripts"}
            </Button>
          </div>
        </div>
      </form>

      {/* 2. Visual Leverage & Percentile Gauges */}
      {data && band && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card A: Market Percentile Placement */}
          <div className="p-4 rounded-[6px] border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Market Percentile</span>
              <Badge variant="outline" className="text-[10px] font-mono rounded-[4px]">
                {data.marketPercentileRank ? `${data.marketPercentileRank}th Percentile` : "Market Standard"}
              </Badge>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>p25: {band.p25.toLocaleString()}</span>
                <span>Median (p50): {band.p50.toLocaleString()}</span>
                <span>p90: {band.p90.toLocaleString()}</span>
              </div>
              <div className="w-full bg-muted rounded-[4px] h-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-[4px] transition-all"
                  style={{ width: `${Math.min(100, Math.max(10, data.marketPercentileRank || 50))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card B: BATNA Pipeline Leverage */}
          <div className="p-4 rounded-[6px] border border-border bg-card space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">BATNA Pipeline Leverage</span>
              <Badge className="text-[10px] font-mono bg-emerald-500/10 text-emerald-500 border-emerald-500/20 rounded-[4px]">
                {leverage?.level || "MODERATE"} ({leverage?.score || 50}/100)
              </Badge>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {leverage?.summary || "Active interviews and competing opportunities give you negotiation standing."}
            </p>
          </div>
        </div>
      )}

      {/* 3. 3-Tiered Counter-Offer Scripts */}
      {strategies.length > 0 && activeStrategy && (
        <div className="p-4 rounded-[6px] border border-border bg-card space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Counter-Offer Tactical Strategies
            </h4>
            <div className="flex gap-1.5">
              {strategies.map((tier, idx) => (
                <Button
                  key={tier.tierName}
                  variant={selectedTier === idx ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTier(idx)}
                  className="h-7 text-xs px-2.5 rounded-[4px] font-medium"
                >
                  {tier.tierName} (+{tier.targetIncreasePercentage}%)
                </Button>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-[6px] bg-muted/20 border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">
                Target: {currency} {activeStrategy.targetTotalComp.toLocaleString()} ({activeStrategy.riskLevel} Risk)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopyScript(activeStrategy.emailScript)}
                className="h-7 text-xs text-muted-foreground hover:text-foreground rounded-[4px]"
              >
                <Copy className="size-3 mr-1" /> {copied ? "Copied!" : "Copy Email"}
              </Button>
            </div>

            <pre className="text-xs text-foreground/90 font-mono whitespace-pre-wrap leading-relaxed p-2.5 rounded-[4px] bg-background border border-border/50 max-h-48 overflow-y-auto">
              {activeStrategy.emailScript}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
