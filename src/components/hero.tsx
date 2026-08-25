import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon, PhoneCallIcon, Lock } from "lucide-react";
import KineticGrid from "@/components/originkit/ui/kineticgrid";

export function HeroSection() {
	return (
		<section>
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

				<div className="relative flex flex-col items-center justify-center gap-5 px-4 py-12 md:px-4 md:py-24 lg:py-28">
					{/* X Faded Borders & Shades */}
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
				<a
					className={cn(
						"group mx-auto flex w-fit items-center gap-3 rounded-sm border bg-card p-1 shadow",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards transition-all delay-500 duration-500 ease-out"
					)}
					href="#features"
				>
						<div className="rounded-xs border bg-card px-1.5 py-0.5 shadow-sm">
							<p className="font-mono text-xs">NEW</p>
						</div>

						<span className="text-xs">AI-powered interview prep is here</span>
						<span className="block h-5 border-l" />

						<div className="pr-1">
							<ArrowRightIcon className="size-3 -translate-x-0.5 duration-150 ease-out group-hover:translate-x-0.5" />
						</div>
					</a>

					<h1
					className={cn(
						"max-w-3xl text-balance text-center text-3xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl sm:leading-[1.15]",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-100 duration-500 ease-out"
					)}
				>
					Track Every Application. Land Your Dream Job.
				</h1>

				<p
					className={cn(
						"text-center text-muted-foreground text-sm tracking-normal sm:text-lg",
						"fade-in slide-in-from-bottom-10 animate-in fill-mode-backwards delay-200 duration-500 ease-out"
					)}
				>
					Organize your job search, ace interviews with AI prep, <br /> and
					manage resumes — all in one place.
				</p>

				<div className="fade-in slide-in-from-bottom-10 flex w-fit animate-in items-center justify-center gap-3 fill-mode-backwards pt-2 delay-300 duration-500 ease-out">
				<Button variant="outline" asChild className="h-9 px-4 rounded-md text-sm font-semibold gap-2 cursor-pointer">
					<a href="#features">
						<PhoneCallIcon data-icon="inline-start" />{" "}
						Learn More
					</a>
				</Button>
					<Button asChild className="h-9 px-4 rounded-md text-sm font-semibold gap-2 cursor-pointer">
						<Link href="/sign-up">
							Start Free
							<ArrowRightIcon data-icon="inline-end" />
						</Link>
					</Button>
				</div>
				</div>
			</div>
			<div className="relative px-4 py-8 sm:px-6 sm:py-12 md:py-16">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />

				{/* Outer Glowing Blue Stage Container */}
				<div className="relative mx-auto max-w-6xl overflow-hidden rounded-2xl md:rounded-3xl border border-blue-500/20 bg-gradient-to-b from-blue-600/20 via-sky-500/10 to-blue-900/10 p-3 sm:p-6 md:p-10 shadow-2xl backdrop-blur-md">
					{/* Dot Matrix Pattern Overlay */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 opacity-25 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:20px_20px]"
					/>

					{/* Top Ambient Light Glow Halo */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-3/4 h-56 rounded-full bg-blue-500/30 blur-[90px]"
					/>

					{/* Floating Dashboard Device Mockup */}
					<div className="relative overflow-hidden rounded-xl md:rounded-2xl border border-border/80 bg-background shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] ring-1 ring-white/20 dark:ring-white/10">
						{/* Dark Mode Screenshot */}
						<Image
							alt="CareerTrack Dashboard Preview (Dark Mode)"
							className="hidden dark:block w-full h-auto object-cover pointer-events-none select-none"
							height={495}
							src="/dashboard-dark.png"
							width={1024}
							priority
							unoptimized
						/>
						{/* Light Mode Screenshot */}
						<Image
							alt="CareerTrack Dashboard Preview (Light Mode)"
							className="block dark:hidden w-full h-auto object-cover pointer-events-none select-none"
							height={495}
							src="/dashboard-light.png"
							width={1024}
							priority
							unoptimized
						/>
					</div>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
