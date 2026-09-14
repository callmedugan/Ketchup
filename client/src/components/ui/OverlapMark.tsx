type OverlapMarkProps = {
	size?: number;
	className?: string;
	/** gently drifts the two circles apart and back together, for loading states */
	animated?: boolean;
};

/**
 * The app's signature mark: two brand-colored circles ("you" in ketchup red,
 * a friend in mustard) blended with mix-blend-mode so the shared region
 * renders as a third, emergent "overlap" color - the same metaphor the
 * product itself is built around, rather than a decorative illustration.
 */
export default function OverlapMark({ size = 32, className = "", animated = false }: OverlapMarkProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 32 32" className={className} aria-hidden="true">
			<circle
				cx="12"
				cy="16"
				r="10"
				fill="var(--color-brand-red)"
				style={{ mixBlendMode: "multiply", transformOrigin: "12px 16px" }}
				className={animated ? "animate-overlap-drift" : ""}
			/>
			<circle
				cx="20"
				cy="16"
				r="10"
				fill="var(--color-brand-mustard)"
				style={{ mixBlendMode: "multiply", transformOrigin: "20px 16px", animationDirection: animated ? "reverse" : undefined }}
				className={animated ? "animate-overlap-drift" : ""}
			/>
		</svg>
	);
}
