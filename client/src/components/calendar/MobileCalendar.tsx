// MobileCalendar.tsx

import { useMemo } from "react";
import { format, isSameMonth } from "date-fns";

import type { ScheduleInstance } from "./Instance";

import StickyNote from "./StickyNote";
import ScrollableContainer from "../common/ScrollableContainer";

type MobileCalendarProps = {
	weekDays: Date[];
	schedules: ScheduleInstance[];
	weekOffset: number;
	setWeekOffset: React.Dispatch<React.SetStateAction<number>>;
};

export default function MobileCalendar({ weekDays, schedules, weekOffset, setWeekOffset }: MobileCalendarProps) {
	const schedulesByDay = useMemo(() => {
		const map = new Map<string, ScheduleInstance[]>();

		for (const schedule of schedules) {
			const key = format(schedule.start, "yyyy-MM-dd");

			const daySchedules = map.get(key) ?? [];

			daySchedules.push(schedule);
			map.set(key, daySchedules);
		}

		return map;
	}, [schedules]);

	function getSchedulesForDay(day: Date): ScheduleInstance[] {
		const key = format(day, "yyyy-MM-dd");

		return schedulesByDay.get(key) ?? [];
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
			{showHeader()}

			<ScrollableContainer className="py-2">{weekDays.map(showDay)}</ScrollableContainer>
		</div>
	);

	/* ========================================================================= */
	//                        header
	/* ========================================================================= */

	function showHeader() {
		const weekStart = weekDays[0];
		const weekEnd = weekDays[weekDays.length - 1];

		if (!weekStart || !weekEnd) return null;

		const dateRange = isSameMonth(weekStart, weekEnd)
			? `${format(weekStart, "MMM d")} - ${format(weekEnd, "d, yyyy")}`
			: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;

		return (
			<div className="flex shrink-0 items-center justify-between border-b border-brand-red-dark bg-brand-red px-3 py-3">
				<button
					type="button"
					onClick={() => setWeekOffset((prev) => prev - 1)}
					className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 pb-1 text-brand-cream transition active:scale-95 active:bg-white/20"
				>
					‹
				</button>

				<div className="text-center">
					<h2 className="text-base font-bold text-brand-cream">{dateRange}</h2>

					<button
						type="button"
						onClick={() => setWeekOffset(0)}
						disabled={weekOffset === 0}
						className="mt-1 rounded-full border border-brand-cream/30 bg-white/10 px-2.5 py-0.5 text-[10px] font-bold text-brand-cream transition active:scale-95 active:bg-white/20 disabled:border-brand-cream/10 disabled:bg-transparent disabled:text-brand-cream/40"
					>
						This week
					</button>
				</div>

				<button
					type="button"
					onClick={() => setWeekOffset((prev) => prev + 1)}
					className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 pb-1 text-brand-cream transition active:scale-95 active:bg-white/20"
				>
					›
				</button>
			</div>
		);
	}

	/* ========================================================================= */
	//                        day
	/* ========================================================================= */

	function showDay(day: Date) {
		const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

		const daySchedules = getSchedulesForDay(day);

		const hasSchedules = daySchedules.length > 0;

		return (
			<div
				key={day.toISOString()}
				className={`mx-3 my-2 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-brand-card shadow-sm ${
					hasSchedules ? "h-40" : "h-auto"
				}`}
			>
				<div className={`flex items-center justify-between bg-[#f3e4d7] px-4 py-2 ${hasSchedules ? "border-b border-stone-200" : ""}`}>
					<div className="flex items-baseline gap-2">
						<span className="text-sm font-bold text-brand-text">{format(day, "EEE")}</span>

						<span className="text-xs font-medium text-brand-muted">{format(day, "MMM d")}</span>
					</div>

					{isToday && <span className="rounded-full bg-brand-red px-2 py-1 text-[10px] font-bold text-white">Today</span>}
				</div>

				{hasSchedules && (
					<ScrollableContainer direction="horizontal">
						<div className="flex h-full gap-2.5 p-3">
							{daySchedules.map((schedule) => (
								<StickyNote key={schedule.id} instance={schedule} />
							))}
						</div>
					</ScrollableContainer>
				)}
			</div>
		);
	}
}
