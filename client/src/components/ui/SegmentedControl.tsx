type SegmentedControlProps<T extends string> = {
	options: { value: T; label: string }[];
	value: T;
	onChange: (value: T) => void;
	className?: string;
};

export default function SegmentedControl<T extends string>({ options, value, onChange, className = "" }: SegmentedControlProps<T>) {
	return (
		<div className={`inline-flex shrink-0 gap-0.5 rounded-lg border border-border bg-surface-sunken p-0.5 ${className}`}>
			{options.map((option) => (
				<button
					key={option.value}
					type="button"
					onClick={() => onChange(option.value)}
					aria-pressed={value === option.value}
					className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${
						value === option.value ? "bg-accent text-white shadow-sm" : "text-ink-muted hover:text-ink"
					}`}
				>
					{option.label}
				</button>
			))}
		</div>
	);
}
