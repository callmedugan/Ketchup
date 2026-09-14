import OverlapMark from "./ui/OverlapMark";

type LogoProps = { showTagLine: boolean; variant?: "light" | "dark"; size?: "default" | "nav" | "mobile" };

const markSizes: Record<NonNullable<LogoProps["size"]>, number> = { default: 40, nav: 28, mobile: 22 };
const textSizes: Record<NonNullable<LogoProps["size"]>, string> = { default: "text-5xl", nav: "text-2xl", mobile: "text-lg" };

export default function Logo({ showTagLine, variant = "light", size = "default" }: LogoProps) {
	const isDark = variant === "dark";

	return (
		<div className={size === "default" ? "mb-10 text-center" : "text-center"}>
			<div className="inline-flex items-center gap-2.5">
				<OverlapMark size={markSizes[size]} />

				<h1 className={`font-display font-semibold tracking-tight ${textSizes[size]} ${isDark ? "text-brand-cream" : "text-ink"}`}>Ketchup</h1>
			</div>

			{showTagLine && <p className={`mt-3 text-sm ${isDark ? "text-[#cbbdb3]" : "text-ink-muted"}`}>The secret sauce to making plans</p>}
		</div>
	);
}
