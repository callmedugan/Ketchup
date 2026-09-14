type LogoProps = { showTagLine: boolean; size?: "default" | "nav" | "mobile" };

const textSizes: Record<NonNullable<LogoProps["size"]>, string> = { default: "text-5xl", nav: "text-2xl", mobile: "text-lg" };

export default function Logo({ showTagLine, size = "default" }: LogoProps) {
	return (
		<div className={size === "default" ? "mb-10 text-center" : "text-center"}>
			<h1 className={`font-extrabold tracking-tight ${textSizes[size]} text-ink`}>
				<span className="text-accent">K</span>etchup
			</h1>

			{showTagLine && <p className="mt-3 text-sm text-ink-muted">The secret sauce to making plans</p>}
		</div>
	);
}
