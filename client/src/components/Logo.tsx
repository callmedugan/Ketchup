import BrandMark from "./ui/BrandMark";

type LogoProps = { showTagLine: boolean; size?: "default" | "nav" | "mobile" };

const markSizes: Record<NonNullable<LogoProps["size"]>, number> = { default: 40, nav: 28, mobile: 22 };
const textSizes: Record<NonNullable<LogoProps["size"]>, string> = { default: "text-5xl", nav: "text-2xl", mobile: "text-lg" };

export default function Logo({ showTagLine, size = "default" }: LogoProps) {
	return (
		<div className={size === "default" ? "mb-10 text-center" : "text-center"}>
			<div className="inline-flex items-center gap-2.5">
				<BrandMark size={markSizes[size]} />

				<h1 className={`font-extrabold tracking-tight ${textSizes[size]} text-ink`}>Ketchup</h1>
			</div>

			{showTagLine && <p className="mt-3 text-sm text-ink-muted">The secret sauce to making plans</p>}
		</div>
	);
}
