type LogoProps = { showTagLine: boolean; variant?: "light" | "dark"; size?: "default" | "nav" | "mobile" };

export default function Logo({ showTagLine, variant = "light", size = "default" }: LogoProps) {
	const isDark = variant === "dark";
	const isNav = size === "nav";
	const isMobile = size === "mobile";

	return (
		<div className={size === "default" ? "mb-10 text-center" : "text-center"}>
			<h1 className={`font-black tracking-tight ${isMobile ? "text-xl" : isNav ? "text-3xl" : "text-5xl"} ${isDark ? "text-brand-cream" : "text-brand-red"}`}>
				Ketchup
			</h1>

			{/* Brand accent */}
			<div
				className={`mx-auto rounded-full ${
					isMobile ? "mt-0.5 h-0.5 w-6" : isNav ? "mt-1 h-1 w-8" : "mt-2 h-1.5 w-10 -rotate-2"
				} ${isDark ? "bg-[#d86a5d]" : "bg-[#d9a441]"}`}
			/>

			{showTagLine && <p className={`mt-3 text-sm ${isDark ? "text-[#cbbdb3]" : "text-[#76675d]"}`}>The secret sauce to making plans</p>}
		</div>
	);
}
