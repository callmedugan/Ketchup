import { format } from "date-fns";
import { useState } from "react";
import type { ScheduleInstance } from "../../utils/types";
import OverlapModal from "./OverlapModal";

type StickyNoteProps = {
	instance: ScheduleInstance;
	onDeleted: () => void;
};

export default function StickyNote({ instance, onDeleted }: StickyNoteProps) {
	const [isOpen, setIsOpen] = useState(false);

	const hasPassed = instance.end <= new Date();

	const overlaps = [...instance.overlaps].sort((a, b) => a.start.getTime() - b.start.getTime());

	const overlapCount = new Set(instance.overlaps.map((overlap) => overlap.user.id)).size;

	return (
		<>
			<button
				type="button"
				onClick={() => setIsOpen(true)}
				className={`
					relative h-24 w-28 shrink-0 -rotate-1 overflow-hidden
					rounded-sm border border-[#e7d49b] bg-[linear-gradient(145deg,#fff7cb_0%,#fff3bd_65%,#f7e7a5_100%)]
					px-2.5 py-2 text-left
					shadow-[1px_5px_7px_rgba(70,45,20,0.20)]
					transition duration-150
					hover:-translate-y-0.5 hover:rotate-0
					hover:shadow-[3px_5px_8px_rgba(0,0,0,0.15)]
					md:h-auto md:min-h-25 md:w-auto md:min-w-0 md:max-w-full
					md:px-3 md:py-2.5
					${hasPassed ? "opacity-50" : "opacity-100"}
				`}
			>
				{/* adhesive */}
				<div className="pointer-events-none absolute inset-x-0 top-0 h-4 bg-[#e9d783]/25" />

				{/* corner */}
				<div className="absolute right-0 top-0 h-4 w-4 bg-[#e8c95b] [clip-path:polygon(0_0,100%_0,100%_100%)]" />

				{/* Time */}
				<div className="absolute left-2.5 right-2.5 top-4 flex flex-col gap-1 md:left-3 md:right-3">
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-[7px] font-bold uppercase tracking-wide text-[#8a763d] md:text-[9px]">Start</span>

						<span className="text-[10px] font-bold text-[#66531c] md:text-xs">{format(instance.start, "p")}</span>
					</div>

					<div className="flex items-baseline justify-between gap-2">
						<span className="text-[7px] font-bold uppercase tracking-wide text-[#8a763d] md:text-[9px]">End</span>

						<span className="text-[10px] font-bold text-[#66531c] md:text-xs">{format(instance.end, "p")}</span>
					</div>
				</div>

				{/* friends free */}
				{overlapCount > 0 && !hasPassed && (
					<div className="absolute inset-x-1.5 bottom-1.5 animate-float-notification truncate rounded-full border border-[#e0c96f] bg-white/70 px-1.5 py-1 text-center text-[9px] font-semibold text-[#66531c] md:inset-x-2 md:bottom-2 md:px-2 md:text-xs">
						{overlapCount} friend{overlapCount > 1 && "s"} free!
					</div>
				)}
			</button>

			{isOpen && (
				<OverlapModal
					id={instance.scheduleId}
					hasPassed={hasPassed}
					start={instance.start}
					end={instance.end}
					noteOverlaps={overlaps}
					onClose={() => setIsOpen(false)}
					onDeleted={onDeleted}
				/>
			)}
		</>
	);
}
