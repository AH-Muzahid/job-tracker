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
	ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ══════════════════════════════════════════════════════ */
/*                 BENTO CARD CONTAINER                  */
/* ══════════════════════════════════════════════════════ */

function BentoCard({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<motion.div
			className={cn(
				"group relative flex flex-col justify-between h-full rounded-2xl overflow-hidden",
				"bg-card/80 border border-border/80 shadow-sm backdrop-blur-xs",
				"hover:border-primary/40 hover:shadow-xl transition-all duration-300",
				className
			)}
			whileHover={{ y: -4 }}
			transition={{ duration: 0.2 }}
		>
			{children}
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

					{/* Top Row — 2 Large 3D Diagram Cards */}
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						{/* Card 1: Smart Application Tracking */}
						<BentoCard>
							<div className="relative w-full aspect-[4/3] bg-muted/20 border-b border-border/60 overflow-hidden">
								<Image
									src="/features/smart-tracking.jpg"
									alt="Smart Application Tracking 3D SaaS Diagram"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
									sizes="(max-width: 768px) 100vw, 50vw"
									quality={95}
								/>
							</div>
							<div className="p-6 space-y-2">
								<div className="flex items-center gap-2">
									<div className="flex size-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
										<Sparkles className="size-4" />
									</div>
									<h3 className="font-bold text-foreground text-lg">Smart Application Tracking</h3>
								</div>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Auto-import opportunities from LinkedIn, paste job URLs, or upload bulk CSVs. AI instantly extracts requirements and salary benchmarks.
								</p>
							</div>
						</BentoCard>

						{/* Card 2: AI Interview Prep */}
						<BentoCard>
							<div className="relative w-full aspect-[4/3] bg-muted/20 border-b border-border/60 overflow-hidden">
								<Image
									src="/features/interview-prep.jpg"
									alt="AI Interview Prep 3D SaaS Diagram"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
									sizes="(max-width: 768px) 100vw, 50vw"
									quality={95}
								/>
							</div>
							<div className="p-6 space-y-2">
								<div className="flex items-center gap-2">
									<div className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
										<MessageSquare className="size-4" />
									</div>
									<h3 className="font-bold text-foreground text-lg">AI Interview Prep</h3>
								</div>
								<p className="text-muted-foreground text-sm leading-relaxed">
									Generate role-tailored behavioral and technical questions, practice with interactive voice simulations, and receive real-time STAR coaching.
								</p>
							</div>
						</BentoCard>
					</div>

					{/* Bottom Row — 3 Specialized 3D Diagram Cards */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
						{/* Card 3: Funnel Analytics */}
						<BentoCard>
							<div className="relative w-full aspect-[4/3] bg-muted/20 border-b border-border/60 overflow-hidden">
								<Image
									src="/features/funnel-analytics.jpg"
									alt="Funnel Analytics 3D SaaS Diagram"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
									sizes="(max-width: 768px) 100vw, 33vw"
									quality={95}
								/>
							</div>
							<div className="p-6 space-y-2">
								<div className="flex items-center gap-2">
									<div className="flex size-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
										<BarChart3 className="size-4" />
									</div>
									<h3 className="font-bold text-foreground text-base">Funnel Analytics</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Visualize interview conversion rates, recruiter response latency, and source channel yield.
								</p>
							</div>
						</BentoCard>

						{/* Card 4: Weekly AI Reviews */}
						<BentoCard>
							<div className="relative w-full aspect-[4/3] bg-muted/20 border-b border-border/60 overflow-hidden">
								<Image
									src="/features/weekly-reviews.jpg"
									alt="Weekly AI Reviews 3D SaaS Diagram"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
									sizes="(max-width: 768px) 100vw, 33vw"
									quality={95}
								/>
							</div>
							<div className="p-6 space-y-2">
								<div className="flex items-center gap-2">
									<div className="flex size-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-500">
										<ShieldCheck className="size-4" />
									</div>
									<h3 className="font-bold text-foreground text-base">Weekly AI Reviews</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Your personal career agent tracks pacing, suggests high-impact follow-ups, and keeps momentum high.
								</p>
							</div>
						</BentoCard>

						{/* Card 5: Land the Offer */}
						<BentoCard>
							<div className="relative w-full aspect-[4/3] bg-muted/20 border-b border-border/60 overflow-hidden">
								<Image
									src="/features/offer-negotiation.jpg"
									alt="Land the Offer 3D SaaS Diagram"
									fill
									className="object-cover transition-transform duration-500 group-hover:scale-105 select-none pointer-events-none"
									sizes="(max-width: 768px) 100vw, 33vw"
									quality={95}
								/>
							</div>
							<div className="p-6 space-y-2">
								<div className="flex items-center gap-2">
									<div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
										<Award className="size-4" />
									</div>
									<h3 className="font-bold text-foreground text-base">Land the Offer</h3>
								</div>
								<p className="text-muted-foreground text-xs md:text-sm leading-relaxed">
									Compare multi-offer equity, base compensation, and remote perks with AI negotiation counter-proposals.
								</p>
							</div>
						</BentoCard>
					</div>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
