import { addDays, format, startOfDay, startOfWeek } from "date-fns";

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
			<InfiniteWeekScrollMobile
				initialWeek={initialWeek}
				initialDate={new Date()}
				minWeek={minWeek}
				maxWeek={maxWeek}
				renderWeek={showWeek}
				stickyHeader={(firstVisibleDate) => (
					<div
						className="
							rounded-xl
							border border-brand-red-dark/40
							bg-brand-red
							px-4 py-2.5
							shadow-sm
						"
					>
						<p className="text-center text-sm font-bold text-brand-cream">{format(firstVisibleDate, "MMMM yyyy")}</p>
					</div>
				)}
			/>
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
						<div key={day.toISOString()} data-calendar-day={startOfDay(day).getTime()}>
							{showDay(day, schedules, start)}
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

	function showDay(day: Date, schedules: ScheduleInstance[], weekStart: Date) {
		const daySchedules = getSchedulesForDay(day, schedules);

		const today = startOfDay(new Date());
		const currentDay = startOfDay(day);

		const isToday = format(day, "yyyy-MM-dd") === format(today, "yyyy-MM-dd");

		const isPast = currentDay < today;
		const isEmpty = daySchedules.length === 0;

		const weekNumber = Math.floor(weekStart.getTime() / (7 * 24 * 60 * 60 * 1000));

		const isAlternateWeek = weekNumber % 2 !== 0;

		/* ========================================================================= */
		//                        styles
		/* ========================================================================= */
		const headerBackground = isPast ? "bg-stone-300" : isAlternateWeek ? "bg-brand-pink" : "bg-[#eadcca]";
		const cardBackground = isPast ? "bg-stone-100" : isEmpty ? headerBackground : "bg-brand-card";

		const borderColor = isToday
			? "border-brand-red"
			: isPast
				? "border-stone-300"
				: isAlternateWeek
					? "border-brand-red/50"
					: "border-brand-red-dark/35";

		const headerBorder = isEmpty
			? "border-b-0"
			: isPast
				? "border-b border-stone-300"
				: isAlternateWeek
					? "border-b border-brand-red/45"
					: "border-b border-brand-red-dark/30";

		const dayTextColor = isPast ? "text-stone-500" : "text-brand-text";

		const dateCircleStyle = isToday
			? "bg-brand-red text-white"
			: isPast
				? "bg-stone-200 text-stone-500"
				: isAlternateWeek
					? "bg-white/70 text-brand-red-dark"
					: "bg-brand-card text-brand-red-dark";

		const addButtonStyle = isAlternateWeek
			? "border-brand-red/35 bg-white/50 text-brand-red-dark hover:bg-white/80 active:bg-white"
			: "border-brand-red-dark/30 bg-brand-card/60 text-brand-red-dark hover:bg-brand-card active:bg-white";

		const todayBadgeStyle = "bg-brand-red/10 text-brand-red-dark ring-1 ring-brand-red/20";

		const scheduleContainerStyle = "flex flex-col gap-2 p-3";
		/* ========================================================================= */
		//                        page
		/* ========================================================================= */

		return (
			<div
				className={`
				overflow-hidden rounded-xl border
				${cardBackground}
				${borderColor}
				shadow-sm
			`}
			>
				{/* Day header */}
				<div
					className={`
					flex items-center justify-between
					px-3 py-2
					${headerBackground}
					${headerBorder}
				`}
				>
					<div className="flex items-center gap-2.5">
						<div
							className={`
							flex h-8 w-8 shrink-0
							items-center justify-center
							rounded-full
							text-xs font-bold
							${dateCircleStyle}
						`}
						>
							{format(day, "d")}
						</div>

						<p
							className={`
							text-sm font-bold leading-tight
							${dayTextColor}
						`}
						>
							{format(day, "EEEE")}
						</p>
					</div>

					<div className="flex items-center gap-2">
						{isToday && (
							<span
								className={`
								rounded-full px-2 py-1
								text-[9px] font-bold
								${todayBadgeStyle}
							`}
							>
								Today
							</span>
						)}

						{!isPast && daySchedules.length < 4 && (
							<button
								type="button"
								onClick={() => onAddAvailability(day)}
								className={`
								flex h-8 w-8 items-center justify-center
								rounded-lg border
								text-base font-bold
								transition
								active:scale-95
								${addButtonStyle}
							`}
								aria-label={`Add availability for ${format(day, "MMMM d")}`}
							>
								+
							</button>
						)}
					</div>
				</div>

				{/* Schedules */}
				{!isEmpty && (
					<div className={scheduleContainerStyle}>
						{daySchedules.map((schedule) => (
							<ScheduleCard key={schedule.id} instance={schedule} />
						))}
					</div>
				)}
			</div>
		);
	}
}
