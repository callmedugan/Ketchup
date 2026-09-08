import { addDays, addWeeks } from "date-fns";
import { z } from "zod";

/* ========================================================================= */
//                        schemas / types
/* ========================================================================= */

//just the user data
export const instanceUserDataSchema = z.object({
	id: z.string(),
	name: z.string(),
	timezone: z.string(),
	avatarUrl: z.string(),
	bio: z.string(),
});
export type InstanceUserData = z.infer<typeof instanceUserDataSchema>;

//this is what you get from the backend
export const scheduleWithUserInfoSchema = z.object({
	id: z.string(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
	userId: z.string(),
	repeatType: z.enum(["once", "daily", "weekly"]),
	startTime: z.coerce.date(),
	endTime: z.coerce.date(),
	user: instanceUserDataSchema,
});
export type ScheduleWithUserInfo = z.infer<typeof scheduleWithUserInfoSchema>;

//this is what the front end uses
export const scheduleInstanceSchema = z.object({
	id: z.string(),
	scheduleId: z.string(),
	start: z.coerce.date(),
	end: z.coerce.date(),
	user: instanceUserDataSchema,
	overlaps: z.array(
		z.object({
			scheduleId: z.string(),
			start: z.coerce.date(),
			end: z.coerce.date(),
			user: instanceUserDataSchema,
		}),
	),
});
export type ScheduleInstance = z.infer<typeof scheduleInstanceSchema>;

/* ========================================================================= */
//                        instance building
/* ========================================================================= */

export function buildUserInstances(
	userSchedules: ScheduleWithUserInfo[],
	friendSchedules: ScheduleWithUserInfo[],
	rangeStart: Date,
	rangeEnd: Date,
): ScheduleInstance[] {
	//build both set of instances to compare overlaps
	const userInstances = buildInstances(userSchedules, rangeStart, rangeEnd);
	const friendInstances = buildInstances(friendSchedules, rangeStart, rangeEnd);
	//loop through
	for (const userInstance of userInstances) {
		for (const friendInstance of friendInstances) {
			//find overlap and add to overlap array on user instances
			const overlap = getOverlap(userInstance, friendInstance);
			if (!overlap) continue;
			userInstance.overlaps.push({
				scheduleId: friendInstance.scheduleId,
				start: overlap.start,
				end: overlap.end,
				user: friendInstance.user,
			});
		}
	}
	return userInstances;
}

function buildInstances(schedules: ScheduleWithUserInfo[], rangeStart: Date, rangeEnd: Date): ScheduleInstance[] {
	const instances: ScheduleInstance[] = [];
	//loop through given schedules
	for (const schedule of schedules) {
		//skip if started after
		if (schedule.startTime >= rangeEnd) continue;

		//once just figire out if it falls between the range
		if (schedule.repeatType === "once") {
			if (schedule.endTime <= rangeStart) continue;
			instances.push(createInstance(schedule, schedule.startTime, schedule.endTime));
			continue;
		}

		//find first occurance
		const duration = schedule.endTime.getTime() - schedule.startTime.getTime();
		const increment = schedule.repeatType === "daily" ? addDays : addWeeks;
		let occurrenceStart = schedule.startTime;
		while (occurrenceStart < rangeStart) occurrenceStart = increment(occurrenceStart, 1);

		//create any up until end
		while (occurrenceStart < rangeEnd) {
			const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
			instances.push(createInstance(schedule, occurrenceStart, occurrenceEnd));
			occurrenceStart = increment(occurrenceStart, 1);
		}
	}
	return instances;
}

/* ========================================================================= */
//                        helpers
/* ========================================================================= */

function createInstance(schedule: ScheduleWithUserInfo, start: Date, end: Date): ScheduleInstance {
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

function getOverlap(a: ScheduleInstance, b: ScheduleInstance) {
	const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
	const end = new Date(Math.min(a.end.getTime(), b.end.getTime()));
	if (start >= end) return undefined;
	return { start, end };
}
