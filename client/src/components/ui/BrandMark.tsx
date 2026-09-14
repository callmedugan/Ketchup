type BrandMarkProps = {
	size?: number;
	className?: string;
};

/** The app's single-accent brand glyph - a rounded square with an offset dot, evoking a drop. */
export default function BrandMark({ size = 28, className = "" }: BrandMarkProps) {
	return (
		<svg width={size} height={size} viewBox="0 0 28 28" className={className} aria-hidden="true">
			<rect x="1" y="1" width="26" height="26" rx="8" fill="var(--color-accent)" />
			<circle cx="18.5" cy="9.5" r="3.5" fill="white" fillOpacity="0.9" />
		</svg>
	);
}
