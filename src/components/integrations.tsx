"use client"

import Image from "next/image";
import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { motion } from "framer-motion";
import {
	Sparkles,
	MessageSquare,
	BarChart3,
	ShieldCheck,
	Award,
	ArrowUpRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeatureCardProps {
	tag: string;
	title: string;
	description: string;
	icon: React.ComponentType<{ className?: string }>;
	iconColor: string;
	lightImg: string;
	darkImg: string;
	className?: string;
	aspectRatio?: string;
}

function FeatureCard({
	tag,
	title,
	description,
	icon: Icon,
	iconColor,
	lightImg,
	darkImg,
	className,
	aspectRatio = "aspect-[16/10]",
}: FeatureCardProps) {
	return (
		<motion.div
			className={cn(
				"group relative flex flex-col justify-between overflow-hidden bg-card/60 backdrop-blur-xs",
				"border border-border/80 transition-all duration-300",
				"hover:border-primary/40 hover:bg-card/90 hover:shadow-lg",
				className
			)}
			whileHover={{ y: -2 }}
			transition={{ duration: 0.2 }}
		>
			{/* Top Image Showcase with Dark/Light Support */}
			<div className={cn("relative w-full overflow-hidden bg-muted/20 border-b border-border/70", aspectRatio)}>
				{/* Light Mode Diagram */}
				<Image
					src={lightImg}
					alt={`${title} 3D Diagram (Light Mode)`}
					fill
					className="block dark:hidden object-cover transition-transform duration-700 ease-out group-hover:scale-103 select-none pointer-events-none"
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					quality={95}
				/>
				{/* Dark Mode Diagram */}
				<Image
					src={darkImg}
					alt={`${title} 3D Diagram (Dark Mode)`}
					fill
					className="hidden dark:block object-cover transition-transform duration-700 ease-out group-hover:scale-103 select-none pointer-events-none"
					sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
					quality={95}
				/>
				{/* Top Corner Badge */}
				<div className="absolute top-3 left-3 z-10">
					<span className="px-2 py-0.5 text-[10px] font-mono font-medium rounded-sm bg-background/90 text-foreground border border-border/80 shadow-2xs backdrop-blur-md">
						{tag}
					</span>
				</div>
			</div>

			{/* Bottom Content Compartment */}
			<div className="p-5 sm:p-6 space-y-2 flex-1 flex flex-col justify-between">
				<div className="space-y-1.5">
					<div className="flex items-center gap-2">
						<div className={cn("flex size-6.5 items-center justify-center rounded-md border shadow-2xs", iconColor)}>
							<Icon className="size-3.5" />
						</div>
						<h3 className="font-bold text-foreground text-base sm:text-lg tracking-tight">
							{title}
						</h3>
					</div>
					<p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
						{description}
					</p>
				</div>

				<div className="pt-2 flex items-center gap-1 text-[11px] font-mono text-muted-foreground group-hover:text-primary transition-colors">
					<span>Explore workflow</span>
					<ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
				</div>
			</div>
		</motion.div>
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

				<div className="px-4 py-16 md:px-8 md:py-24 max-w-7xl mx-auto">
					{/* Section Header */}
					<motion.div
						className="max-w-3xl mx-auto text-center mb-14"
						initial={{ opacity: 0, y: 15 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.5 }}
					>
						<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm border border-border bg-card mb-3 text-xs font-mono text-muted-foreground shadow-2xs">
							<span className="size-1.5 rounded-full bg-primary animate-pulse" />
							<span>CORE PLATFORM ENGINE</span>
						</div>
						<h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
							Everything You Need to Land Your Next Role
						</h2>
						<p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
							From intelligent multi-source intake to real-time STAR interview coaching and automated offer negotiation analysis.
						</p>
					</motion.div>

					{/* Top Blueprint Grid — 2 Featured Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-5">
						<FeatureCard
							tag="01 // AUTO-INTAKE"
							title="Smart Application Tracking"
							description="Auto-import opportunities from LinkedIn, paste job URLs, or upload bulk CSVs. AI instantly extracts requirements and salary benchmarks."
							icon={Sparkles}
							iconColor="bg-blue-500/10 text-blue-500 border-blue-500/20"
							lightImg="/features/smart-tracking.jpg"
							darkImg="/features/smart-tracking-dark.jpg"
							aspectRatio="aspect-[16/10]"
						/>

						<FeatureCard
							tag="02 // AI COACH"
							title="AI Interview Prep"
							description="Generate role-tailored behavioral and technical questions, practice with interactive voice simulations, and receive real-time STAR coaching."
							icon={MessageSquare}
							iconColor="bg-violet-500/10 text-violet-500 border-violet-500/20"
							lightImg="/features/interview-prep.jpg"
							darkImg="/features/interview-prep-dark.jpg"
							aspectRatio="aspect-[16/10]"
						/>
					</div>

					{/* Bottom Blueprint Grid — 3 Specialized Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
						<FeatureCard
							tag="03 // PIPELINE"
							title="Funnel Analytics"
							description="Visualize interview conversion rates, recruiter response latency, and source channel yield with real-time funnel intelligence."
							icon={BarChart3}
							iconColor="bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
							lightImg="/features/funnel-analytics.jpg"
							darkImg="/features/funnel-analytics-dark.jpg"
							aspectRatio="aspect-[4/3]"
						/>

						<FeatureCard
							tag="04 // AGENT"
							title="Weekly AI Reviews"
							description="Your personal career agent tracks pacing, suggests high-impact recruiter follow-ups, and keeps search momentum high."
							icon={ShieldCheck}
							iconColor="bg-purple-500/10 text-purple-500 border-purple-500/20"
							lightImg="/features/weekly-reviews.jpg"
							darkImg="/features/weekly-reviews-dark.jpg"
							aspectRatio="aspect-[4/3]"
						/>

						<FeatureCard
							tag="05 // NEGOTIATE"
							title="Land the Offer"
							description="Compare multi-offer equity, base compensation, and remote perks with automated AI negotiation counter-proposals."
							icon={Award}
							iconColor="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
							lightImg="/features/offer-negotiation.jpg"
							darkImg="/features/offer-negotiation-dark.jpg"
							aspectRatio="aspect-[4/3]"
						/>
					</div>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
