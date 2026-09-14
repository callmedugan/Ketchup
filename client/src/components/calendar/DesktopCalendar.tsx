// DesktopCalendar.tsx

import { useState } from "react";
import { addDays, format, getDay, isBefore, isSameDay, isSameWeek, startOfDay } from "date-fns";

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
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
			{showHeader()}

			{/* Weekday header */}
			<div className="grid shrink-0 grid-cols-7 border-b border-stone-200 bg-[#f3e4d7]">
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => {
					const isTodayColumn = isViewingCurrentWeek && index === todayColumnIndex;

					return (
						<div
							key={day}
							className={`
								border-r border-stone-200
								px-2 py-1.5 text-center
								text-[10px] font-bold uppercase
								tracking-[0.12em]
								last:border-r-0
								${isTodayColumn ? "bg-brand-red/10 text-brand-red" : `text-brand-muted ${index % 2 === 1 ? "bg-[#efe0d3]" : ""}`}
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
			<div className="flex h-14 shrink-0 items-center justify-center border-b border-brand-red-dark bg-linear-to-r from-brand-red-dark via-brand-red to-brand-red-dark px-4">
				<h2 className="text-xl font-bold tracking-tight text-brand-cream">{format(firstSaturday, "MMMM yyyy")}</h2>
			</div>
		);
	}

	/* ========================================================================= */
	//                        week
	/* ========================================================================= */

	function showWeek(weekStart: Date) {
		const schedules = getSchedulesForWeek(weekStart);

		const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

		return <div className="grid h-full min-h-0 grid-cols-7">{days.map((day, index) => showDay(day, index, schedules))}</div>;
	}

	/* ========================================================================= */
	//                        day
	/* ========================================================================= */

	function showDay(day: Date, columnIndex: number, schedules: ScheduleInstance[]) {
		const isToday = isSameDay(day, new Date());

		const isPast = isBefore(day, startOfDay(new Date()));

		const isAlternateColumn = columnIndex % 2 === 1;

		const dayKey = format(day, "yyyy-MM-dd");

		const daySchedules = schedules.filter((schedule) => format(schedule.start, "yyyy-MM-dd") === dayKey);

		const canAddAvailability = !isPast && daySchedules.length < 4;

		const background = isToday
			? "bg-[#fff4ec]"
			: isPast
				? isAlternateColumn
					? "bg-stone-300/80"
					: "bg-stone-200"
				: isAlternateColumn
					? "bg-[#faf7f2]"
					: "bg-brand-card";

		return (
			<div
				key={day.toISOString()}
				className={`
                    group/day relative min-h-0 min-w-0 overflow-hidden
                    border-b border-r border-stone-200
                    ${background}
                    ${isToday ? "ring-2 ring-inset ring-brand-red" : ""}
                `}
			>
				{/* Day number */}
				<div
					className={`
                        absolute left-2 top-3 z-10
                        flex h-6 w-6 items-center justify-center
                        rounded-full text-xs font-bold
                        ${isToday ? "bg-brand-red text-white shadow-sm" : isPast ? "text-brand-muted/55" : "text-brand-text"}
                    `}
				>
					{format(day, "d")}
				</div>

				{/* Today label */}
				{isToday && (
					<span className="absolute right-2 top-3.5 z-10 rounded-full bg-brand-red/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-brand-red">
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
								className="
                                    flex w-full shrink-0
                                    items-center justify-center
                                    rounded-lg border border-dashed
                                    border-stone-300
                                    bg-white/30
                                    px-2 py-1.5
                                    text-[10px] font-bold
                                    text-brand-muted/50
                                    opacity-0
                                    transition duration-150
                                    group-hover/day:opacity-100
                                    focus:opacity-100
                                    hover:border-brand-red-light
                                    hover:bg-brand-pink-light/60
                                    hover:text-brand-red
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
