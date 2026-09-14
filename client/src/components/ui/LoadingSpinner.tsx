import OverlapMark from "./OverlapMark";

type LoadingSpinnerProps = {
	label?: string;
	size?: number;
	className?: string;
};

export default function LoadingSpinner({ label, size = 40, className = "" }: LoadingSpinnerProps) {
	return (
		<div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
			<OverlapMark size={size} animated />
			{label && <p className="text-sm font-medium text-ink-muted">{label}</p>}
		</div>
	);
}
