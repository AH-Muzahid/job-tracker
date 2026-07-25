import { cn } from "@/lib/utils";
import { FacebookIcon } from "@/components/facebook-icon";
import { InstagramIcon } from "@/components/instagram-icon";
import { XIcon } from "@/components/x-icon";
import { YoutubeIcon } from "@/components/youtube-icon";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { ArrowRightIcon } from "lucide-react";

export function Footer() {
	return (
		<footer>
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />

				<FullWidthDivider className="-top-px" />
				<div className="grid grid-cols-1 md:grid-cols-4 md:divide-x">
					<div>
						<SocialCard
							className="border-t-0"
							href="#"
							icon={<FacebookIcon />}
							title="Facebook"
						/>
						<LinksGroup
							links={[
								{ title: "Features", href: "#features" },
								{ title: "Pricing", href: "#pricing" },
								{ title: "Testimonials", href: "#testimonials" },
								{ title: "FAQs", href: "#faqs" },
								{ title: "About Us", href: "#about" },
							]}
							title="Product"
						/>
					</div>
					<div>
						<SocialCard href="#" icon={<YoutubeIcon />} title="Youtube" />
						<LinksGroup
							links={[
								{ title: "Help Center", href: "#" },
								{ title: "Contact Us", href: "#" },
								{ title: "Live Chat", href: "#" },
								{ title: "Community Forum", href: "#" },
								{ title: "System Status", href: "#" },
							]}
							title="Support"
						/>
					</div>

					<div>
						<SocialCard href="#" icon={<XIcon />} title="Twitter" />
						<LinksGroup
							links={[
								{ title: "Blog", href: "#" },
								{ title: "Career Resources", href: "#" },
								{ title: "Interview Tips", href: "#" },
								{ title: "Resume Guide", href: "#" },
								{ title: "Job Search 101", href: "#" },
							]}
							title="Resources"
						/>
					</div>
					<div>
						<SocialCard href="#" icon={<InstagramIcon />} title="Instagram" />
						<LinksGroup
							links={[
								{ title: "Privacy Policy", href: "#" },
								{ title: "Terms of Service", href: "#" },
								{ title: "Cookie Policy", href: "#" },
								{ title: "Security", href: "#" },
								{ title: "GDPR", href: "#" },
							]}
							title="Legal"
						/>
					</div>
				</div>
				<div className="relative h-px">
					<DecorIcon className="size-4" position="top-left" />
					<DecorIcon className="size-4" position="top-right" />
					<FullWidthDivider />
				</div>
				<div className="flex justify-center py-4">
					<p className="text-muted-foreground text-xs">
						&copy; {new Date().getFullYear()} CareerTrack, All rights reserved
					</p>
				</div>
			</div>
		</footer>
	);
}

type LinksGroupProps = {
	title: string;
	links: { title: string; href: string }[];
};
function LinksGroup({ title, links }: LinksGroupProps) {
	return (
		<div className="px-8 pt-4 pb-8">
			<h3 className="mb-4 font-medium text-xs text-muted-foreground uppercase tracking-wider">
				{title}
			</h3>
			<ul className="flex flex-col gap-2.5">
				{links.map((link) => (
					<li key={link.title}>
						<a
							className="text-muted-foreground text-sm transition-colors hover:translate-x-1 hover:text-foreground duration-200"
							href={link.href}
						>
							{link.title}
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}

function SocialCard({
	title,
	href,
	className,
	icon,
}: React.ComponentProps<"a"> & {
	title: string;
	icon?: React.ReactNode;
}) {
	return (
		<a
			className={cn(
				"group flex items-center justify-between border-y px-8 py-3 text-sm hover:bg-muted md:border-t-0 dark:hover:bg-muted/50 transition-colors",
				className
			)}
			href={href}
		>
			<span className="flex items-center gap-2 font-medium [&>svg]:size-3.5 [&>svg]:shrink-0">
				{icon}
				{title}
			</span>
			<ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
		</a>
	);
}
