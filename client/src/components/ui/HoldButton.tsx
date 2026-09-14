import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type HoldButtonVariant = "primary" | "secondary" | "danger";

type HoldButtonProps = {
	children: ReactNode;
	onComplete: () => void | Promise<void>;
	disabled?: boolean;
	holdDuration?: number;
	variant?: HoldButtonVariant;
	className?: string;
};

const variantStyles: Record<HoldButtonVariant, { button: string; fill: string }> = {
	primary: { button: "bg-brand-red text-white shadow-sm hover:bg-brand-red-dark", fill: "bg-brand-red-dark" },
	secondary: { button: "border border-border bg-surface text-ink hover:bg-surface-sunken", fill: "bg-surface-sunken" },
	danger: { button: "border border-danger text-danger hover:bg-danger-tint", fill: "bg-danger-tint" },
};

/** A press-and-hold button that fills with progress before firing - used for destructive/high-consequence actions to avoid accidental taps. */
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

	// pointer events alone leave this unreachable by keyboard - Enter/Space fire keydown/keyup,
	// not pointerdown/pointerup, so a held key needs the same start/cancel treatment
	function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key !== "Enter" && event.key !== " ") return;
		event.preventDefault();
		startHold();
	}

	function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
		if (event.key !== "Enter" && event.key !== " ") return;
		cancelHold();
	}

	return (
		<button
			type="button"
			onPointerDown={startHold}
			onPointerUp={cancelHold}
			onPointerLeave={cancelHold}
			onPointerCancel={cancelHold}
			onKeyDown={handleKeyDown}
			onKeyUp={handleKeyUp}
			disabled={disabled}
			className={`relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-bold transition select-none active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${styles.button} ${className}`}
		>
			<div className={`pointer-events-none absolute inset-y-0 left-0 ${styles.fill}`} style={{ width: `${progress * 100}%` }} />
			<span className="relative z-10">{children}</span>
		</button>
	);
}
