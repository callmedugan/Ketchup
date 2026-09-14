import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "danger" | "neutral";

type BadgeProps = {
	tone?: BadgeTone;
	children: ReactNode;
	className?: string;
};

const toneStyles: Record<BadgeTone, string> = {
	success: "bg-success-tint text-success",
	warning: "bg-brand-mustard-tint text-brand-mustard-dark",
	danger: "bg-danger-tint text-danger",
	neutral: "bg-surface-sunken text-ink-muted",
};

export default function Badge({ tone = "neutral", children, className = "" }: BadgeProps) {
	return (
		<span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold whitespace-nowrap ${toneStyles[tone]} ${className}`}>
			{children}
		</span>
	);
}
