import { useEffect, useMemo, useState } from "react";
import { addDays, addWeeks, format, isSameMonth, startOfWeek } from "date-fns";
import type { ScheduleInstance } from "../../utils/types";
import StickyNote from "./StickyNote";
import { useSchedule } from "../../contexts/SchedulesContext";
import { LoadingIndicator } from "../LoadingIndicator";
import ScrollableContainer from "../common/ScrollableContainer";

export default function Calendar() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [weekOffset, setWeekOffset] = useState(0);

	const { fetchScheduleInstances, scheduleInstances } = useSchedule();

	const weekStart = useMemo(
		() =>
			startOfWeek(addWeeks(new Date(), weekOffset), {
				weekStartsOn: 0,
			}),
		[weekOffset],
	);

	const weekEnd = useMemo(() => addWeeks(weekStart, 1), [weekStart]);

	const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

	const weekSchedule = useMemo(() => [...scheduleInstances].sort((a, b) => a.start.getTime() - b.start.getTime()), [scheduleInstances]);

	/* ========================================================================= */
	// fetch week
	/* ========================================================================= */

	useEffect(() => {
		loadWeek();
	}, [weekStart, weekEnd]);

	if (error) return showError();
	if (loading) return showLoading();

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="hidden min-h-0 min-w-0 flex-1 md:flex">
				<DesktopCalendar />
			</div>

			<div className="flex min-h-0 min-w-0 flex-1 md:hidden">
				<MobileCalendar />
			</div>
		</div>
	);

	/* ========================================================================= */
	//                        components
	/* ========================================================================= */

	function DesktopCalendar() {
		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
				{showCalendarHeader()}

				<div className="grid min-h-0 min-w-0 flex-1 grid-cols-7">{weekDays.map(showDay)}</div>
			</div>
		);
	}

	function MobileCalendar() {
		return (
			<div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
				{showMobileHeader()}

				<ScrollableContainer className="py-2">{weekDays.map(showMobileDay)}</ScrollableContainer>
			</div>
		);
	}

	/* ========================================================================= */
	// Header
	/* ========================================================================= */

	function showCalendarHeader() {
		return (
			<div className="flex min-h-20 shrink-0 items-center justify-between border-b border-brand-red-dark bg-brand-red px-3 sm:px-5">
				<button
					type="button"
					onClick={() => setWeekOffset((prev) => prev - 1)}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-brand-cream transition hover:bg-white/20 hover:text-white active:scale-95"
					aria-label="Previous week"
				>
					<span className="mb-1 text-xl leading-none">‹</span>
				</button>

				<div className="flex min-w-0 items-center justify-center gap-3">
					<h2 className="whitespace-nowrap text-2xl font-bold tracking-tight text-brand-cream sm:text-3xl">{format(weekDays[0], "MMMM yyyy")}</h2>

					<button
						type="button"
						onClick={() => setWeekOffset(0)}
						disabled={weekOffset === 0}
						className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
							weekOffset === 0 ? "cursor-default bg-white/10 text-white/40" : "bg-brand-cream text-brand-red shadow-sm hover:bg-white active:scale-95"
						}`}
					>
						This week
					</button>
				</div>

				<button
					type="button"
					onClick={() => setWeekOffset((prev) => prev + 1)}
					className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 text-brand-cream transition hover:bg-white/20 hover:text-white active:scale-95"
					aria-label="Next week"
				>
					<span className="mb-1 text-xl leading-none">›</span>
				</button>
			</div>
		);
	}

	/* ========================================================================= */
	// Day
	/* ========================================================================= */

	function showDay(day: Date, index: number) {
		const isToday = format(day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

		const daySchedules = getSchedulesForDay(day);

		return (
			<div
				key={day.toISOString()}
				className={`min-h-0 min-w-0 border-r border-stone-200/80 last:border-r-0 ${index % 2 === 0 ? "bg-brand-card" : "bg-brand-surface"}`}
			>
				{showDayHeader(day, isToday)}
				{showDaySchedules(daySchedules)}
			</div>
		);
	}

	function showDayHeader(day: Date, isToday: boolean) {
		return (
			<div className="border-b border-stone-200/80 bg-[#f3e4d7] px-2 py-3 text-center">
				<div className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-muted sm:text-xs">{format(day, "EEE")}</div>

				<div
					className={`mx-auto mt-1 flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
						isToday ? "bg-[#d94b3d] text-white shadow-sm" : "text-brand-text"
					}`}
				>
					{format(day, "d")}
				</div>
			</div>
		);
	}

	function showDaySchedules(schedules: ScheduleInstance[]) {
		return (
			<div className="flex gap-3 overflow-x-auto p-3 md:flex-col md:overflow-visible">
				{schedules.map((schedule) => (
					<StickyNote key={schedule.id} instance={schedule} onDeleted={handleScheduleDeleted} />
				))}
			</div>
		);
	}

	function getSchedulesForDay(day: Date): ScheduleInstance[] {
		return weekSchedule.filter(
			(schedule) =>
				schedule.start.getFullYear() === day.getFullYear() &&
				schedule.start.getMonth() === day.getMonth() &&
				schedule.start.getDate() === day.getDate(),
		);
	}

	/* ========================================================================= */
	// States / fetching
	/* ========================================================================= */

	async function loadWeek() {
		setLoading(true);
		setError(null);

		try {
			await fetchScheduleInstances(weekStart, weekEnd);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load schedule");
		} finally {
			setLoading(false);
		}
	}

	function showError() {
		return (
			<div className="flex min-h-96 flex-1 items-center justify-center px-6">
				<div className="text-center">
					<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">!</div>

					<h2 className="mt-4 text-lg font-bold text-brand-text">Something went wrong</h2>

					<p role="alert" className="mt-2 text-sm font-medium text-red-600">
						{error}
					</p>
				</div>
			</div>
		);
	}

	function showLoading() {
		return (
			<div className="flex min-h-96 flex-1 items-center justify-center">
				<LoadingIndicator variant="Loading" />
			</div>
		);
	}

	async function handleScheduleDeleted() {
		await loadWeek();
	}

	/* ========================================================================= */
	//                        mobile
	/* ========================================================================= */

	function showMobileHeader() {
		const mobileWeekStart = weekDays[0];
		const mobileWeekEnd = weekDays[weekDays.length - 1];

		const dateRange = isSameMonth(mobileWeekStart, mobileWeekEnd)
			? `${format(mobileWeekStart, "MMM d")} - ${format(mobileWeekEnd, "d, yyyy")}`
			: `${format(mobileWeekStart, "MMM d")} - ${format(mobileWeekEnd, "MMM d, yyyy")}`;

		return (
			<div className="flex shrink-0 items-center justify-between border-b border-brand-red-dark bg-brand-red px-3 py-3">
				<button
					type="button"
					onClick={() => setWeekOffset((prev) => prev - 1)}
					className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 pb-1 text-brand-cream transition active:scale-95 active:bg-white/20"
					aria-label="Previous week"
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
					aria-label="Next week"
				>
					›
				</button>
			</div>
		);
	}

	function showMobileDay(day: Date) {
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
								<StickyNote key={schedule.id} instance={schedule} onDeleted={handleScheduleDeleted} />
							))}
						</div>
					</ScrollableContainer>
				)}
			</div>
		);
	}
}
