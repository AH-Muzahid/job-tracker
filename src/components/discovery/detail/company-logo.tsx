import React from "react"

export function getCompanyLogo(company: string, size: "sm" | "md" | "lg" = "md") {
  const lower = (company || "").toLowerCase()

  const sizeClass = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-14 sm:size-16 text-xl",
  }[size]

  if (lower.includes("google")) {
    return {
      bg: "bg-white border-border shadow-xs",
      sizeClass,
      content: (
        <svg viewBox="0 0 24 24" className={size === "lg" ? "size-7 sm:size-8" : "size-5"}>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      ),
    }
  }

  if (lower.includes("meta") || lower.includes("facebook")) {
    return {
      bg: "bg-[#0668E1] text-white border-transparent shadow-xs",
      sizeClass,
      content: (
        <svg viewBox="0 0 24 24" className={size === "lg" ? "size-7" : "size-4.5"} fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      ),
    }
  }

  if (lower.includes("apple")) {
    return {
      bg: "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent shadow-xs",
      sizeClass,
      content: (
        <svg viewBox="0 0 170 170" className={size === "lg" ? "size-6" : "size-4"} fill="currentColor">
          <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.81-11.96-14.34-6.49-9.87-11.58-21.09-15.26-33.66-3.68-12.57-5.52-24.32-5.52-35.25 0-14.12 3.56-26.06 10.68-35.81 7.12-9.76 16.2-14.73 27.24-14.93 4.8 0 10.22 1.25 16.27 3.76 6.05 2.51 10.02 3.82 11.92 3.93 2.12-.22 6.35-1.58 12.69-4.08 6.34-2.5 11.83-3.64 16.48-3.43 12.57.65 22.84 5.38 30.79 14.19-11.01 6.64-16.39 15.79-16.14 27.44.25 9.14 3.73 16.89 10.45 23.23 6.72 6.35 14.86 10.13 24.41 11.34-2.18 6.42-4.74 13.06-7.68 19.92zM119.22 31.84c0-7.72 2.76-14.94 8.28-21.66 5.53-6.72 12.44-10.18 20.75-10.18.22 1.09.28 2.07.19 2.94-.33 7.84-3.32 15.19-8.99 22.04-5.66 6.85-12.77 10.67-21.32 11.47.11-1.53.16-3.06.16-4.61z" />
        </svg>
      ),
    }
  }

  if (lower.includes("amazon")) {
    return {
      bg: "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/30 shadow-xs",
      sizeClass,
      content: <span className="font-extrabold tracking-tight font-sans">a</span>,
    }
  }

  if (lower.includes("stripe")) {
    return {
      bg: "bg-[#635BFF] text-white border-transparent shadow-xs",
      sizeClass,
      content: <span className="font-bold tracking-tighter">S</span>,
    }
  }

  if (lower.includes("notion")) {
    return {
      bg: "bg-white text-black border-border shadow-xs",
      sizeClass,
      content: <span className="font-black font-serif">N</span>,
    }
  }

  if (lower.includes("anthropic")) {
    return {
      bg: "bg-[#F3EBE1] text-[#1E1E1E] border-transparent shadow-xs",
      sizeClass,
      content: <span className="font-black tracking-tight font-mono">AI</span>,
    }
  }

  if (lower.includes("figma")) {
    return {
      bg: "bg-black text-white border-transparent shadow-xs",
      sizeClass,
      content: (
        <span className="font-black flex items-center gap-0.5">
          <span className="text-[#F24E1E]">●</span><span className="text-[#A259FF]">●</span>
        </span>
      ),
    }
  }

  // Consistent pleasant brand aesthetic
  const palettes = [
    "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-200/70 dark:border-indigo-800/40",
    "bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-400 border-sky-200/70 dark:border-sky-800/40",
    "bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400 border-violet-200/70 dark:border-violet-800/40",
    "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200/70 dark:border-emerald-800/40",
    "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200/70 dark:border-amber-800/40",
    "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200/70 dark:border-rose-800/40",
  ]
  let hash = 0
  for (let i = 0; i < company.length; i++) hash = company.charCodeAt(i) + ((hash << 5) - hash)
  const colorClass = palettes[Math.abs(hash) % palettes.length]
  return {
    bg: colorClass,
    sizeClass,
    content: <span className="font-bold">{company.slice(0, 1).toUpperCase()}</span>,
  }
}
