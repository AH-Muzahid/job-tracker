"use client"

import Image from "next/image";
import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { motion } from "framer-motion";
import { Layers } from "lucide-react";

interface FeatureItem {
	title: string;
	description: string;
	lightImg: string;
	darkImg: string;
}

const features: FeatureItem[] = [
	{
		title: "Smart Job Automation",
		description: "Automate repetitive tracking and streamline your job search. Auto-import roles from LinkedIn, job boards, and emails effortlessly.",
		lightImg: "/features/smart-tracking.jpg",
		darkImg: "/features/smart-tracking-dark.jpg",
	},
	{
		title: "Real-Time AI Interview Prep",
		description: "Practice tailored mock interviews and gain actionable feedback with live STAR method coaching and conversational analysis.",
		lightImg: "/features/interview-prep.jpg",
		darkImg: "/features/interview-prep-dark.jpg",
	},
	{
		title: "Offer & Pipeline Intelligence",
		description: "Compare multiple offers side-by-side with market equity benchmarks, base compensation valuation, and automated negotiation tips.",
		lightImg: "/features/offer-negotiation.jpg",
		darkImg: "/features/offer-negotiation-dark.jpg",
	},
];

export function Integrations() {
	return (
		<section id="features" className="relative">
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<FullWidthDivider className="-top-px" />

				<div className="px-4 py-16 md:px-8 md:py-24 max-w-7xl mx-auto">
					{/* Asymmetric 2-Column Split Header */}
					<div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 md:mb-16">
						{/* Left Column: Pill & 2-Tone Serif Headline */}
						<motion.div
							className="space-y-3 max-w-xl"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.5 }}
						>
							<div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-none border border-border bg-card/80 text-xs font-medium text-muted-foreground shadow-2xs backdrop-blur-xs">
								<Layers className="size-3 text-primary" />
								<span>Features</span>
							</div>

							<h2 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight leading-[1.12]">
								<span className="text-muted-foreground/75 font-normal">Everything You</span>
								<br />
								<span className="font-semibold text-foreground">Need to Succeed</span>
							</h2>
						</motion.div>

						{/* Right Column: Balanced Explanatory Paragraph */}
						<motion.div
							className="max-w-md md:text-right"
							initial={{ opacity: 0, y: 15 }}
							whileInView={{ opacity: 1, y: 0 }}
							viewport={{ once: true, margin: "-100px" }}
							transition={{ duration: 0.5, delay: 0.1 }}
						>
							<p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
								Get a complete overview of your performance, pipeline, and interviews with a powerful dashboard designed for clarity and control. Monitor everything in real time and make smarter decisions faster.
							</p>
						</motion.div>
					</div>

					{/* 3-Column Feature Cards Grid */}
					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-7">
						{features.map((feature, idx) => (
							<motion.div
								key={feature.title}
								className={cn(
									"group relative flex flex-col justify-between overflow-hidden rounded-none",
									"bg-card/70 border border-border/80 shadow-2xs backdrop-blur-xs",
									"hover:border-primary/40 hover:shadow-xl transition-all duration-300"
								)}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true, margin: "-50px" }}
								transition={{ duration: 0.4, delay: idx * 0.1 }}
								whileHover={{ y: -4 }}
							>
								{/* Image Banner with Dark & Light Theme Support */}
								<div className="relative w-full aspect-[16/10] bg-muted/20 border-b border-border/60 overflow-hidden">
									{/* Light Mode Image */}
									<Image
										src={feature.lightImg}
										alt={`${feature.title} (Light Mode)`}
										fill
										className="block dark:hidden object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none pointer-events-none"
										sizes="(max-width: 768px) 100vw, 33vw"
										quality={95}
									/>
									{/* Dark Mode Image */}
									<Image
										src={feature.darkImg}
										alt={`${feature.title} (Dark Mode)`}
										fill
										className="hidden dark:block object-cover transition-transform duration-700 ease-out group-hover:scale-105 select-none pointer-events-none"
										sizes="(max-width: 768px) 100vw, 33vw"
										quality={95}
									/>
								</div>

								{/* Bottom Typography Content */}
								<div className="p-5 sm:p-6 space-y-2 flex-1 flex flex-col justify-between">
									<div className="space-y-1.5">
										<h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors">
											{feature.title}
										</h3>
										<p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">
											{feature.description}
										</p>
									</div>
								</div>
							</motion.div>
						))}
					</div>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
