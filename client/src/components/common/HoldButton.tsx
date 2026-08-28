import { useRef, useState, type ReactNode } from "react";

type HoldButtonVariant = "primary" | "secondary" | "danger";

type HoldButtonProps = {
	children: ReactNode;
	onComplete: () => void | Promise<void>;
	disabled?: boolean;
	holdDuration?: number;
	variant?: HoldButtonVariant;
	className?: string;
};

const variantStyles = {
	primary: { button: "btn-primary", fill: "bg-[#7f2f29]" },
	secondary: { button: "btn-secondary", fill: "bg-[#eee5d7]" },
	danger: { button: "btn-danger", fill: "bg-[#f3d6d1]" },
};

export default function HoldButton({ children, onComplete, disabled = false, holdDuration = 1200, variant = "primary", className = "" }: HoldButtonProps) {
	const [progress, setProgress] = useState(0);

	const timerRef = useRef<number | null>(null);
	const intervalRef = useRef<number | null>(null);

	const styles = variantStyles[variant];

	function clearHold() {
		if (timerRef.current !== null) {
			window.clearTimeout(timerRef.current);
			timerRef.current = null;
		}

		if (intervalRef.current !== null) {
			window.clearInterval(intervalRef.current);
			intervalRef.current = null;
		}

		setProgress(0);
	}

	function startHold() {
		if (disabled || timerRef.current !== null) return;

		const startedAt = Date.now();

		intervalRef.current = window.setInterval(() => {
			const elapsed = Date.now() - startedAt;
			setProgress(Math.min(elapsed / holdDuration, 1));
		}, 20);

		timerRef.current = window.setTimeout(() => {
			clearHold();
			void onComplete();
		}, holdDuration);
	}

	function cancelHold() {
		clearHold();
	}

	return (
		<button
			type="button"
			onPointerDown={startHold}
			onPointerUp={cancelHold}
			onPointerLeave={cancelHold}
			onPointerCancel={cancelHold}
			disabled={disabled}
			className={`relative overflow-hidden select-none ${styles.button} ${className}`}
		>
			{/* Hold progress */}
			<div className={`pointer-events-none absolute inset-y-0 left-0 ${styles.fill}`} style={{ width: `${progress * 100}%` }} />

			{/* Content */}
			<span className="relative z-10">{children}</span>
		</button>
	);
}
