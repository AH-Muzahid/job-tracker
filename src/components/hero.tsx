import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon, PhoneCallIcon } from "lucide-react";
import KineticGrid from "@/components/originkit/ui/kineticgrid";
import { HeroDashboardMockup } from "@/components/hero-dashboard-mockup";

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
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />
				<div className="overflow-hidden shadow-2xl">
					<HeroDashboardMockup />
				</div>
				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
