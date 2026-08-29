import { format, isBefore, isSameDay, set, startOfDay } from "date-fns";
import { useState } from "react";
import OverlapModal from "./OverlapModal";
import { useSchedule } from "../../contexts/SchedulesContext";
import type { MatchedSchedule, Schedule } from "../../utils/types";

type StickyNoteProps = { scheduleData: Schedule; noteDate: Date; onDeleted: () => void };

export default function StickyNote({ scheduleData, noteDate, onDeleted }: StickyNoteProps) {
	const { matchedSchedules } = useSchedule();
	const [isOpen, setIsOpen] = useState(false);

	//create a date for the beginning and end
	const noteStartTime = set(noteDate, { hours: scheduleData.startTime.getHours(), minutes: scheduleData.startTime.getMinutes() });
	const noteEndTime = set(noteDate, { hours: scheduleData.endTime.getHours(), minutes: scheduleData.endTime.getMinutes() });
	const hasPassed = noteEndTime <= new Date();

	const { overlapsForThisDay, overlapCount } = getValidAndSortedOverlaps(matchedSchedules, scheduleData, noteDate);

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
				<div className="absolute left-2.5 right-2.5 top-3.5 flex flex-col gap-1 md:left-3 md:right-3">
					<div className="flex items-baseline justify-between gap-2">
						<span className="text-[7px] font-bold uppercase tracking-wide text-[#8a763d] md:text-[9px]">Start</span>

						<span className="text-[10px] font-bold text-[#66531c] md:text-xs">{format(scheduleData.startTime, "p")}</span>
					</div>

					<div className="flex items-baseline justify-between gap-2">
						<span className="text-[7px] font-bold uppercase tracking-wide text-[#8a763d] md:text-[9px]">End</span>

						<span className="text-[10px] font-bold text-[#66531c] md:text-xs">{format(scheduleData.endTime, "p")}</span>
					</div>
				</div>

				{/* friends free */}
				{overlapCount > 0 && !hasPassed && (
					<div className="absolute inset-x-1.5 bottom-1.5 animate-float-notification truncate rounded-full border border-[#e0c96f] bg-white/70 px-1.5 py-1 text-center text-[9px] font-semibold text-[#66531c] md:inset-x-2 md:bottom-2 md:px-2 md:text-xs">
						{overlapCount} friend{overlapCount > 1 && "s"} free!
					</div>
				)}
			</button>
			{/* overlap modal */}
			{isOpen && (
				<OverlapModal
					noteSchedule={scheduleData}
					hasPassed={hasPassed}
					noteStartTime={noteStartTime}
					noteEndTime={noteEndTime}
					noteOverlaps={overlapsForThisDay}
					onClose={() => setIsOpen(false)}
					onDeleted={onDeleted}
				/>
			)}
		</>
	);
}

function getValidAndSortedOverlaps(matchedSchedules: MatchedSchedule[], scheduleData: Schedule, noteDate: Date) {
	// get number of unique users and overlaps for the day
	const preSortedOverlaps = [];
	const users = new Set();
	for (const s of matchedSchedules) {
		//only check matching ids
		if (!s.schedules.includes(scheduleData.id)) continue;

		// Note date cannot be before the match starts
		if (isBefore(startOfDay(noteDate), startOfDay(s.startTime))) continue;

		// Daily = every day after start
		// Once = exact date only
		// Weekly = matching weekday after start
		if (
			s.repeatType === "daily" ||
			(s.repeatType === "once" && isSameDay(s.startTime, noteDate)) ||
			(s.repeatType === "weekly" && s.startTime.getDay() === noteDate.getDay())
		) {
			preSortedOverlaps.push(s);
			users.add(s.userId);
		}
	}
	//finally
	return {
		overlapsForThisDay: preSortedOverlaps.sort((a, b) => a.startTime.getTime() - a.endTime.getTime() - (b.startTime.getTime() - b.endTime.getTime())),
		overlapCount: users.size,
	};
}
