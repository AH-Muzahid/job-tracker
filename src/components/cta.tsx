import { Button } from "@/components/ui/button";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon } from "lucide-react";

export function CallToAction() {
	return (
		<section>
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />
				<div className="flex flex-col gap-6 px-4 py-16 md:py-24">
					<h2 className="text-center font-semibold text-2xl md:text-4xl text-foreground">
						Start Landing Your Dream Job Today!
					</h2>
					<p className="text-balance text-center text-muted-foreground text-sm md:text-lg">
						Join 12,500+ job seekers tracking their way to success. No credit card required, cancel anytime.
					</p>

					<div className="flex items-center justify-center gap-3">
						<Button variant="outline" size="lg">Learn More</Button>
						<Button size="lg">
							Get Started
							<ArrowRightIcon data-icon="inline-end" />
						</Button>
					</div>
				</div>
				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
