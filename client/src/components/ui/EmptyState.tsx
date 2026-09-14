import type { ReactNode } from "react";

type EmptyStateProps = {
	title: string;
	description?: string;
	action?: ReactNode;
	className?: string;
};

export default function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
	return (
		<div className={`rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center ${className}`}>
			<h3 className="font-bold text-ink">{title}</h3>

			{description && <p className="mx-auto mt-1 max-w-sm text-sm font-medium text-ink-muted">{description}</p>}

			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
