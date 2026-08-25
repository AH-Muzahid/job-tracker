"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon } from "lucide-react";
import { SignInModal } from "@/components/sign-in-modal";

export function CallToAction() {
	const [authOpen, setAuthOpen] = useState(false);

	return (
		<section>
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />
				<div className="flex flex-col gap-6 px-4 py-16 md:py-24">
					<h2 className="text-center font-semibold text-2xl md:text-4xl text-foreground tracking-tight">
						Ready to Accelerate Your Job Search?
					</h2>
					<p className="text-balance text-center text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
						Join over 12,500+ ambitious job seekers using CareerTrack to organize applications, master AI interviews, and land top offers.
					</p>

					<div className="flex items-center justify-center gap-3">
						<Button variant="outline" size="lg" asChild>
							<a href="#features">Learn More</a>
						</Button>
						<Button size="lg" onClick={() => setAuthOpen(true)} className="cursor-pointer">
							Get Started
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</div>
				</div>
				<FullWidthDivider className="-bottom-px" />
			</div>
			<SignInModal open={authOpen} onOpenChange={setAuthOpen} />
		</section>
	);
}

