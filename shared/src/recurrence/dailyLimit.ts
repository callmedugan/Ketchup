import { addDays, format, getDay, isSameDay, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { ScheduleRepeatType } from "../types/schedule.js";

export type ScheduleForDailyLimitCheck = {
	startTime: Date;
	repeatType: ScheduleRepeatType;
};

/**
 * Checks whether adding `newSchedule` would push any day over `maxPerDay`
 * existing schedules. Returns the first offending day (in the given
 * timezone), or undefined if the new schedule is fine. Pure - callers decide
 * how to turn a violation into a user-facing error.
 */
export function findScheduleDailyLimitViolation(
	schedules: ScheduleForDailyLimitCheck[],
	newSchedule: ScheduleForDailyLimitCheck,
	timezone: string,
	maxPerDay: number,
): Date | undefined {
	const candidateDays = getCandidateDays(schedules, newSchedule, timezone);

	for (const day of candidateDays) {
		if (!scheduleOccursOnDay(newSchedule, day, timezone)) continue;

		const existingCount = countSchedulesForDay(schedules, day, timezone);
		if (existingCount >= maxPerDay) return day;
	}

	return undefined;
}

function countSchedulesForDay(schedules: ScheduleForDailyLimitCheck[], date: Date, timezone: string): number {
	return schedules.filter((schedule) => scheduleOccursOnDay(schedule, date, timezone)).length;
}

function scheduleOccursOnDay(schedule: ScheduleForDailyLimitCheck, day: Date, timezone: string): boolean {
	const scheduleDate = toZonedTime(schedule.startTime, timezone);
	const targetDate = toZonedTime(day, timezone);

	// recurring schedule hasn't started yet
	if (startOfDay(targetDate) < startOfDay(scheduleDate)) return false;
	if (schedule.repeatType === "daily") return true;
	if (schedule.repeatType === "weekly") return getDay(scheduleDate) === getDay(targetDate);

	// "once"
	return isSameDay(scheduleDate, targetDate);
}

function getCandidateDays(schedules: ScheduleForDailyLimitCheck[], newSchedule: ScheduleForDailyLimitCheck, timezone: string): Date[] {
	const candidateDays: Date[] = [];
	const newStart = toZonedTime(newSchedule.startTime, timezone);

	// every existing one-time schedule date - a future "once" could conflict with a new recurring schedule
	for (const schedule of schedules) {
		if (schedule.repeatType === "once") {
			candidateDays.push(toZonedTime(schedule.startTime, timezone));
		}
	}

	// a new "once" schedule only needs its own date in addition to the above
	if (newSchedule.repeatType === "once") {
		candidateDays.push(newStart);
		return getUniqueDays(candidateDays);
	}

	// otherwise test a 7-day window starting after every recurring schedule involved has started,
	// which covers every possible weekday combination
	let recurringWindowStart = newStart;

	for (const schedule of schedules) {
		if (schedule.repeatType === "once") continue;

		const scheduleStart = toZonedTime(schedule.startTime, timezone);
		if (scheduleStart > recurringWindowStart) recurringWindowStart = scheduleStart;
	}

	for (let i = 0; i < 7; i++) {
		candidateDays.push(addDays(recurringWindowStart, i));
	}

	return getUniqueDays(candidateDays);
}

function getUniqueDays(days: Date[]): Date[] {
	const uniqueDays = new Map<string, Date>();

	for (const day of days) {
		uniqueDays.set(format(day, "yyyy-MM-dd"), day);
	}

	return [...uniqueDays.values()];
}
