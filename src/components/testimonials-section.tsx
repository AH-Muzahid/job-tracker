import { cn } from "@/lib/utils";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@/components/ui/avatar";
import { DecorIcon } from "@/components/decor-icon";
import { QuoteIcon } from "lucide-react";

type Testimonial = {
	quote: string;
	name: string;
	role: string;
	company: string;
	image: string;
};

const testimonials: Testimonial[] = [
	{
		quote:
			"CareerTrack completely transformed how I manage my job search. I went from scattered spreadsheets to having everything — applications, interviews, resumes — in one place.",
		image: "https://unavatar.io/linkedin/sarah-chen",
		name: "Sarah Chen",
		role: "Software Engineer",
		company: "Google",
	},
	{
		quote:
			"The AI interview prep is a game-changer. It generated questions specific to the role I was applying for and helped me structure my answers using the STAR method. Landed my dream job!",
		image: "https://unavatar.io/linkedin/marcus-johnson",
		name: "Marcus Johnson",
		role: "Product Manager",
		company: "Stripe",
	},
	{
		quote:
			"I applied to 50+ jobs before CareerTrack. Within two weeks of using it, I had 3 interview offers. The funnel analytics helped me see exactly where I needed to improve.",
		image: "https://unavatar.io/linkedin/priya-patel",
		name: "Priya Patel",
		role: "Data Scientist",
		company: "Netflix",
	},
];

export function TestimonialsSection() {
	return (
		<div id="testimonials" className="grid w-full gap-8 px-6 pt-24 pb-40 md:grid-cols-3 md:gap-6 md:px-8 md:pt-32 md:pb-48">
			{testimonials.map((testimonial, index) => (
				<TestimonialCard
					index={index}
					key={testimonial.name}
					testimonial={testimonial}
				/>
			))}
		</div>
	);
}

function TestimonialCard({
	testimonial,
	index,
	className,
	...props
}: React.ComponentProps<"figure"> & {
	testimonial: Testimonial;
	index: number;
}) {
	const { quote, name, role, company, image } = testimonial;

	return (
		<figure
			className={cn(
				"relative flex flex-col justify-between gap-6 px-8 pt-8 pb-6 shadow-xs md:translate-y-[calc(3rem*var(--t-card-index))]",
				"dark:bg-[radial-gradient(50%_80%_at_25%_0%,--theme(--color-foreground/.1),transparent)]",
				className
			)}
			style={
				{
					"--t-card-index": index,
				} as React.CSSProperties
			}
			{...props}
		>
			<div className="absolute -inset-y-4 -left-px w-px bg-border" />
			<div className="absolute -inset-y-4 -right-px w-px bg-border" />
			<div className="absolute -inset-x-4 -top-px h-px bg-border" />
			<div className="absolute -right-4 -bottom-px -left-4 h-px bg-border" />
			<DecorIcon className="size-3.5" position="top-left" />

			<blockquote className="flex gap-4">
				<QuoteIcon aria-hidden="true" className="size-6 shrink-0 stroke-1" />

				<p className="flex-1 font-normal text-base text-muted-foreground leading-relaxed">
					{quote}
				</p>
			</blockquote>

			<figcaption className="flex items-center gap-3">
				<Avatar className="size-10 rounded-full ring-2 ring-border ring-offset-2 ring-offset-background transition-shadow group-hover:ring-foreground/20">
					<AvatarImage alt={`${name}'s profile picture`} src={image} />
					<AvatarFallback>{name.charAt(0)}</AvatarFallback>
				</Avatar>
				<div className="flex flex-col">
					<cite className="font-medium text-foreground text-sm not-italic">
						{name}
					</cite>
					<p className="text-muted-foreground text-xs">
						{role}, <span className="text-foreground/80">{company}</span>
					</p>
				</div>
			</figcaption>
		</figure>
	);
}
