"use client";

import { cn } from "@/lib/utils";

interface CompanyBrandLogoProps {
  company: string;
  className?: string;
  size?: number;
}

export function CompanyBrandLogo({
  company,
  className,
  size = 32,
}: CompanyBrandLogoProps) {
  const c = (company || "").toLowerCase().trim();

  if (c.includes("google")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-2xs shrink-0 overflow-hidden p-1.5",
          className
        )}
      >
        <svg viewBox="0 0 24 24" className="w-full h-full">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
      </div>
    );
  }

  if (c.includes("stripe")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-[#635BFF] text-white font-bold shrink-0 shadow-2xs",
          className
        )}
      >
        <span className="text-base font-black tracking-tighter">S</span>
      </div>
    );
  }

  if (c.includes("notion")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-black text-white font-serif font-black shrink-0 shadow-2xs",
          className
        )}
      >
        <span className="text-base">N</span>
      </div>
    );
  }

  if (c.includes("anthropic")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-[#cc785c] text-white font-bold shrink-0 shadow-2xs",
          className
        )}
      >
        <span className="text-sm font-black">A\</span>
      </div>
    );
  }

  if (c.includes("linear")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-[#5E6AD2] text-white font-bold shrink-0 shadow-2xs",
          className
        )}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
          <path d="M3.24 3.24a1 1 0 0 1 1.41 0l16.11 16.11a1 1 0 0 1-1.41 1.41L3.24 4.65a1 1 0 0 1 0-1.41Z" />
        </svg>
      </div>
    );
  }

  if (c.includes("figma")) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center rounded-xl bg-[#1E1E1E] shrink-0 shadow-2xs p-1.5",
          className
        )}
      >
        <svg viewBox="0 0 38 57" className="w-full h-full" fill="none">
          <path d="M19 28.5a9.5 9.5 0 1 1 19 0 9.5 9.5 0 0 1-19 0Z" fill="#1ABCFE" />
          <path d="M0 47.5A9.5 9.5 0 0 1 9.5 38H19v9.5a9.5 9.5 0 1 1-19 0Z" fill="#0ACF83" />
          <path d="M19 0v19h9.5a9.5 9.5 0 1 0 0-19H19Z" fill="#FF7262" />
          <path d="M0 9.5A9.5 9.5 0 0 0 9.5 19H19V0H9.5A9.5 9.5 0 0 0 0 9.5Z" fill="#F24E1E" />
          <path d="M0 28.5A9.5 9.5 0 0 0 9.5 38H19V19H9.5A9.5 9.5 0 0 0 0 28.5Z" fill="#A259FF" />
        </svg>
      </div>
    );
  }

  // Fallback with stable brand color based on company name
  const colors = [
    "bg-blue-600 text-white",
    "bg-indigo-600 text-white",
    "bg-emerald-600 text-white",
    "bg-violet-600 text-white",
    "bg-amber-600 text-white",
    "bg-rose-600 text-white",
    "bg-cyan-600 text-white",
    "bg-slate-800 text-white",
  ];
  let hash = 0;
  for (let i = 0; i < c.length; i++) {
    hash = (hash << 5) - hash + c.charCodeAt(i);
  }
  const colorClass = colors[Math.abs(hash) % colors.length];

  return (
    <div
      style={{ width: size, height: size }}
      className={cn(
        "flex items-center justify-center rounded-xl font-bold text-xs shrink-0 shadow-2xs font-mono select-none",
        colorClass,
        className
      )}
    >
      {(company || "CO").slice(0, 2).toUpperCase()}
    </div>
  );
}
