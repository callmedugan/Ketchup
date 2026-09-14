// ScheduleCard.tsx

import { format } from "date-fns";
import { useState } from "react";

import type { ScheduleInstance } from "./Instance";

import OverlapModal from "./OverlapModal";
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
				className={`
					interactive-card
					relative w-full md:w-auto min-w-0 overflow-hidden
					rounded-lg border px-2 py-1.5 text-left
					cursor-pointer
					hover:brightness-[1.02]
					${getScheduleColor(instance.scheduleId)}
					${hasPassed ? "opacity-50" : "opacity-100"}
				`}
			>
				{/* Corner */}
				<div className="pointer-events-none absolute right-0 top-0 h-3 w-3 bg-current opacity-10 [clip-path:polygon(0_0,100%_0,100%_100%)]" />

				{/* Time */}
				<div className="flex min-w-0 items-center justify-between gap-1.5">
					<span className="truncate text-[9px] font-bold lg:text-[10px]">
						{format(instance.start, "p")} – {format(instance.end, "p")}
					</span>

					{overlapFriends.length > 0 && !hasPassed && <AvatarStack people={overlapFriends} />}
				</div>
			</button>

			{isOpen && <OverlapModal instance={instance} onClose={() => setIsOpen(false)} />}
		</>
	);

	/* ========================================================================= */
	//                        schedule color
	/* ========================================================================= */

	function getScheduleColor(id: string): string {
		const colors = [
			"border-[#e3c66f] bg-[#fff3bd] text-[#66531c]",
			"border-[#e8b9a9] bg-[#f9ddd2] text-[#703d35]",
			"border-[#a9cfbf] bg-[#dceee6] text-[#36594d]",
			"border-[#b9c8e4] bg-[#e2e9f5] text-[#40506b]",
			"border-[#d4b9df] bg-[#eee0f2] text-[#60466a]",
		];

		let hash = 0;

		for (let i = 0; i < id.length; i++) {
			hash = id.charCodeAt(i) + ((hash << 5) - hash);
		}

		return colors[Math.abs(hash) % colors.length] ?? colors[0]!;
	}
}
