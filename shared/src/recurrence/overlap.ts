import { getDay, isBefore, isSameDay, set } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { scheduleRepeatTypeRank, type ScheduleRepeatType } from "../types/schedule.js";

export type TimeRangeRepeating = { start: Date; end: Date; repeatType: ScheduleRepeatType };

/**
 * Determines whether two (possibly recurring) schedules overlap, working
 * directly off their repeat types instead of expanding either one into
 * concrete calendar instances. Used both for create-time conflict validation
 * (server) and for calendar overlap display (client) so the two surfaces
 * can't drift on what counts as "overlapping".
 *
 * `a`/`b` are absolute UTC instants; `timezone` is the timezone both should
 * be interpreted in when deciding what weekday/time-of-day they land on
 * (mirrors dailyLimit's pattern - relying on the runtime's own local
 * timezone here would make results depend on what timezone the server
 * process happens to run in).
 *
 * Schedules never span midnight (start/end always share a calendar day), so
 * time-of-day is compared in minutes-since-midnight rather than raw epoch
 * instants - this is what lets weekday-eligible schedules overlap correctly
 * even when their underlying start dates are weeks apart (e.g. a weekly
 * schedule created last month vs. one created today, both on Mondays).
 */
export function getTimeOverlapRepeating(a: TimeRangeRepeating, b: TimeRangeRepeating, timezone: string): TimeRangeRepeating | undefined {
	const aStart = toZonedTime(a.start, timezone);
	const aEnd = toZonedTime(a.end, timezone);
	const bStart = toZonedTime(b.start, timezone);
	const bEnd = toZonedTime(b.end, timezone);

	// once/weekly schedules must land on the same weekday. both onces must be the same day.
	if (a.repeatType !== "daily" && b.repeatType !== "daily" && getDay(aStart) !== getDay(bStart)) return undefined;
	if (a.repeatType === "once" && b.repeatType === "once" && !isSameDay(aStart, bStart)) return undefined;

	const overlapStartMinutes = Math.max(minutesSinceMidnight(aStart), minutesSinceMidnight(bStart));
	const overlapEndMinutes = Math.min(minutesSinceMidnight(aEnd), minutesSinceMidnight(bEnd));

	// no overlap
	if (overlapStartMinutes >= overlapEndMinutes) return undefined;

	// the lowest tier of repeat wins (e.g. once beats weekly beats daily)
	const repeatType = scheduleRepeatTypeRank[a.repeatType] <= scheduleRepeatTypeRank[b.repeatType] ? a.repeatType : b.repeatType;

	// use the later schedule's date as the anchor date for the overlap
	const overlapAnchor = isBefore(aStart, bStart) ? bStart : aStart;
	const start = fromZonedTime(setMinutesSinceMidnight(overlapAnchor, overlapStartMinutes), timezone);
	const end = fromZonedTime(setMinutesSinceMidnight(overlapAnchor, overlapEndMinutes), timezone);

	return { start, end, repeatType };
}

function minutesSinceMidnight(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

function setMinutesSinceMidnight(date: Date, minutes: number): Date {
	return set(date, { hours: Math.floor(minutes / 60), minutes: minutes % 60, seconds: 0, milliseconds: 0 });
}
