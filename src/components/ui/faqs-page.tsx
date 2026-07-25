import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";

export function FaqsSection() {
	return (
		<section>
			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<DecorIcon className="size-4" position="bottom-left" />
				<DecorIcon className="size-4" position="bottom-right" />

				<FullWidthDivider className="-top-px" />
				<div className="grid grid-cols-1 md:grid-cols-2">
					<div className="px-6 pt-10 pb-6">
						<div className="space-y-4">
							<h2 className="text-balance text-3xl md:text-4xl font-semibold tracking-tight text-foreground">
								Frequently Asked Questions
							</h2>
							<p className="text-muted-foreground text-sm leading-relaxed">
								Quick answers to common questions about CareerTrack. Open any question to
								learn more.
							</p>
							<p className="text-muted-foreground text-sm">
								{"Can't find what you're looking for? "}
								<a className="text-primary font-medium hover:underline" href="#">
									Contact Us
								</a>
							</p>
						</div>
					</div>
					<div className="relative place-content-center">
						<div
							aria-hidden="true"
							className="pointer-events-none absolute inset-y-0 left-3 h-full w-px bg-border"
						/>

						<Accordion
							className="rounded-none border-x-0 border-y-0"
							collapsible
							type="single"
						>
							{faqs.map((item) => (
								<AccordionItem
									className="group relative pl-5 border-b last:border-b-0"
									key={item.id}
									value={item.id}
								>
									<DecorIcon
										className="left-3.25 size-3 group-last:hidden"
										position="bottom-left"
									/>

									<AccordionTrigger className="px-4 py-3.5 text-sm text-foreground hover:no-underline focus-visible:underline focus-visible:ring-0">
										{item.title}
									</AccordionTrigger>

									<AccordionContent className="px-4 pb-4 text-sm text-muted-foreground">
										{item.content}
									</AccordionContent>
								</AccordionItem>
							))}
						</Accordion>
					</div>
				</div>
				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}

const faqs = [
	{
		id: "item-1",
		title: "What is CareerTrack?",
		content:
			"CareerTrack is an all-in-one job tracking platform that helps you organize applications, prep for interviews with AI, track weekly goals, and land your dream job faster.",
	},
	{
		id: "item-2",
		title: "Is CareerTrack free to use?",
		content:
			"Yes! CareerTrack offers a generous free plan that lets you track unlimited applications with core features. No credit card required to get started.",
	},
	{
		id: "item-3",
		title: "How does the AI interview prep work?",
		content:
			"CareerTrack generates tailored interview questions based on the specific role you're applying for, provides STAR-method answer frameworks, and lets you practice with AI-powered mock interviews.",
	},
	{
		id: "item-4",
		title: "Can I import my existing applications?",
		content:
			"Yes. You can easily import your applications from spreadsheets, emails, or other tools. CareerTrack supports CSV import and quick-add to get you started in minutes.",
	},
	{
		id: "item-5",
		title: "How does the JD Scanner work?",
		content:
			"Simply paste a job description and CareerTrack will analyze it for keyword matches, identify missing skills, and suggest resume optimization tips to improve your ATS score.",
	},
	{
		id: "item-6",
		title: "Is my data secure?",
		content:
			"Absolutely. CareerTrack is SOC 2 certified, GDPR compliant, and uses end-to-end encryption to keep your job search data safe and private.",
	},
	{
		id: "item-7",
		title: "How do I get started?",
		content:
			"Just sign up for a free account, and you'll be tracking your applications within minutes. No setup wizard required — it's that simple.",
	},
];
