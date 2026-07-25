import { LogoCloud } from "@/components/logo-cloud"; // @efferd/logo-cloud-2
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";

export function LogosSection() {
	return (
		<section>
			<h2 className="py-6 text-center font-medium text-lg text-muted-foreground tracking-tight md:text-xl">
				Trusted by <span className="text-foreground">professionals at top companies</span>
			</h2>
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />
				<LogoCloud />
				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
