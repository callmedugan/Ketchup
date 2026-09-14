// ScheduleCard.tsx

import { format } from "date-fns";
import { useState } from "react";

import type { ScheduleInstance } from "./Instance";

import ScheduleDetailModal from "./ScheduleDetailModal";
import { AvatarStack } from "../ui/Avatar";

type ScheduleCardProps = {
	instance: ScheduleInstance;
};

export default function ScheduleCard({ instance }: ScheduleCardProps) {
	const [isOpen, setIsOpen] = useState(false);

	const hasPassed = instance.end <= new Date();

	// unique friends overlapping this instance, most recent first occurrence wins
	const overlapFriends = [...new Map(instance.overlaps.map((overlap) => [overlap.user.id, overlap.user])).values()];

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				style={getScheduleColorVars(instance.scheduleId)}
				className={`
					interactive-card
					relative w-full md:w-auto min-w-0 overflow-hidden
					rounded-lg border px-2 py-1.5 text-left
					cursor-pointer
					hover:brightness-110
					border-(--schedule-border) bg-(--schedule-bg) text-(--schedule-text)
					${hasPassed ? "opacity-50" : "opacity-100"}
				`}
			>
				{/* Corner */}
				<div className="pointer-events-none absolute right-0 top-0 h-3 w-3 bg-current opacity-10 [clip-path:polygon(0_0,100%_0,100%_100%)]" />

				{/* Plan indicator */}
				{instance.plan && (
					<span
						className={`absolute -right-1 -top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 border-surface text-white shadow-sm ${
							instance.plan.status === "confirmed" ? "bg-success" : "bg-warning"
						}`}
						title={`${instance.plan.status === "confirmed" ? "Confirmed plan" : "Pending plan"}: ${instance.plan.title}`}
					>
						<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5">
							<path d="M5 10l3.5 3.5L15 6.5" />
						</svg>
					</span>
				)}

				{/* Overlap indicator */}
				{overlapFriends.length > 0 && !hasPassed && !instance.plan && (
					<span className="absolute -left-1 -top-1 z-10 h-2.5 w-2.5 rounded-full border-2 border-surface bg-accent shadow-sm" title="Friends free during this time" />
				)}

				{/* Time */}
				<div className="flex min-w-0 items-center justify-between gap-1.5">
					<span className="truncate text-[9px] font-bold lg:text-[10px]">
						{format(instance.start, "p")} – {format(instance.end, "p")}
					</span>

					{overlapFriends.length > 0 && !hasPassed && <AvatarStack people={overlapFriends} />}
				</div>
			</button>

			{isOpen && <ScheduleDetailModal instance={instance} onClose={() => setIsOpen(false)} />}
		</>
	);

	/* ========================================================================= */
	//                        schedule color
	/* ========================================================================= */

	function getScheduleColorVars(id: string): Record<string, string> {
		const categories = 5;

		let hash = 0;

		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}

		const category = (Math.abs(hash) % categories) + 1;

		return {
			"--schedule-bg": `var(--color-cat-${category}-bg)`,
			"--schedule-border": `var(--color-cat-${category}-border)`,
			"--schedule-text": `var(--color-cat-${category}-text)`,
		} as Record<string, string>;
	}
}
