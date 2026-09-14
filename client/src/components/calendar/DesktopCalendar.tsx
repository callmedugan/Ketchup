// DesktopCalendar.tsx

import { useState } from "react";
import { addDays, format, getDay, isBefore, isSameDay, isSameWeek, startOfDay } from "date-fns";
import { MAX_SCHEDULES_PER_DAY } from "@ketchup/shared";

import type { ScheduleInstance } from "./Instance";

import InfiniteWeekScroll from "../common/InfiniteWeekScroll";
import ScheduleCard from "./ScheduleCard";

type DesktopCalendarProps = {
	currentWeek: Date;
	minWeek: Date;
	maxWeek: Date;
	getSchedulesForWeek: (weekStart: Date) => ScheduleInstance[];
	onAddAvailability?: (day: Date) => void;
};

export default function DesktopCalendar({ currentWeek, minWeek, maxWeek, getSchedulesForWeek, onAddAvailability }: DesktopCalendarProps) {
	const [topWeek, setTopWeek] = useState(currentWeek);

	// true while the currently scrolled-to week is the real-world current week,
	// used to pin the "today" accent onto the matching weekday header column
	const isViewingCurrentWeek = isSameWeek(topWeek, new Date(), { weekStartsOn: 0 });
	const todayColumnIndex = getDay(new Date());

	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
			{showHeader()}

			{/* Weekday header */}
			<div className="grid shrink-0 grid-cols-7 border-b border-border bg-surface-sunken">
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
					const isTodayColumn = isViewingCurrentWeek && index === todayColumnIndex;

					return (
						<div
							key={day}
							className={`
								border-r border-border last:border-r-0
								px-2 py-1.5 text-center
								text-[10px] font-bold uppercase
								tracking-[0.12em]
								${isTodayColumn ? "bg-accent/10 text-accent" : "text-ink-muted"}
							`}
						>
							{day}
						</div>
					);
				})}
			</div>

			<InfiniteWeekScroll
				initialWeek={currentWeek}
				minWeek={minWeek}
				maxWeek={maxWeek}
				weeksVisible={3}
				chunkSize={3}
				onTopWeekChange={setTopWeek}
				renderWeek={showWeek}
			/>
		</div>
	);

	/* ========================================================================= */
	//                        header
	/* ========================================================================= */

	function showHeader() {
		const firstSaturday = addDays(topWeek, 6);

		return (
			<div className="flex h-14 shrink-0 items-center justify-center border-b border-border bg-surface px-4">
				<h2 className="text-xl font-extrabold tracking-tight text-ink">{format(firstSaturday, "MMMM yyyy")}</h2>
			</div>
		);
	}

	/* ========================================================================= */
	//                        week
	/* ========================================================================= */

	function showWeek(weekStart: Date) {
		const schedules = getSchedulesForWeek(weekStart);

		const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

		return <div className="grid h-full min-h-0 grid-cols-7">{days.map((day) => showDay(day, schedules))}</div>;
	}

	/* ========================================================================= */
	//                        day
	/* ========================================================================= */

	function showDay(day: Date, schedules: ScheduleInstance[]) {
		const isToday = isSameDay(day, new Date());

		const isPast = isBefore(day, startOfDay(new Date()));

		const dayKey = format(day, "yyyy-MM-dd");

		const daySchedules = schedules.filter((schedule) => format(schedule.start, "yyyy-MM-dd") === dayKey);

		const canAddAvailability = !isPast && daySchedules.length < MAX_SCHEDULES_PER_DAY;

		const background = isToday ? "bg-accent-tint/30" : isPast ? "bg-surface-sunken/70" : "bg-surface";

		return (
			<div
				key={day.toISOString()}
				className={`
                    group/day relative min-h-0 min-w-0 overflow-hidden
                    border-b border-r border-border last:border-r-0
                    ${background}
                    ${isToday ? "ring-2 ring-inset ring-accent" : ""}
                `}
			>
				{/* Day number */}
				<div
					className={`
                        absolute left-2 top-3 z-10
                        flex h-6 w-6 items-center justify-center
                        rounded-full text-xs font-bold
                        ${isToday ? "bg-accent text-white shadow-sm" : isPast ? "text-ink-faint" : "text-ink"}
                    `}
				>
					{format(day, "d")}
				</div>

				{/* Today label */}
				{isToday && (
					<span className="absolute right-2 top-3.5 z-10 rounded-full bg-accent/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-accent">
						Today
					</span>
				)}

				{/* Schedules */}
				<div className={`flex h-full min-h-0 flex-col px-2 pb-2 ${isToday ? "pt-11" : "pt-9"}`}>
					<div className="flex min-h-0 flex-col gap-1.5 overflow-visible">
						{daySchedules.map((schedule) => (
							<ScheduleCard key={`${schedule.scheduleId}:${schedule.start.toISOString()}`} instance={schedule} />
						))}

						{/* Add availability */}
						{canAddAvailability && (
							<button
								type="button"
								onClick={() => onAddAvailability?.(day)}
								aria-label={`Add availability for ${format(day, "MMMM d")}`}
								className="
                                    flex w-full shrink-0
                                    items-center justify-center
                                    rounded-lg border border-dashed
                                    border-border
                                    bg-surface/50
                                    px-2 py-1.5
                                    text-[10px] font-bold
                                    text-ink-muted/50
                                    opacity-0
                                    transition duration-150
                                    group-hover/day:opacity-100
                                    focus:opacity-100
                                    hover:border-accent-light
                                    hover:bg-accent-tint/60
                                    hover:text-accent
                                    active:scale-[0.99]
                                "
							>
								+
							</button>
						)}
					</div>
				</div>
			</div>
		);
	}
}
