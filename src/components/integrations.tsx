"use client"

import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
	Sparkles,
	ArrowRight,
	CheckCircle2,
	TrendingUp,
	ExternalLink,
	Link2,
	FileSpreadsheet,
	MessageSquare,
	BrainCircuit,
	Bot,
	BarChart3,
	Award,
	Building2,
	DollarSign,
	ShieldCheck,
	Mic,
	Clock,
	Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ══════════════════════════════════════════════════════ */
/*            CARD 1: SMART APPLICATION TRACKING         */
/* ══════════════════════════════════════════════════════ */

function TrackingVisual() {
	return (
		<div className="flex flex-col justify-between h-full p-2 space-y-3.5 select-none">
			{/* Top Intake Flow Pills */}
			<div className="flex items-center justify-between gap-2">
				<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-mono font-medium shadow-2xs">
					<ExternalLink className="size-3" />
					<span>LinkedIn</span>
				</div>
				<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-mono font-medium shadow-2xs">
					<Link2 className="size-3" />
					<span>Job URL</span>
				</div>
				<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-medium shadow-2xs">
					<FileSpreadsheet className="size-3" />
					<span>CSV File</span>
				</div>
			</div>

			{/* Center AI Parsing Engine Node */}
			<div className="relative flex items-center justify-between p-3 rounded-lg border border-border/80 bg-background/80 shadow-2xs">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold shadow-2xs">
						<Sparkles className="size-3.5 animate-pulse" />
					</div>
					<div>
						<p className="text-xs font-semibold text-foreground">AI JD Extractor</p>
						<p className="text-[10.5px] font-mono text-muted-foreground">Extracting requirements, role & salary</p>
					</div>
				</div>
				<Badge variant="outline" className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25">
					98% Match Score
				</Badge>
			</div>

			{/* Auto-Generated Card Output */}
			<div className="p-3 rounded-lg border border-border/80 bg-card/60 shadow-2xs space-y-2">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<div className="flex size-6 items-center justify-center rounded bg-violet-500/15 text-violet-600 dark:text-violet-400 font-mono font-bold text-[10px] border border-violet-500/30">
							ST
						</div>
						<div>
							<p className="text-xs font-semibold text-foreground leading-tight">Senior Frontend Engineer</p>
							<p className="text-[10px] text-muted-foreground">Stripe • Remote • Full-time</p>
						</div>
					</div>
					<span className="text-[11px] font-mono font-bold text-foreground">$165k - $195k</span>
				</div>
				<div className="flex items-center gap-1.5 pt-1">
					<span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">React 19</span>
					<span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">TypeScript</span>
					<span className="text-[9.5px] font-mono px-2 py-0.5 rounded bg-muted/60 text-muted-foreground border border-border/60">Next.js</span>
					<span className="ml-auto text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">✓ Auto-Tracked</span>
				</div>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*            CARD 2: AI INTERVIEW PREPARATION           */
/* ══════════════════════════════════════════════════════ */

function InterviewVisual() {
	return (
		<div className="flex flex-col justify-between h-full p-2 space-y-3 select-none">
			{/* Question Simulation Card */}
			<div className="p-3 rounded-lg border border-border/80 bg-background/80 shadow-2xs space-y-1.5">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
						<Bot className="size-3.5 text-primary" />
						<span>AI Mock Interviewer</span>
					</div>
					<Badge variant="outline" className="text-[9px] font-mono border-primary/30 text-primary bg-primary/5">
						STAR Method
					</Badge>
				</div>
				<p className="text-xs font-semibold text-foreground leading-snug">
					"Describe how you handled a critical production incident under tight deadline."
				</p>
			</div>

			{/* Real-Time STAR Feedback Breakdown */}
			<div className="grid grid-cols-4 gap-1.5 text-center font-mono">
				<div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
					<p className="text-[9px] text-blue-600 dark:text-blue-400 font-semibold uppercase">Situation</p>
					<p className="text-[11px] font-bold text-foreground mt-0.5">96%</p>
				</div>
				<div className="p-2 rounded-md bg-violet-500/10 border border-violet-500/20">
					<p className="text-[9px] text-violet-600 dark:text-violet-400 font-semibold uppercase">Task</p>
					<p className="text-[11px] font-bold text-foreground mt-0.5">92%</p>
				</div>
				<div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
					<p className="text-[9px] text-amber-600 dark:text-amber-400 font-semibold uppercase">Action</p>
					<p className="text-[11px] font-bold text-foreground mt-0.5">99%</p>
				</div>
				<div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/20">
					<p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Result</p>
					<p className="text-[11px] font-bold text-foreground mt-0.5">95%</p>
				</div>
			</div>

			{/* Audio Waveform Coaching Bar */}
			<div className="flex items-center justify-between p-2.5 rounded-lg border border-border/80 bg-card/60">
				<div className="flex items-center gap-2">
					<div className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
						<Mic className="size-3 animate-pulse" />
					</div>
					<span className="text-[11px] font-medium text-foreground">Voice Analysis: Confident Pace</span>
				</div>
				<div className="flex items-center gap-0.5">
					{[40, 75, 55, 90, 60, 100, 45, 80, 65, 95, 50, 70].map((h, i) => (
						<div
							key={i}
							style={{ height: `${h}%` }}
							className="w-1 rounded-full bg-primary/70 max-h-4"
						/>
					))}
				</div>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*            CARD 3: FUNNEL ANALYTICS                   */
/* ══════════════════════════════════════════════════════ */

function FunnelVisual() {
	return (
		<div className="w-full space-y-2.5 p-1 select-none">
			<div className="space-y-1.5 font-mono text-xs">
				<div className="flex items-center justify-between text-[11px]">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<span className="size-2 rounded-full bg-blue-500" />
						<span>Applications</span>
					</span>
					<span className="font-semibold text-foreground">148 (100%)</span>
				</div>
				<div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
					<div className="h-full w-full rounded-full bg-blue-500" />
				</div>
			</div>

			<div className="space-y-1.5 font-mono text-xs">
				<div className="flex items-center justify-between text-[11px]">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<span className="size-2 rounded-full bg-violet-500" />
						<span>Interviews</span>
					</span>
					<span className="font-semibold text-foreground">42 (28.4%)</span>
				</div>
				<div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
					<div className="h-full w-[28.4%] rounded-full bg-violet-500" />
				</div>
			</div>

			<div className="space-y-1.5 font-mono text-xs">
				<div className="flex items-center justify-between text-[11px]">
					<span className="flex items-center gap-1.5 text-muted-foreground">
						<span className="size-2 rounded-full bg-emerald-500" />
						<span>Offers</span>
					</span>
					<span className="font-semibold text-foreground">6 (14.2%)</span>
				</div>
				<div className="h-2 w-full rounded-full bg-muted/80 overflow-hidden">
					<div className="h-full w-[14.2%] rounded-full bg-emerald-500" />
				</div>
			</div>

			<div className="flex items-center justify-between pt-2 border-t border-border/50 text-[10px] font-mono text-muted-foreground">
				<span>Industry Avg: 4.2%</span>
				<span className="font-bold text-emerald-600 dark:text-emerald-400">Your Rate: 14.2% (3.4x)</span>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*            CARD 4: WEEKLY AI REVIEWS                  */
/* ══════════════════════════════════════════════════════ */

function ReviewVisual() {
	return (
		<div className="w-full space-y-2.5 p-1 select-none">
			<div className="space-y-2 text-xs">
				<div className="flex items-center gap-2 p-2 rounded-md bg-background/80 border border-border/70">
					<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
					<span className="text-[11.5px] font-medium text-foreground truncate">8 new applications submitted</span>
					<span className="ml-auto text-[9px] font-mono text-muted-foreground">100%</span>
				</div>

				<div className="flex items-center gap-2 p-2 rounded-md bg-background/80 border border-border/70">
					<CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
					<span className="text-[11.5px] font-medium text-foreground truncate">2 technical interviews scheduled</span>
					<span className="ml-auto text-[9px] font-mono text-muted-foreground">Thu/Fri</span>
				</div>

				<div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
					<Zap className="size-3.5 text-primary shrink-0 mt-0.5" />
					<div className="min-w-0">
						<p className="text-[11px] font-semibold text-primary">AI Action Recommendation</p>
						<p className="text-[10px] text-muted-foreground truncate">Follow up with Google recruiter (optimal response: Today)</p>
					</div>
				</div>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*            CARD 5: LAND THE OFFER                     */
/* ══════════════════════════════════════════════════════ */

function OfferVisual() {
	return (
		<div className="w-full space-y-2 p-1 select-none">
			<div className="grid grid-cols-2 gap-2 text-xs">
				{/* Offer 1 */}
				<div className="p-2.5 rounded-lg bg-background/90 border border-emerald-500/30 shadow-2xs relative">
					<div className="flex items-center justify-between mb-1">
						<span className="text-[11px] font-bold text-foreground">Stripe</span>
						<Badge variant="outline" className="text-[8.5px] px-1 py-0 font-mono text-emerald-600 bg-emerald-500/10 border-emerald-500/20">
							Top Choice
						</Badge>
					</div>
					<p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">$165,000</p>
					<p className="text-[9.5px] text-muted-foreground font-mono">+ $45k Equity • Remote</p>
				</div>

				{/* Offer 2 */}
				<div className="p-2.5 rounded-lg bg-background/90 border border-border/80 shadow-2xs">
					<div className="flex items-center justify-between mb-1">
						<span className="text-[11px] font-bold text-foreground">Vercel</span>
						<span className="text-[9px] text-muted-foreground font-mono">Hybrid</span>
					</div>
					<p className="text-sm font-bold font-mono text-foreground">$170,000</p>
					<p className="text-[9.5px] text-muted-foreground font-mono">+ $30k Equity • SF</p>
				</div>
			</div>

			<div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60 text-[10.5px]">
				<span className="flex items-center gap-1.5 font-medium text-foreground">
					<Award className="size-3.5 text-primary" />
					Negotiation Coach
				</span>
				<span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">+ $15k Potential</span>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*                 BENTO CARD CONTAINER                  */
/* ══════════════════════════════════════════════════════ */

function FeatureCard({ children, className }: { children: React.ReactNode; className?: string }) {
	return (
		<div
			className={cn(
				"relative flex flex-col justify-between h-full rounded-xl overflow-hidden",
				"bg-card/70 border border-border/80 shadow-2xs backdrop-blur-xs",
				"hover:border-primary/40 hover:shadow-xs transition-all duration-200",
				className
			)}
		>
			{children}
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*                    MAIN EXPORT                       */
/* ══════════════════════════════════════════════════════ */

export function Integrations() {
	return (
		<section id="features" className="relative">
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<FullWidthDivider className="-top-px" />

				<div className="px-4 py-16 md:px-8 md:py-24">
					<motion.div
						className="max-w-3xl mx-auto text-center mb-14"
						initial={{ opacity: 0, y: 15 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.5 }}
					>
						<Badge variant="outline" className="mb-3 text-xs font-mono text-primary bg-primary/5 border-primary/20">
							POWERFUL CORE SUITE
						</Badge>
						<h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
							Everything You Need to Land Your Next Role
						</h2>
						<p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
							From intelligent multi-source intake to real-time STAR interview coaching and automated offer negotiation analysis.
						</p>
					</motion.div>

					{/* Top Row — 2 Large High-Impact Bento Cards */}
					<div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-5">
						<FeatureCard>
							<div className="p-5 md:p-6 bg-muted/20 border-b border-border/60 min-h-[220px] flex items-center justify-center">
								<TrackingVisual />
							</div>
							<div className="p-5 md:p-6 space-y-1.5">
								<div className="flex items-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
										<Sparkles className="size-3.5" />
									</div>
									<h3 className="font-bold text-foreground text-base">Smart Application Tracking</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Auto-import opportunities from LinkedIn, paste job URLs, or upload bulk CSVs. AI instantly extracts requirements and salary benchmarks.
								</p>
							</div>
						</FeatureCard>

						<FeatureCard>
							<div className="p-5 md:p-6 bg-muted/20 border-b border-border/60 min-h-[220px] flex items-center justify-center">
								<InterviewVisual />
							</div>
							<div className="p-5 md:p-6 space-y-1.5">
								<div className="flex items-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-md bg-violet-500/10 text-violet-500">
										<MessageSquare className="size-3.5" />
									</div>
									<h3 className="font-bold text-foreground text-base">AI Interview Prep</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Generate role-tailored behavioral and technical questions, practice with interactive voice simulations, and receive real-time STAR coaching.
								</p>
							</div>
						</FeatureCard>
					</div>

					{/* Bottom Row — 3 Specialized Bento Feature Cards */}
					<div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
						<FeatureCard>
							<div className="p-5 bg-muted/20 border-b border-border/60 min-h-[170px] flex items-center justify-center">
								<FunnelVisual />
							</div>
							<div className="p-5 space-y-1.5">
								<div className="flex items-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-500">
										<BarChart3 className="size-3.5" />
									</div>
									<h3 className="font-bold text-foreground text-base">Funnel Analytics</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Visualize interview conversion rates, recruiter response latency, and source channel yield.
								</p>
							</div>
						</FeatureCard>

						<FeatureCard>
							<div className="p-5 bg-muted/20 border-b border-border/60 min-h-[170px] flex items-center justify-center">
								<ReviewVisual />
							</div>
							<div className="p-5 space-y-1.5">
								<div className="flex items-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-md bg-purple-500/10 text-purple-500">
										<ShieldCheck className="size-3.5" />
									</div>
									<h3 className="font-bold text-foreground text-base">Weekly AI Reviews</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Your personal career agent tracks pacing, suggests high-impact follow-ups, and keeps momentum high.
								</p>
							</div>
						</FeatureCard>

						<FeatureCard>
							<div className="p-5 bg-muted/20 border-b border-border/60 min-h-[170px] flex items-center justify-center">
								<OfferVisual />
							</div>
							<div className="p-5 space-y-1.5">
								<div className="flex items-center gap-2">
									<div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-500">
										<Award className="size-3.5" />
									</div>
									<h3 className="font-bold text-foreground text-base">Land the Offer</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Compare multi-offer equity, base compensation, and remote perks with AI negotiation counter-proposals.
								</p>
							</div>
						</FeatureCard>
					</div>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
