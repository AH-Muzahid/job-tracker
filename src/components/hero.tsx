import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon, LayersIcon } from "lucide-react";
import KineticGrid from "@/components/originkit/ui/kineticgrid";

export function HeroSection() {
	return (
		<section>
			{/* Top Hero Text Section */}
			<div className="relative overflow-hidden">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />

				<FullWidthDivider className="-top-px" />

				{/* Kinetic Grid Interactive Background */}
				<div className="absolute inset-0 -z-1 overflow-hidden pointer-events-auto">
					<KineticGrid
						background="transparent"
						dotColor="#71717a"
						lineColor="#3b82f6"
						trailColor="#60a5fa"
						spacing={38}
						radius={320}
						strength={5}
						trail={true}
					/>
					{/* Soft radial fade mask */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,var(--background)_80%)]"
					/>
				</div>

				<div className="relative flex flex-col items-center justify-center gap-5 px-4 py-16 md:px-6 md:py-24 lg:py-28">
					{/* Ambient Glow */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 -z-1 size-full overflow-hidden"
					>
						<div
							className={cn(
								"absolute -inset-x-20 inset-y-0 z-0 rounded-full",
								"bg-[radial-gradient(ellipse_at_center,theme(--color-foreground/.08),transparent,transparent)]",
								"blur-[50px]"
							)}
						/>
					</div>

					{/* Top Pill Badge */}
					<a
						className={cn(
							"group mx-auto flex w-fit items-center gap-3 rounded-none border border-border bg-card p-1 shadow-2xs",
							"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
						)}
						href="#features"
					>
						<div className="border border-border bg-muted/60 px-1.5 py-0.5 shadow-2xs">
							<p className="font-mono text-xs font-semibold">NEW</p>
						</div>

						<span className="text-xs font-medium">AI-powered interview prep & tracking</span>
						<span className="block h-4 border-l border-border" />

						<div className="pr-1">
							<ArrowRightIcon className="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
						</div>
					</a>

					{/* Main Headline */}
					<h1
						className={cn(
							"max-w-4xl text-balance text-center text-4xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl sm:leading-[1.12]",
							"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out"
						)}
					>
						Track Every Application.
						<br />
						Land Your Dream Job.
					</h1>

					{/* Subtitle */}
					<p
						className={cn(
							"max-w-2xl text-center text-muted-foreground text-sm tracking-normal sm:text-lg leading-relaxed",
							"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out"
						)}
					>
						Organize your job search pipeline, practice with live AI interview coaching, and manage tailored resumes — all in one unified platform.
					</p>

					{/* CTA Buttons */}
					<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-3 delay-300 duration-500 ease-out">
						<Button variant="outline" asChild className="h-10 px-5 rounded-none text-sm font-semibold gap-2 cursor-pointer border-border">
							<a href="#features">
								<LayersIcon className="size-4" />
								Explore Platform
							</a>
						</Button>
						<Button asChild className="h-10 px-5 rounded-none text-sm font-semibold gap-2 cursor-pointer">
							<Link href="/sign-up">
								Start Free
								<ArrowRightIcon className="size-4" />
							</Link>
						</Button>
					</div>
				</div>
			</div>

			{/* Hero Mockup Glowing Stage with Blueprint Grid Crosshairs */}
			<div className="relative overflow-hidden bg-gradient-to-b from-blue-500/10 via-background to-background p-4 sm:p-8 md:p-12 lg:p-14 border-x border-border">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />

				{/* Dot Matrix Pattern Overlay */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px]"
				/>

				{/* Ambient Glow Halo */}
				<div
					aria-hidden="true"
					className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-3/4 h-64 rounded-full bg-blue-500/25 blur-[100px]"
				/>

				{/* Floating Rounded Dashboard Device Mockup */}
				<div className="relative mx-auto max-w-6xl overflow-hidden rounded-xl md:rounded-2xl border border-border/80 bg-card shadow-[0_25px_65px_-15px_rgba(0,0,0,0.35)] ring-1 ring-white/10">
					{/* Dark Mode Screenshot */}
					<Image
						alt="CareerTrack Application Dashboard (Dark Mode)"
						className="hidden dark:block w-full h-auto object-cover pointer-events-none select-none"
						height={495}
						src="/dashboard-dark.png"
						width={1024}
						priority
						unoptimized
					/>
					{/* Light Mode Screenshot */}
					<Image
						alt="CareerTrack Application Dashboard (Light Mode)"
						className="block dark:hidden w-full h-auto object-cover pointer-events-none select-none"
						height={495}
						src="/dashboard-light.png"
						width={1024}
						priority
						unoptimized
					/>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
