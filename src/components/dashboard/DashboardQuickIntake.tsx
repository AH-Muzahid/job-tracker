"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bot, Clipboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUI } from "@/lib/store";
import { DashboardCard } from "@/components/dashboard-card";

export function DashboardQuickIntake() {
	const router = useRouter();
	const [jdText, setJdText] = useState("");
	const [aiLoading, setAiLoading] = useState(false);
	const [detectedCompany, setDetectedCompany] = useState<string | null>(null);
	const [detectedRole, setDetectedRole] = useState<string | null>(null);

	const { setPendingPrompt } = useUI();

	useEffect(() => {
		if (!jdText.trim()) {
			setDetectedCompany(null);
			setDetectedRole(null);
			return;
		}
		const companyMatch = jdText.match(/(?:at|about|company:?)\s+([A-Z][A-Za-z0-9\s&]{2,20})/i);
		const roleMatch = jdText.match(/(?:looking for a|hiring a|role:?|title:?)\s+([A-Z][A-Za-z0-9\s-]{3,25})/i);
		if (companyMatch) setDetectedCompany(companyMatch[1].trim());
		if (roleMatch) setDetectedRole(roleMatch[1].trim());
	}, [jdText]);

	const handlePasteClipboard = async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				setJdText(text);
				toast.success("Pasted from clipboard!");
			} else {
				toast.error("Clipboard is empty");
			}
		} catch {
			toast.error("Unable to access clipboard. Please paste manually.");
		}
	};

	const handleAiScan = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!jdText.trim()) {
			toast.error("Please paste a Job Description first");
			return;
		}

		setAiLoading(true);
		setPendingPrompt(`Analyze this job description:\n\n${jdText}`);
		toast.success("Opening AI Assistant...");

		setTimeout(() => {
			router.push("/ai-assistant");
		}, 300);
	};

	return (
		<DashboardCard className="gap-3 p-4 h-full">
			<div className="flex items-center justify-between gap-2 pb-3 border-b border-border">
				<div className="flex items-center gap-2">
					<div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border shrink-0">
						<Bot className="size-4" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-foreground tracking-tight">
							Quick JD Intake
						</h2>
						<p className="text-xs text-muted-foreground">
							Paste & scan a job posting.
						</p>
					</div>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handlePasteClipboard}
					className="h-8 text-xs font-mono bg-muted/30 border-border text-muted-foreground hover:text-foreground cursor-pointer"
				>
					<Clipboard className="size-3.5 mr-1.5" />
					Paste
				</Button>
			</div>

			<form onSubmit={handleAiScan} className="space-y-3 flex-1 flex flex-col">
				<div className="relative flex-1">
					<Textarea
						placeholder="Paste job description text or URL here..."
						className="min-h-[80px] max-h-[140px] text-xs leading-relaxed resize-none bg-muted/20 border-border focus-visible:ring-1 placeholder:text-muted-foreground/60 rounded-lg"
						value={jdText}
						onChange={(e) => setJdText(e.target.value)}
					/>
					{(detectedCompany || detectedRole) && (
						<div className="absolute bottom-2 right-2 flex items-center gap-1.5">
							{detectedCompany && (
								<span className="text-[10px] font-mono bg-background border border-border text-foreground px-2 py-0.5 rounded-md">
									{detectedCompany}
								</span>
							)}
							{detectedRole && (
								<span className="text-[10px] font-mono bg-background border border-border text-foreground px-2 py-0.5 rounded-md truncate max-w-[120px]">
									{detectedRole}
								</span>
							)}
						</div>
					)}
				</div>

				<div className="flex items-center justify-between gap-2">
					<span className="text-[11px] font-mono text-muted-foreground">
						{jdText.length > 0 ? `${jdText.length} chars` : "AI Role & Skill Match"}
					</span>
					<Button
						type="submit"
						size="sm"
						disabled={aiLoading || !jdText.trim()}
						className="text-xs font-semibold h-8 px-4 cursor-pointer"
					>
						{aiLoading ? (
							<>
								<Loader2 className="size-3.5 animate-spin mr-1.5" />
								Opening...
							</>
						) : (
							<>
								<Bot className="size-3.5 mr-1.5" />
								Intake & Match
							</>
						)}
					</Button>
				</div>
			</form>
		</DashboardCard>
	);
}
