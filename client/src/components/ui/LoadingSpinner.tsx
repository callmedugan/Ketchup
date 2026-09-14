type LoadingSpinnerProps = {
	label?: string;
	size?: number;
	className?: string;
};

export default function LoadingSpinner({ label, size = 32, className = "" }: LoadingSpinnerProps) {
	return (
		<div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
			<div
				className="animate-spin-smooth shrink-0 rounded-full border-[3px] border-border border-t-accent"
				style={{ width: size, height: size }}
				role="status"
				aria-label={label ?? "Loading"}
			/>
			{label && <p className="text-sm font-medium text-ink-muted">{label}</p>}
		</div>
	);
}
