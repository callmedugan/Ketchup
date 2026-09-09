import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { addDays, addWeeks, format, startOfWeek, subMonths, addMonths } from "date-fns";

import { useSchedule } from "../../contexts/SchedulesContext";

import type { ScheduleInstance } from "./Instance";

import DesktopCalendar from "./DesktopCalendar";
import MobileCalendar from "./MobileCalendar";
import NewScheduleModal from "./NewScheduleModal";

export default function Calendar() {
	const { buildScheduleInstances } = useSchedule();

	const [weekOffset, setWeekOffset] = useState(0);
	const [newScheduleDate, setNewScheduleDate] = useState<Date | null>(null);

	/* ========================================================================= */
	//                        mobile week
	/* ========================================================================= */

	//#region mobile week

	const weekStart = useMemo(
		() =>
			startOfWeek(addWeeks(new Date(), weekOffset), {
				weekStartsOn: 0,
			}),
		[weekOffset],
	);

	const weekEnd = useMemo(() => addWeeks(weekStart, 1), [weekStart]);

	const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

	const weekSchedule = useMemo(() => {
		return buildScheduleInstances(weekStart, weekEnd).sort((a, b) => a.start.getTime() - b.start.getTime());
	}, [buildScheduleInstances, weekStart, weekEnd]);

	//#endregion

	/* ========================================================================= */
	//                        desktop bounds
	/* ========================================================================= */

	//#region desktop bounds

	const currentWeek = useMemo(
		() =>
			startOfWeek(new Date(), {
				weekStartsOn: 0,
			}),
		[],
	);

	const minWeek = useMemo(
		() =>
			startOfWeek(subMonths(new Date(), 6), {
				weekStartsOn: 0,
			}),
		[],
	);

	const maxWeek = useMemo(
		() =>
			startOfWeek(addMonths(new Date(), 12), {
				weekStartsOn: 0,
			}),
		[],
	);

	//#endregion

	/* ========================================================================= */
	//                        desktop schedule cache
	/* ========================================================================= */

	//#region desktop schedule cache

	const scheduleCache = useRef(new Map<string, ScheduleInstance[]>());

	useEffect(() => {
		scheduleCache.current.clear();
	}, [buildScheduleInstances]);

	const getSchedulesForWeek = useCallback(
		(weekStart: Date): ScheduleInstance[] => {
			const key = format(weekStart, "yyyy-MM-dd");

			const cached = scheduleCache.current.get(key);

			if (cached !== undefined) {
				return cached;
			}

			const weekEnd = addWeeks(weekStart, 1);

			const schedules = buildScheduleInstances(weekStart, weekEnd).sort((a, b) => a.start.getTime() - b.start.getTime());

			scheduleCache.current.set(key, schedules);

			return schedules;
		},
		[buildScheduleInstances],
	);

	//#endregion

	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="hidden min-h-0 min-w-0 flex-1 md:flex">
				<DesktopCalendar
					currentWeek={currentWeek}
					minWeek={minWeek}
					maxWeek={maxWeek}
					getSchedulesForWeek={getSchedulesForWeek}
					onAddAvailability={setNewScheduleDate}
				/>
			</div>

			<div className="flex min-h-0 min-w-0 flex-1 md:hidden">
				<MobileCalendar weekDays={weekDays} schedules={weekSchedule} weekOffset={weekOffset} setWeekOffset={setWeekOffset} />
			</div>

			{newScheduleDate && <NewScheduleModal initialDate={newScheduleDate} onClose={() => setNewScheduleDate(null)} />}
		</div>
	);
}
