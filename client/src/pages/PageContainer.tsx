import type { ReactNode } from "react";
import NavBar from "../components/NavBar";

type PageContainerProps = {
	children: ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-brand-cork bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0_1px,transparent_1px),radial-gradient(circle_at_80%_70%,rgba(80,40,20,0.12)_0_1px,transparent_1px)] bg-size-[11px_11px,17px_17px] md:flex-row">
			<NavBar />

			<main className="relative m-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-300/70 bg-brand-page shadow-[0_10px_30px_rgba(60,30,15,0.18)] sm:m-3 md:m-5 md:rounded-3xl lg:m-7">
				<PushPin className="left-2.5 top-2.5 sm:left-5 sm:top-5" />
				<PushPin className="right-2.5 top-2.5 sm:right-5 sm:top-5" />

				{/* Page content */}
				<div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-5 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-7">{children}</div>
			</main>
		</div>
	);
}

function PushPin({ className }: { className: string }) {
	return (
		<div
			className={`absolute z-20 h-2.5 w-2.5 rounded-full border border-brand-red-dark bg-[#a63c32] shadow-[0_2px_3px_rgba(60,30,15,0.35)] sm:h-3.5 sm:w-3.5 ${className}`}
		>
			<div className="absolute left-0.5 top-0.5 h-1 w-1 rounded-full bg-white/30 sm:h-1.5 sm:w-1.5" />
		</div>
	);
}
