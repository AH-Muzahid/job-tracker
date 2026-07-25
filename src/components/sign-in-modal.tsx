"use client"

import { SignIn } from "@clerk/nextjs"
import {
	Dialog,
	DialogContent,
} from "@/components/ui/dialog"

interface SignInModalProps {
	open: boolean
	onOpenChange: (open: boolean) => void
}

export function SignInModal({ open, onOpenChange }: SignInModalProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="p-0 bg-transparent border-none shadow-none max-w-md w-full [&>button]:hidden">
				<SignIn
					routing="hash"
					forceRedirectUrl="/dashboard"
					appearance={{
						elements: {
							card: "bg-background border border-border shadow-lg rounded-xl",
						},
					}}
				/>
			</DialogContent>
		</Dialog>
	)
}
