import { useCallback, useMemo, useRef, useState } from "react";
import { addMonths, addWeeks, format, startOfWeek, subMonths } from "date-fns";

import { useSchedule } from "../../contexts/SchedulesContext";

import type { ScheduleInstance } from "./Instance";

import DesktopCalendar from "./DesktopCalendar";
import MobileCalendar from "./MobileCalendar";
import NewScheduleModal from "./NewScheduleModal";
import { useMediaQuery } from "../hooks/useMediaQuery";

export default function Calendar() {
	const { buildScheduleInstances } = useSchedule();

	const [newScheduleDate, setNewScheduleDate] = useState<Date | null>(null);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	/* ========================================================================= */
	//                        calendar bounds
	/* ========================================================================= */

	//#region calendar bounds

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
	//                        schedule cache
	/* ========================================================================= */

	//#region schedule cache

	const scheduleCache = useRef(new Map<string, ScheduleInstance[]>());

	const previousBuildScheduleInstances = useRef(buildScheduleInstances);

	if (previousBuildScheduleInstances.current !== buildScheduleInstances) {
		scheduleCache.current.clear();
		previousBuildScheduleInstances.current = buildScheduleInstances;
	}

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
			{isDesktop ? (
				<DesktopCalendar
					currentWeek={currentWeek}
					minWeek={minWeek}
					maxWeek={maxWeek}
					getSchedulesForWeek={getSchedulesForWeek}
					onAddAvailability={setNewScheduleDate}
				/>
			) : (
				<MobileCalendar
					initialWeek={currentWeek}
					minWeek={minWeek}
					maxWeek={maxWeek}
					getSchedulesForWeek={getSchedulesForWeek}
					onAddAvailability={setNewScheduleDate}
				/>
			)}

			{newScheduleDate && <NewScheduleModal initialDate={newScheduleDate} onClose={() => setNewScheduleDate(null)} />}
		</div>
	);
}
