// MobileCalendar.tsx

import { addDays, format, startOfWeek } from "date-fns";

import type { ScheduleInstance } from "./Instance";

import ScheduleCard from "./ScheduleCard";
import InfiniteWeekScrollMobile from "../common/InfiniteWeekScrollMobile";

type MobileCalendarProps = {
	initialWeek: Date;
	minWeek: Date;
	maxWeek: Date;

	getSchedulesForWeek: (weekStart: Date) => ScheduleInstance[];

	onAddAvailability: (date: Date) => void;
};

export default function MobileCalendar({ initialWeek, minWeek, maxWeek, getSchedulesForWeek, onAddAvailability }: MobileCalendarProps) {
	function getSchedulesForDay(day: Date, schedules: ScheduleInstance[]): ScheduleInstance[] {
		const key = format(day, "yyyy-MM-dd");

		return schedules.filter((schedule) => format(schedule.start, "yyyy-MM-dd") === key);
	}

	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-brand-page">
			<InfiniteWeekScrollMobile initialWeek={initialWeek} minWeek={minWeek} maxWeek={maxWeek} renderWeek={showWeek} />
		</div>
	);

	/* ========================================================================= */
	//                        week
	/* ========================================================================= */

	function showWeek(weekStart: Date) {
		const start = startOfWeek(weekStart, {
			weekStartsOn: 0,
		});

		const weekDays = Array.from({ length: 7 }, (_, index) => addDays(start, index));

		const schedules = getSchedulesForWeek(start);

		return (
			<section>
				<div className="flex flex-col gap-3">
					{weekDays.map((day) => (
						<div key={day.toISOString()}>
							{/* Month header */}
							{day.getDate() === 1 && (
								<div className="mb-3 overflow-hidden rounded-xl border border-brand-red-dark bg-brand-red">
									<p className="px-4 py-2.5 text-center text-sm font-bold text-brand-cream">{format(day, "MMMM")}</p>
								</div>
							)}

							{showDay(day, schedules)}
						</div>
					))}
				</div>
				{/* Week divider */}
				<div className="mx-auto my-2 h-1 w-full rounded-full bg-brand-red/25" />
			</section>
		);
	}

	/* ========================================================================= */
	//                        day
	/* ========================================================================= */

	function showDay(day: Date, schedules: ScheduleInstance[]) {
		const daySchedules = getSchedulesForDay(day, schedules);

		const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

		return (
			<div
				className={`
					overflow-hidden rounded-xl border
					bg-brand-card shadow-sm
					${isToday ? "border-brand-red/40" : "border-stone-200"}
				`}
			>
				{/* Day header */}
				<div
					className={`
						flex items-center justify-between
						border-b border-stone-200
						px-3 py-2
						${isToday ? "bg-[#f4ddd6]" : "bg-[#f3e4d7]"}
					`}
				>
					<div className="flex items-center gap-2.5">
						<div
							className={`
								flex h-8 w-8 shrink-0
								items-center justify-center
								rounded-full
								text-xs font-bold
								${isToday ? "bg-brand-red text-white" : "bg-white/60 text-brand-text"}
							`}
						>
							{format(day, "d")}
						</div>

						<div>
							<p className="text-sm font-bold leading-tight text-brand-text">{format(day, "EEEE")}</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						{isToday && <span className="rounded-full bg-brand-red/10 px-2 py-1 text-[9px] font-bold text-brand-red-dark">Today</span>}

						{daySchedules.length < 4 && (
							<button
								type="button"
								onClick={() => onAddAvailability(day)}
								className="
									flex h-8 w-8 items-center justify-center
									rounded-lg
									border border-stone-300
									bg-white/40
									text-base font-bold text-brand-muted
									transition
									active:scale-95 active:bg-white
								"
								aria-label={`Add availability for ${format(day, "MMMM d")}`}
							>
								+
							</button>
						)}
					</div>
				</div>

				{/* Schedules */}
				{daySchedules.length > 0 && (
					<div className="flex flex-col gap-2 p-3">
						{daySchedules.map((schedule) => (
							<ScheduleCard key={schedule.id} instance={schedule} />
						))}
					</div>
				)}
			</div>
		);
	}
}
