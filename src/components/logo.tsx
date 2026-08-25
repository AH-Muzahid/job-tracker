import type React from "react";
import { Briefcase } from "lucide-react";

export const LogoIcon = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div
		className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs shadow-2xs ${className || ""}`}
		{...props}
	>
		<Briefcase className="size-3.5" />
	</div>
);

export const Logo = ({ className, ...props }: React.ComponentProps<"div">) => (
	<div className={`flex items-center gap-2.5 shrink-0 ${className || ""}`} {...props}>
		<LogoIcon />
		<span className="font-bold text-base tracking-tight text-foreground select-none">
			CareerTrack
		</span>
	</div>
);
