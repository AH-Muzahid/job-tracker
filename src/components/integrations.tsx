"use client"

import { cn } from "@/lib/utils";
import { DecorIcon } from "@/components/decor-icon";
import { FullWidthDivider } from "@/components/full-width-divider";
import { motion } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import {
	BrainCircuitIcon,
	BarChart3Icon,
	ShieldCheckIcon,
	RocketIcon,
	LinkIcon,
	FileSpreadsheetIcon,
	ExternalLinkIcon,
} from "lucide-react";

/* ══════════════════════════════════════════════════════ */
/*               SVG FILTER DEFINITIONS                 */
/* ══════════════════════════════════════════════════════ */

function SvgFilters() {
	return (
		<svg className="absolute w-0 h-0">
			<defs>
				<filter id="glow-cyan" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feFlood floodColor="#06b6d4" result="color" />
					<feComposite in="color" in2="blur" operator="in" result="glow" />
					<feMerge>
						<feMergeNode in="glow" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
				<filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feFlood floodColor="#a78bfa" result="color" />
					<feComposite in="color" in2="blur" operator="in" result="glow" />
					<feMerge>
						<feMergeNode in="glow" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
				<filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feFlood floodColor="#10b981" result="color" />
					<feComposite in="color" in2="blur" operator="in" result="glow" />
					<feMerge>
						<feMergeNode in="glow" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
				<filter id="glow-rose" x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur stdDeviation="4" result="blur" />
					<feFlood floodColor="#f472b6" result="color" />
					<feComposite in="color" in2="blur" operator="in" result="glow" />
					<feMerge>
						<feMergeNode in="glow" />
						<feMergeNode in="SourceGraphic" />
					</feMerge>
				</filter>
			</defs>
		</svg>
	);
}

/* ══════════════════════════════════════════════════════ */
/*                 AMBIENT PARTICLES                     */
/* ══════════════════════════════════════════════════════ */

function AmbientParticles() {
	const particles = useMemo(() =>
		Array.from({ length: 40 }).map((_, i) => ({
			id: i,
			x: Math.random() * 100,
			y: Math.random() * 100,
			size: 0.8 + Math.random() * 1.2,
			duration: 12 + Math.random() * 18,
			delay: Math.random() * 8,
		})), []);

	return (
		<div className="absolute inset-0 overflow-hidden pointer-events-none">
			{particles.map((p) => (
				<motion.div
					key={p.id}
					className="absolute rounded-full bg-white/[0.1]"
					style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
					animate={{ y: [0, -40, 0], x: [0, 15, -15, 0], opacity: [0, 0.4, 0] }}
					transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
				/>
			))}
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*              GLOWING PARTICLE ON PATH                */
/* ══════════════════════════════════════════════════════ */

function GlowParticle({
	path, delay = 0, color = "#06b6d4", size = 3, speed = 2.2,
}: {
	path: string; delay?: number; color?: string; size?: number; speed?: number;
}) {
	return (
		<motion.circle r={size} fill={color} filter="url(#glow-cyan)"
			initial={{ offsetDistance: "0%", opacity: 0 }}
			animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
			transition={{ duration: speed, repeat: Infinity, delay, ease: "linear" }}
			style={{ offsetPath: `path("${path}")` }}
		/>
	);
}

/* ══════════════════════════════════════════════════════ */
/*               CARD 1: TRACKING VISUAL               */
/* ══════════════════════════════════════════════════════ */

function TrackingVisual() {
	const [counts, setCounts] = useState([0, 0, 0]);
	const targets = [247, 89, 8];

	useEffect(() => {
		const timeouts = targets.map((target, i) =>
			setTimeout(() => {
				let current = 0;
				const step = Math.ceil(target / 35);
				const interval = setInterval(() => {
					current = Math.min(current + step, target);
					setCounts((prev) => {
						const next = [...prev];
						next[i] = current;
						return next;
					});
					if (current >= target) clearInterval(interval);
				}, 35);
			}, 400 + i * 250)
		);
		return () => timeouts.forEach(clearTimeout);
	}, []);

	const inputSources = [
		{ icon: ExternalLinkIcon, label: "LinkedIn", color: "text-blue-400" },
		{ icon: LinkIcon, label: "Job URL", color: "text-purple-400" },
		{ icon: FileSpreadsheetIcon, label: "CSV", color: "text-emerald-400" },
	];

	const outputNodes = [
		{ label: "Applied", color: "text-cyan-400", border: "border-cyan-500/30", glow: "shadow-cyan-500/10" },
		{ label: "Interview", color: "text-purple-400", border: "border-purple-500/30", glow: "shadow-purple-500/10" },
		{ label: "Offer", color: "text-emerald-400", border: "border-emerald-500/30", glow: "shadow-emerald-500/10" },
	];

	return (
		<div className="space-y-3">
			{/* Stats Row */}
			<div className="grid grid-cols-3 gap-2">
				{[
					{ val: counts[0], label: "Applied", color: "text-cyan-400" },
					{ val: counts[1], label: "Interviews", color: "text-purple-400" },
					{ val: counts[2], label: "Offers", color: "text-emerald-400" },
				].map((s) => (
					<div key={s.label} className="rounded-xl border border-white/[0.08] bg-[#0c0e14]/60 p-3 text-center backdrop-blur-xl">
						<div className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.val}</div>
						<div className="text-[10px] text-white/40 mt-0.5">{s.label}</div>
					</div>
				))}
			</div>

			{/* Isometric Workflow */}
			<div className="relative rounded-xl border border-white/[0.08] bg-[#0c0e14]/60 p-4 backdrop-blur-xl overflow-hidden">
				{/* Ambient glow behind AI center */}
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-cyan-500/[0.06] blur-[40px]" />

				<svg className="absolute inset-0 w-full h-full" viewBox="0 0 320 110" preserveAspectRatio="xMidYMid meet">
					<defs>
						<linearGradient id="ray-in-1" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="rgba(59,130,246,0.6)" />
							<stop offset="100%" stopColor="rgba(6,182,212,0.6)" />
						</linearGradient>
						<linearGradient id="ray-in-2" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="rgba(167,139,250,0.6)" />
							<stop offset="100%" stopColor="rgba(6,182,212,0.6)" />
						</linearGradient>
						<linearGradient id="ray-in-3" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="rgba(52,211,153,0.6)" />
							<stop offset="100%" stopColor="rgba(6,182,212,0.6)" />
						</linearGradient>
						<linearGradient id="ray-out-1" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="rgba(6,182,212,0.6)" />
							<stop offset="100%" stopColor="rgba(34,211,238,0.6)" />
						</linearGradient>
						<linearGradient id="ray-out-2" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="rgba(6,182,212,0.6)" />
							<stop offset="100%" stopColor="rgba(167,139,250,0.6)" />
						</linearGradient>
						<linearGradient id="ray-out-3" x1="0" y1="0" x2="1" y2="0">
							<stop offset="0%" stopColor="rgba(6,182,212,0.6)" />
							<stop offset="100%" stopColor="rgba(52,211,153,0.6)" />
						</linearGradient>
					</defs>

					{/* Curved bezier rays from inputs → AI core */}
					<path d="M 82 25 C 120 25, 130 52, 155 52" fill="none" stroke="url(#ray-in-1)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
					<path d="M 82 55 C 120 55, 135 52, 155 52" fill="none" stroke="url(#ray-in-2)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
					<path d="M 82 85 C 120 85, 130 52, 155 52" fill="none" stroke="url(#ray-in-3)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />

					{/* Curved bezier rays from AI core → outputs */}
					<path d="M 165 52 C 185 52, 195 25, 235 25" fill="none" stroke="url(#ray-out-1)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
					<path d="M 165 52 C 185 52, 195 55, 235 55" fill="none" stroke="url(#ray-out-2)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
					<path d="M 165 52 C 185 52, 195 85, 235 85" fill="none" stroke="url(#ray-out-3)" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />

					{/* Glowing particles along input paths */}
					<GlowParticle path="M 82 25 C 120 25, 130 52, 155 52" delay={0} color="#3b82f6" size={2.5} speed={2} />
					<GlowParticle path="M 82 55 C 120 55, 135 52, 155 52" delay={0.5} color="#a78bfa" size={2.5} speed={2} />
					<GlowParticle path="M 82 85 C 120 85, 130 52, 155 52" delay={1} color="#34d399" size={2.5} speed={2} />

					{/* Glowing particles along output paths */}
					<GlowParticle path="M 165 52 C 185 52, 195 25, 235 25" delay={1.5} color="#06b6d4" size={2} speed={1.8} />
					<GlowParticle path="M 165 52 C 185 52, 195 55, 235 55" delay={2} color="#a78bfa" size={2} speed={1.8} />
					<GlowParticle path="M 165 52 C 185 52, 195 85, 235 85" delay={2.5} color="#10b981" size={2} speed={1.8} />

					{/* AI Core — pulsing rings */}
					<motion.circle cx={160} cy={52} r={22} fill="none" stroke="rgba(6,182,212,0.15)" strokeWidth={1}
						animate={{ r: [22, 30, 22], opacity: [0.3, 0.08, 0.3] }}
						transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
					/>
					<motion.circle cx={160} cy={52} r={17} fill="none" stroke="rgba(6,182,212,0.25)" strokeWidth={1.5}
						animate={{ r: [17, 22, 17], opacity: [0.5, 0.15, 0.5] }}
						transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
					/>
				</svg>

				<div className="relative z-10 grid grid-cols-3 gap-2 items-center h-[100px]">
					{/* Input Sources */}
					<div className="flex flex-col gap-2">
						{inputSources.map((src) => (
							<motion.div key={src.label}
								className="flex items-center gap-2 text-[11px] px-2.5 py-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] text-white/60 backdrop-blur-sm"
								whileHover={{ borderColor: "rgba(255,255,255,0.2)", scale: 1.02 }}
							>
								<src.icon className={cn("size-3.5", src.color)} />
								{src.label}
							</motion.div>
						))}
					</div>

					{/* AI Core */}
					<div className="flex items-center justify-center">
						<motion.div
							className="relative w-16 h-16 rounded-full border-2 border-cyan-500/40 bg-gradient-to-br from-cyan-500/20 to-cyan-500/5 flex items-center justify-center"
							animate={{
								boxShadow: [
									"0 0 20px rgba(6,182,212,0.2), 0 0 40px rgba(6,182,212,0.1)",
									"0 0 30px rgba(6,182,212,0.4), 0 0 60px rgba(6,182,212,0.15)",
									"0 0 20px rgba(6,182,212,0.2), 0 0 40px rgba(6,182,212,0.1)",
								],
							}}
							transition={{ duration: 2.5, repeat: Infinity }}
						>
							<BrainCircuitIcon className="size-6 text-cyan-400" />
							<motion.div className="absolute inset-0 rounded-full border-2 border-cyan-500/20"
								animate={{ scale: [1, 1.6], opacity: [0.4, 0] }}
								transition={{ duration: 1.8, repeat: Infinity }}
							/>
						</motion.div>
						<span className="absolute -bottom-0.5 text-[8px] font-medium text-cyan-400/60 bg-[#0c0e14]/90 px-1.5 py-0.5 rounded">AI Extract</span>
					</div>

					{/* Output Nodes */}
					<div className="flex flex-col gap-2">
						{outputNodes.map((node) => (
							<motion.div key={node.label}
								className={cn("text-[11px] px-2.5 py-1.5 rounded-lg border text-center bg-white/[0.03] backdrop-blur-sm shadow-lg", node.border, node.color, node.glow)}
								whileHover={{ scale: 1.03 }}
							>
								{node.label}
							</motion.div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*               CARD 2: INTERVIEW VISUAL               */
/* ══════════════════════════════════════════════════════ */

function InterviewVisual() {
	return (
		<div className="rounded-xl border border-white/[0.08] bg-[#0c0e14]/60 overflow-hidden backdrop-blur-xl">
			{/* Header */}
			<div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06]">
				<BrainCircuitIcon className="size-4 text-purple-400" />
				<span className="text-xs font-medium text-white/70">AI Interview Coach</span>
				<div className="ml-auto flex items-center gap-1.5">
					<motion.div className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]"
						animate={{ opacity: [1, 0.4, 1] }}
						transition={{ duration: 1.5, repeat: Infinity }}
					/>
					<span className="text-[11px] text-rose-400/80 font-medium">Live</span>
				</div>
			</div>

			{/* Chat Messages */}
			<div className="px-4 pt-3 space-y-2">
				{[
					{ role: "ai", text: "Tell me about a time you led a difficult project." },
					{ role: "user", text: "In my last..." },
					{ role: "ai", text: "Great STAR response!" },
				].map((msg, i) => (
					<motion.div
						key={i}
						className={cn(
							"rounded-2xl px-3 py-2 max-w-[85%] text-[11px] leading-relaxed",
							msg.role === "ai"
								? "bg-white/[0.05] border border-white/[0.08] text-white/60"
								: "bg-gradient-to-r from-purple-500/10 to-purple-500/5 border border-purple-500/15 text-white/70 ml-auto"
						)}
						initial={{ opacity: 0, y: 8 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: 0.3 + i * 0.2, type: "spring", stiffness: 200, damping: 20 }}
					>
						{msg.text}
					</motion.div>
				))}
			</div>

			{/* Audio Spectrum */}
			<div className="px-4 pt-3">
				<div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 overflow-hidden">
					<AudioSpectrum />
				</div>
			</div>

			{/* Bottom */}
			<div className="px-4 py-3 flex items-center gap-3">
				<div className="flex gap-0.5">
					{[1, 2, 3, 4, 5].map((star) => (
						<motion.span key={star} className="text-yellow-400/70 text-xs"
							initial={{ opacity: 0, scale: 0 }}
							whileInView={{ opacity: 1, scale: 1 }}
							viewport={{ once: true }}
							transition={{ delay: 0.8 + star * 0.08 }}
						>
							{star <= 4 ? "★" : "☆"}
						</motion.span>
					))}
				</div>
				<span className="text-[10px] text-white/40">STAR-method coach</span>
			</div>
		</div>
	);
}

function AudioSpectrum() {
	const barCount = 48;
	const gradients = ["#06b6d4", "#a78bfa", "#34d399", "#f472b6", "#06b6d4"];

	return (
		<div className="flex items-end justify-center gap-[2px] h-[45px]">
			{Array.from({ length: barCount }).map((_, i) => {
				const baseHeight = 6 + Math.sin(i * 0.35) * 10 + Math.cos(i * 0.2) * 8;
				const color = gradients[i % gradients.length];
				return (
					<motion.div
						key={i}
						className="w-[2.5px] rounded-full"
						style={{ backgroundColor: color, opacity: 0.75 }}
						animate={{ height: [baseHeight, baseHeight + 12, baseHeight + 6, baseHeight + 18, baseHeight] }}
						transition={{
							duration: 1.8 + Math.random() * 1.2,
							repeat: Infinity,
							ease: "easeInOut",
							delay: i * 0.04,
						}}
					/>
				);
			})}
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*               CARD 3: FUNNEL VISUAL                  */
/* ══════════════════════════════════════════════════════ */

function FunnelVisual() {
	return (
		<div className="flex flex-col items-center w-full">
			<svg viewBox="0 0 200 140" className="w-full max-w-[200px]">
				<defs>
					<linearGradient id="funnel-top" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="rgba(6,182,212,0.4)" />
						<stop offset="100%" stopColor="rgba(6,182,212,0.08)" />
					</linearGradient>
					<linearGradient id="funnel-mid" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="rgba(167,139,250,0.35)" />
						<stop offset="100%" stopColor="rgba(167,139,250,0.06)" />
					</linearGradient>
					<linearGradient id="funnel-bot" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0%" stopColor="rgba(16,185,129,0.4)" />
						<stop offset="100%" stopColor="rgba(16,185,129,0.08)" />
					</linearGradient>
					<filter id="funnel-glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feFlood floodColor="#06b6d4" floodOpacity="0.3" result="color" />
						<feComposite in="color" in2="blur" operator="in" result="glow" />
						<feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
					</filter>
					<filter id="funnel-glow-purple" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feFlood floodColor="#a78bfa" floodOpacity="0.3" result="color" />
						<feComposite in="color" in2="blur" operator="in" result="glow" />
						<feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
					</filter>
					<filter id="funnel-glow-emerald" x="-20%" y="-20%" width="140%" height="140%">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feFlood floodColor="#10b981" floodOpacity="0.3" result="color" />
						<feComposite in="color" in2="blur" operator="in" result="glow" />
						<feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
					</filter>
				</defs>

				{/* Funnel Layer 1 — Application (widest, cyan) */}
				<motion.path
					d="M 15 10 L 185 10 L 155 45 L 45 45 Z"
					fill="url(#funnel-top)" stroke="rgba(6,182,212,0.5)" strokeWidth={1.5}
					filter="url(#funnel-glow-cyan)"
					initial={{ pathLength: 0, opacity: 0 }}
					whileInView={{ pathLength: 1, opacity: 1 }}
					viewport={{ once: true }} transition={{ duration: 0.8 }}
				/>

				{/* Funnel Layer 2 — Interview (purple) */}
				<motion.path
					d="M 50 50 L 150 50 L 130 87 L 70 87 Z"
					fill="url(#funnel-mid)" stroke="rgba(167,139,250,0.45)" strokeWidth={1.5}
					filter="url(#funnel-glow-purple)"
					initial={{ pathLength: 0, opacity: 0 }}
					whileInView={{ pathLength: 1, opacity: 1 }}
					viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.15 }}
				/>

				{/* Funnel Layer 3 — Offer (narrowest, emerald) */}
				<motion.path
					d="M 75 92 L 125 92 L 118 125 L 82 125 Z"
					fill="url(#funnel-bot)" stroke="rgba(16,185,129,0.5)" strokeWidth={1.5}
					filter="url(#funnel-glow-emerald)"
					initial={{ pathLength: 0, opacity: 0 }}
					whileInView={{ pathLength: 1, opacity: 1 }}
					viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.3 }}
				/>

				{/* Liquid surface shimmer */}
				<motion.ellipse cx={100} cy={12} rx={75} ry={3}
					fill="rgba(6,182,212,0.25)"
					animate={{ rx: [73, 78, 73], opacity: [0.2, 0.4, 0.2] }}
					transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
				/>

				{/* Data spheres inside funnel */}
				{[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
					<motion.circle key={i}
						r={2.5} fill={i < 4 ? "#06b6d4" : i < 6 ? "#a78bfa" : "#10b981"}
						filter={i < 4 ? "url(#glow-cyan)" : i < 6 ? "url(#glow-purple)" : "url(#glow-emerald)"}
						animate={{
							cy: [12, 28, 50, 68, 92, 108],
							cx: [80 + i * 5, 100, 100, 100, 100, 100],
							opacity: [0, 1, 1, 0.8, 0.6, 0],
							r: [2.5, 2, 2, 1.5, 1.5, 1],
						}}
						transition={{ duration: 3.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
					/>
				))}

				{/* Choke point swirl */}
				<motion.circle cx={100} cy={48} r={4} fill="none" stroke="rgba(6,182,212,0.3)" strokeWidth={1}
					animate={{ r: [3, 7, 3], rotate: [0, 360] }}
					transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
					style={{ transformOrigin: "100px 48px" }}
				/>

				{/* Labels — Left side */}
				<text x={2} y={30} fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace">Application</text>
				<text x={10} y={72} fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace">Interview</text>
				<text x={35} y={112} fill="rgba(255,255,255,0.4)" fontSize={7} fontFamily="monospace">Offer</text>

				{/* Labels — Right side (conversion rates) */}
				<text x={138} y={30} fill="rgba(6,182,212,0.6)" fontSize={6} fontFamily="monospace">App-to-Interview: 26%</text>
				<text x={138} y={72} fill="rgba(167,139,250,0.6)" fontSize={6} fontFamily="monospace">Interview-to-Offer: 9%</text>
			</svg>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*              CARD 4: REVIEW VISUAL                   */
/* ══════════════════════════════════════════════════════ */

function ReviewVisual() {
	const items = [
		{ text: "8-new-applications", done: true, ai: false },
		{ text: "2-interviews-scheduled", done: true, ai: false },
		{ text: "Follow up with Google", done: false, ai: true },
		{ text: "Update resume for Meta", done: false, ai: true },
	];

	return (
		<div className="relative w-full">
			<svg className="w-full" viewBox="0 0 280 130" preserveAspectRatio="xMidYMid meet">
				<defs>
					<filter id="node-glow-green" x="-50%" y="-50%" width="200%" height="200%">
						<feGaussianBlur stdDeviation="3" result="blur" />
						<feFlood floodColor="#10b981" result="color" />
						<feComposite in="color" in2="blur" operator="in" result="glow" />
						<feMerge><feMergeNode in="glow" /><feMergeNode in="SourceGraphic" /></feMerge>
					</filter>
				</defs>

				{/* Central AI brain node — positioned far right */}
				<motion.g
					initial={{ opacity: 0, scale: 0.5 }}
					whileInView={{ opacity: 1, scale: 1 }}
					viewport={{ once: true }}
					transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
				>
					<circle cx={230} cy={65} r={18} fill="rgba(167,139,250,0.1)" stroke="rgba(167,139,250,0.3)" strokeWidth={1} />
					<motion.circle cx={230} cy={65} r={18} fill="none" stroke="rgba(167,139,250,0.15)" strokeWidth={1}
						animate={{ r: [18, 26, 18], opacity: [0.3, 0, 0.3] }}
						transition={{ duration: 3, repeat: Infinity }}
					/>
					<BrainCircuitIcon className="size-4 text-purple-400/70" x={222} y={57} />
				</motion.g>

				{/* Vertical timeline nodes */}
				{items.map((item, i) => {
					const y = 16 + i * 28;
					const nodeX = 24;
					return (
						<g key={i}>
							{/* Vertical dashed connecting line */}
							{i < items.length - 1 && (
								<motion.line
									x1={nodeX} y1={y + 8} x2={nodeX} y2={y + 20}
									stroke={item.done ? "rgba(16,185,129,0.4)" : "rgba(6,182,212,0.25)"}
									strokeWidth={1.5} strokeDasharray="3 3"
									initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
									viewport={{ once: true }} transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
								/>
							)}

							{/* Glowing node circle */}
							{item.done ? (
								<motion.circle
									cx={nodeX} cy={y} r={9}
									fill="rgba(16,185,129,0.2)" stroke="rgba(16,185,129,0.7)" strokeWidth={1.5}
									filter="url(#node-glow-green)"
									initial={{ scale: 0 }} whileInView={{ scale: 1 }}
									viewport={{ once: true }}
									transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
								/>
							) : (
								<motion.circle
									cx={nodeX} cy={y} r={9}
									fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth={1.2}
									initial={{ scale: 0 }} whileInView={{ scale: 1 }}
									viewport={{ once: true }}
									transition={{ delay: 0.2 + i * 0.1, type: "spring", stiffness: 200 }}
								/>
							)}

							{/* Checkmark for done items */}
							{item.done && (
								<motion.path
									d={`M ${nodeX - 3} ${y} L ${nodeX - 1} ${y + 3} L ${nodeX + 4} ${y - 3}`}
									stroke="rgba(16,185,129,0.9)" strokeWidth={1.5} fill="none"
									initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
									viewport={{ once: true }} transition={{ delay: 0.35 + i * 0.1 }}
								/>
							)}

							{/* Item text */}
							<text x={nodeX + 18} y={y + 3.5}
								fill={item.done ? "rgba(203,213,225,0.5)" : "rgba(226,232,240,0.8)"}
								fontSize={9} fontFamily="sans-serif" fontWeight={item.done ? "normal" : "500"}
								textDecoration={item.done ? "line-through" : "none"}>
								{item.text}
							</text>

							{/* Connection line from item to AI core */}
							<motion.line
								x1={nodeX + 115} y1={y} x2={215} y2={65}
								stroke={item.ai ? "rgba(34,211,238,0.12)" : "rgba(255,255,255,0.04)"}
								strokeWidth={0.6} strokeDasharray="2 2"
								initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }}
								viewport={{ once: true }} transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
							/>

							{/* AI suggestion badge */}
							{item.ai && (
								<motion.g
									initial={{ opacity: 0, x: -8 }}
									whileInView={{ opacity: 1, x: 0 }}
									viewport={{ once: true }}
									transition={{ delay: 0.5 + i * 0.1, type: "spring", stiffness: 300 }}
								>
									<rect x={nodeX + 118} y={y - 8} width={62} height={16} rx={8}
										fill="rgba(34,211,238,0.1)" stroke="rgba(34,211,238,0.3)" strokeWidth={0.7} />
									<text x={nodeX + 149} y={y + 3} fill="rgba(34,211,238,0.8)" fontSize={7} textAnchor="middle" fontFamily="monospace">
										AI suggestion
									</text>
								</motion.g>
							)}
						</g>
					);
				})}
			</svg>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*               CARD 5: OFFER VISUAL                   */
/* ══════════════════════════════════════════════════════ */

function OfferVisual() {
	const offers = [
		{ amount: "$120K", badge: "+ Equity", x: 15, y: 10, size: 72, color: "rgba(34,211,238,0.4)" },
		{ amount: "$95K", badge: "+ Bonus", x: 160, y: 10, size: 65, color: "rgba(167,139,250,0.4)" },
		{ amount: "$140K", badge: "+ Stock", x: 90, y: 90, size: 72, color: "rgba(236,72,153,0.4)" },
	];

	return (
		<div className="relative w-full h-[170px]">
			<svg className="absolute inset-0 w-full h-full" viewBox="0 0 260 170" preserveAspectRatio="xMidYMid meet">
				<defs>
					<pattern id="offer-grid" width="18" height="18" patternUnits="userSpaceOnUse">
						<path d="M 18 0 L 0 0 0 18" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth={0.5} />
					</pattern>
				</defs>
				<rect width="260" height="170" fill="url(#offer-grid)" />

				{/* Orbital ring */}
				<motion.ellipse cx={130} cy={75} rx={100} ry={40}
					fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={1} strokeDasharray="4 4"
					animate={{ strokeDashoffset: [0, -32] }}
					transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
				/>
				<motion.ellipse cx={130} cy={75} rx={75} ry={28}
					fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={0.8}
					animate={{ strokeDashoffset: [0, 24] }}
					transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
				/>

				{/* Connection lines to center */}
				{offers.map((o, i) => (
					<line key={`conn-${i}`}
						x1={o.x + o.size / 2} y1={o.y + o.size / 2}
						x2={130} y2={75}
						stroke="rgba(255,255,255,0.05)" strokeWidth={0.6} strokeDasharray="3 3"
					/>
				))}

				{/* Connection lines between offers */}
				<line x1={51} y1={46} x2={192} y2={42} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} strokeDasharray="2 2" />
				<line x1={51} y1={46} x2={126} y2={126} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} strokeDasharray="2 2" />
				<line x1={192} y1={42} x2={126} y2={126} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} strokeDasharray="2 2" />
			</svg>

			{/* Offer cards */}
			{offers.map((o, i) => (
				<motion.div
					key={i}
					className="absolute flex flex-col items-center justify-center rounded-xl border border-white/10 bg-[#0c0e14]/80 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.5)]"
					style={{ left: o.x, top: o.y, width: o.size, height: o.size }}
					animate={{ y: [0, -4, 0] }}
					transition={{ duration: 4 + i * 0.6, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
					whileHover={{ scale: 1.08, borderColor: o.color }}
				>
					<div className="text-sm font-bold text-foreground">{o.amount}</div>
					<div className="text-[9px] text-white/40 mt-0.5">{o.badge}</div>
				</motion.div>
			))}

			{/* Center rocket + label — positioned between the cards */}
			<div className="absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
				<motion.div
					className="w-11 h-11 rounded-full border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center backdrop-blur-sm"
					animate={{
						boxShadow: [
							"0 0 15px rgba(255,255,255,0.03)",
							"0 0 30px rgba(255,255,255,0.08)",
							"0 0 15px rgba(255,255,255,0.03)",
						],
					}}
					transition={{ duration: 4, repeat: Infinity }}
				>
					<RocketIcon className="size-4 text-white/50" />
				</motion.div>
				<span className="text-[9px] text-white/40 font-medium">Offer Comparison</span>
			</div>
		</div>
	);
}

/* ══════════════════════════════════════════════════════ */
/*                   CARD PRIMITIVES                     */
/* ══════════════════════════════════════════════════════ */

function Card({ children, className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			className={cn(
				"relative flex flex-col h-full rounded-2xl overflow-hidden",
				"bg-[#0c0e14]/80 backdrop-blur-2xl border border-white/10",
				"shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.5)]",
				"transition-all duration-300",
				"hover:border-white/[0.15] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_40px_rgba(0,0,0,0.6)]",
				className
			)}
			{...props}
		>
			{children}
		</div>
	);
}

function CardVisual({ children, className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("relative border-b border-white/5 bg-white/[0.02] flex-1 flex flex-col", className)} {...props}>
			{children}
		</div>
	);
}

function CardContent({ children, className, ...props }: React.ComponentProps<"div">) {
	return (
		<div className={cn("min-h-[100px] flex flex-col justify-end p-6 border-t border-white/5", className)} {...props}>
			{children}
		</div>
	);
}

function CardTitle({ children, className, ...props }: React.ComponentProps<"h3">) {
	return <h3 className={cn("font-bold text-foreground text-base leading-tight", className)} {...props}>{children}</h3>;
}

function CardDescription({ children, className, ...props }: React.ComponentProps<"p">) {
	return <p className={cn("text-muted-foreground text-sm mt-1.5 leading-relaxed", className)} {...props}>{children}</p>;
}

/* ══════════════════════════════════════════════════════ */
/*                    MAIN EXPORT                       */
/* ══════════════════════════════════════════════════════ */

export function Integrations() {
	return (
		<section className="relative">
			<SvgFilters />

			{/* Background glow halos */}
			<div className="absolute inset-0 -z-10 overflow-hidden">
				<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-cyan-500/[0.02] blur-[180px]" />
				<div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full bg-purple-500/[0.015] blur-[140px]" />
				<div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-emerald-500/[0.012] blur-[120px]" />
				<AmbientParticles />
			</div>

			<div className="relative">
				<DecorIcon className="size-4" position="top-left" />
				<DecorIcon className="size-4" position="top-right" />
				<FullWidthDivider className="-top-px" />

				<div className="px-4 py-16 md:px-8 md:py-24">
					<motion.div
						className="max-w-3xl mx-auto text-center mb-16"
						initial={{ opacity: 0, y: 20 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true, margin: "-100px" }}
						transition={{ duration: 0.6 }}
					>
						<h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
							Your All-in-One Job Search Platform
						</h2>
						<p className="text-sm md:text-base text-muted-foreground">
							From application to offer — simplify your job hunt with AI-powered tools every step of the way.
						</p>
					</motion.div>

					{/* Top Row — 2 large cards */}
					<motion.div
						className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-6"
						initial="hidden" whileInView="visible"
						viewport={{ once: true, margin: "-50px" }}
						variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.12 } } }}
					>
						<motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
							<Card>
								<CardVisual className="p-6">
									<TrackingVisual />
								</CardVisual>
								<CardContent>
									<CardTitle>Smart Application Tracking</CardTitle>
									<CardDescription>Auto-import from LinkedIn, paste a job URL, or upload CSV. AI extracts every detail.</CardDescription>
								</CardContent>
							</Card>
						</motion.div>

						<motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}>
							<Card>
								<CardVisual className="p-6">
									<InterviewVisual />
								</CardVisual>
								<CardContent>
									<CardTitle>AI Interview Prep</CardTitle>
									<CardDescription>Generate tailored questions, practice with mock interviews, and get STAR-method coaching.</CardDescription>
								</CardContent>
							</Card>
						</motion.div>
					</motion.div>

					{/* Bottom Row — 3 smaller cards */}
					<motion.div
						className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6 mt-6"
						initial="hidden" whileInView="visible"
						viewport={{ once: true, margin: "-50px" }}
						variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
					>
						<motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
							<Card>
								<CardVisual className="p-6 flex items-center justify-center min-h-[180px]">
									<FunnelVisual />
								</CardVisual>
								<CardContent>
									<div className="flex items-center gap-2 mb-1">
										<BarChart3Icon className="size-4 text-cyan-400/60" />
										<CardTitle>Funnel Analytics</CardTitle>
									</div>
									<CardDescription>Visualize conversion rates, response times, and source analytics at a glance.</CardDescription>
								</CardContent>
							</Card>
						</motion.div>

						<motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
							<Card>
								<CardVisual className="p-6 flex items-center justify-center min-h-[180px]">
									<ReviewVisual />
								</CardVisual>
								<CardContent>
									<div className="flex items-center gap-2 mb-1">
										<ShieldCheckIcon className="size-4 text-purple-400/60" />
										<CardTitle>Weekly AI Reviews</CardTitle>
									</div>
									<CardDescription>Your agent tracks progress, suggests next moves, and keeps you accountable.</CardDescription>
								</CardContent>
							</Card>
						</motion.div>

						<motion.div variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } }}>
							<Card>
								<CardVisual className="p-6 flex items-center justify-center min-h-[180px]">
									<OfferVisual />
								</CardVisual>
								<CardContent>
									<div className="flex items-center gap-2 mb-1">
										<RocketIcon className="size-4 text-emerald-400/60" />
										<CardTitle>Land the Offer</CardTitle>
									</div>
									<CardDescription>Compare offers, get negotiation tips, and celebrate your new role.</CardDescription>
								</CardContent>
							</Card>
						</motion.div>
					</motion.div>
				</div>

				<FullWidthDivider className="-bottom-px" />
			</div>
		</section>
	);
}
