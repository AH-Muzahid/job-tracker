"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Bot, Plus, Upload, Clipboard, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useUI } from "@/lib/store";
import { DashboardCard } from "@/components/dashboard-card";
import { UploadMode } from "./command-zone/UploadMode";
import { ManualEntryMode } from "./command-zone/ManualEntryMode";

type Mode = "scan" | "upload" | "manual";

export function DashboardCommandZone({ activePipeline = 0 }: { activePipeline?: number }) {
	const { user } = useUser();
	const router = useRouter();
	const [mode, setMode] = useState<Mode>("scan");

	// Scan state
	const [jdText, setJdText] = useState("");
	const [aiLoading, setAiLoading] = useState(false);
	const [detectedCompany, setDetectedCompany] = useState<string | null>(null);
	const [detectedRole, setDetectedRole] = useState<string | null>(null);

	// Upload state
	const [uploading, setUploading] = useState(false);

	// Manual state
	const [manualCompany, setManualCompany] = useState("");
	const [manualTitle, setManualTitle] = useState("");
	const [manualSource, setManualSource] = useState("LinkedIn");
	const [manualLoading, setManualLoading] = useState(false);

	const { setPendingPrompt } = useUI();

	const firstName = user?.firstName || "there";

	// Real-time lightweight extraction heuristic
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

	// Paste from clipboard
	const handlePasteClipboard = async () => {
		try {
			const text = await navigator.clipboard.readText();
			if (text) {
				setJdText(text);
				setMode("scan");
				toast.success("Pasted text from clipboard!");
			} else {
				toast.error("Clipboard is empty");
			}
		} catch {
			toast.error("Unable to access clipboard. Please paste manually.");
		}
	};

	// File upload handler
	const handleFileUpload = async (file: File) => {
		setUploading(true);
		const toastId = toast.loading(`Extracting text from ${file.name}...`);
		try {
			const formData = new FormData();
			formData.append("file", file);

			const res = await fetch("/api/ai/parse-jd-file", {
				method: "POST",
				body: formData,
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to parse file");
			}

			const data = await res.json();
			setJdText(data.text);
			setMode("scan");
			toast.success("JD text extracted successfully!", { id: toastId });
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : "Upload error";
			toast.error(msg, { id: toastId });
		} finally {
			setUploading(false);
		}
	};

	// AI Scan Submission -> Navigates to AI Assistant with prompt
	const handleAiScan = async (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		if (!jdText.trim()) {
			toast.error("Please paste or upload a Job Description first");
			return;
		}

		setAiLoading(true);
		setPendingPrompt(`Analyze this job description:\n\n${jdText}`);
		toast.success("Opening AI Assistant...");

		setTimeout(() => {
			router.push("/ai-assistant");
		}, 300);
	};

	// Manual Creation
	const handleManualSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!manualCompany.trim() || !manualTitle.trim()) {
			toast.error("Company and Job Title are required");
			return;
		}

		setManualLoading(true);
		try {
			const res = await fetch("/api/applications", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					companyName: manualCompany.trim(),
					jobTitle: manualTitle.trim(),
					source: manualSource,
					status: "Saved",
					applicationDate: new Date().toISOString(),
				}),
			});

			if (!res.ok) {
				const data = await res.json();
				throw new Error(data.error || "Failed to create application");
			}

			const app = await res.json();
			toast.success("Application created!");
			setManualCompany("");
			setManualTitle("");
			router.push(`/applications/${app.id}`);
			router.refresh();
		} catch (err: unknown) {
			const errMsg = err instanceof Error ? err.message : "Failed to create";
			toast.error(errMsg);
		} finally {
			setManualLoading(false);
		}
	};

	return (
		<DashboardCard className="p-5 sm:p-6 gap-4">
			{/* Top Header Row */}
			<div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border">
				<div className="flex items-center gap-2.5">
					<div className="flex size-7 items-center justify-center rounded-md bg-muted text-foreground border border-border shrink-0">
						<Bot className="size-4" />
					</div>
					<div>
						<h2 className="text-sm font-semibold text-foreground tracking-tight">
							Instant JD Intake & Match
						</h2>
						<p className="text-xs text-muted-foreground">
							Paste any job posting to analyze fit, extract key requirements, or log to pipeline.
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={handlePasteClipboard}
						className="h-8 text-xs font-mono bg-muted/30 border-border text-muted-foreground hover:text-foreground cursor-pointer"
					>
						<Clipboard className="size-3.5 mr-1.5" />
						Paste JD
					</Button>
					<Button
						type="button"
						size="sm"
						onClick={() => setMode("manual")}
						className="h-8 text-xs font-medium cursor-pointer"
					>
						<Plus className="size-3.5 mr-1" />
						Log Job
					</Button>
				</div>
			</div>

			{/* Segmented Controls & Intake Area */}
			<div className="space-y-3">
				<div className="flex items-center justify-between gap-2">
					<div className="inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-muted/40 text-xs">
						<button
							type="button"
							onClick={() => setMode("scan")}
							className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
								mode === "scan"
									? "bg-background text-foreground shadow-xs font-semibold"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Bot className="size-3" />
							AI Intake (Paste / URL)
						</button>

						<button
							type="button"
							onClick={() => setMode("upload")}
							className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
								mode === "upload"
									? "bg-background text-foreground shadow-xs font-semibold"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Upload className="size-3" />
							PDF / File
						</button>

						<button
							type="button"
							onClick={() => setMode("manual")}
							className={`px-3 py-1 rounded-md transition-all cursor-pointer font-medium flex items-center gap-1.5 ${
								mode === "manual"
									? "bg-background text-foreground shadow-xs font-semibold"
									: "text-muted-foreground hover:text-foreground"
							}`}
						>
							<Plus className="size-3" />
							Quick Entry
						</button>
					</div>

					<span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
						Press ⌘V to paste
					</span>
				</div>

				{/* MODE 1: Scan / Paste Text */}
				{mode === "scan" && (
					<form onSubmit={handleAiScan} className="space-y-2.5">
						<div className="relative">
							<Textarea
								placeholder="Paste full job description text or job post URL here..."
								className="min-h-[100px] max-h-[160px] text-xs leading-relaxed resize-none bg-muted/20 border-border focus-visible:ring-1 placeholder:text-muted-foreground/60 rounded-lg"
								value={jdText}
								onChange={(e) => setJdText(e.target.value)}
							/>
							{(detectedCompany || detectedRole) && (
								<div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
									{detectedCompany && (
										<span className="text-[10px] font-mono bg-background border border-border text-foreground px-2 py-0.5 rounded-md">
											🏢 {detectedCompany}
										</span>
									)}
									{detectedRole && (
										<span className="text-[10px] font-mono bg-background border border-border text-foreground px-2 py-0.5 rounded-md truncate max-w-[140px]">
											💼 {detectedRole}
										</span>
									)}
								</div>
							)}
						</div>

						<div className="flex items-center justify-between">
							<span className="text-[11px] font-mono text-muted-foreground">
								{jdText.length > 0 ? `${jdText.length} characters` : "Instant AI Role & Skill Match"}
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
										Opening Assistant...
									</>
								) : (
									<>
										<Bot className="size-3.5 mr-1.5" />
										Intake & Match with AI
									</>
								)}
							</Button>
						</div>
					</form>
				)}

				{/* MODE 2: Upload File */}
				{mode === "upload" && (
					<UploadMode uploading={uploading} onFileUpload={handleFileUpload} />
				)}

				{/* MODE 3: Manual Entry */}
				{mode === "manual" && (
					<ManualEntryMode
						manualCompany={manualCompany}
						setManualCompany={setManualCompany}
						manualTitle={manualTitle}
						setManualTitle={setManualTitle}
						manualSource={manualSource}
						setManualSource={setManualSource}
						manualLoading={manualLoading}
						onSubmit={handleManualSubmit}
					/>
				)}
			</div>
		</DashboardCard>
	);
}
