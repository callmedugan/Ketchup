import { addDays, addWeeks } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import type { ScheduleWithUser } from "../types/schedule.js";
import type { UserPublic } from "../types/user.js";

export type ScheduleInstanceOverlap = {
	scheduleId: string;
	start: Date;
	end: Date;
	user: UserPublic;
};

export type ScheduleInstance = {
	id: string;
	scheduleId: string;
	start: Date;
	end: Date;
	user: UserPublic;
	overlaps: ScheduleInstanceOverlap[];
};

/**
 * Expands the user's schedules and their friends' schedules into concrete
 * calendar-day instances within [rangeStart, rangeEnd), finds where the
 * user's instances overlap a friend's, and converts everything into the
 * user's timezone for display. Everything coming in should be in UTC.
 */
export function buildUserInstances(
	userSchedules: ScheduleWithUser[],
	friendSchedules: ScheduleWithUser[],
	rangeStart: Date,
	rangeEnd: Date,
	userTimezone: string,
): ScheduleInstance[] {
	const userInstances = buildInstances(userSchedules, rangeStart, rangeEnd);
	const friendInstances = buildInstances(friendSchedules, rangeStart, rangeEnd);

	for (const userInstance of userInstances) {
		for (const friendInstance of friendInstances) {
			const overlap = getOverlap(userInstance, friendInstance);
			if (!overlap) continue;

			userInstance.overlaps.push({
				scheduleId: friendInstance.scheduleId,
				start: toZonedTime(overlap.start, userTimezone),
				end: toZonedTime(overlap.end, userTimezone),
				user: friendInstance.user,
			});
		}

		userInstance.start = toZonedTime(userInstance.start, userTimezone);
		userInstance.end = toZonedTime(userInstance.end, userTimezone);
	}

	return userInstances;
}

export function buildInstances(schedules: ScheduleWithUser[], rangeStart: Date, rangeEnd: Date): ScheduleInstance[] {
	const instances: ScheduleInstance[] = [];

	for (const schedule of schedules) {
		if (schedule.startTime >= rangeEnd) continue;

		if (schedule.repeatType === "once") {
			if (schedule.endTime <= rangeStart) continue;
			instances.push(createInstance(schedule, schedule.startTime, schedule.endTime));
			continue;
		}

		const duration = schedule.endTime.getTime() - schedule.startTime.getTime();
		const increment = schedule.repeatType === "daily" ? addDays : addWeeks;
		let occurrenceStart = schedule.startTime;
		while (occurrenceStart < rangeStart) occurrenceStart = increment(occurrenceStart, 1);

		while (occurrenceStart < rangeEnd) {
			const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
			instances.push(createInstance(schedule, occurrenceStart, occurrenceEnd));
			occurrenceStart = increment(occurrenceStart, 1);
		}
	}

	return instances;
}

function createInstance(schedule: ScheduleWithUser, start: Date, end: Date): ScheduleInstance {
	return {
		id: getInstanceId(schedule.id, start),
		scheduleId: schedule.id,
		start,
		end,
		user: schedule.user,
		overlaps: [],
	};
}

function getInstanceId(scheduleId: string, start: Date): string {
	return `${scheduleId}:${start.toISOString()}`;
}

function getOverlap(a: ScheduleInstance, b: ScheduleInstance): { start: Date; end: Date } | undefined {
	const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
	const end = new Date(Math.min(a.end.getTime(), b.end.getTime()));
	if (start >= end) return undefined;
	return { start, end };
}
