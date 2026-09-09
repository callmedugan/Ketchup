import { Request, Response } from "express";
import { UnauthorizedError, BadRequestError, NotFoundError } from "../error.js";
import z from "zod";
import { addScheduleToDb, deleteScheduleFromDb, getScheduleByUserFromDb, getUserAndFriendsSchedulesFromDb } from "../db/queries.js";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { logInfo } from "./logging.js";
import { ScheduleRepeatType, scheduleRepeatTypeRank } from "../db/schema.js";
import { addDays, format, getDay, getHours, getMinutes, isBefore, isSameDay, set, startOfDay } from "date-fns";
import { MAX_SCHEDULES_PER_DAY } from "../data/constants.js";

//used to validate timezones
export const timezoneSchema = z
	.string()
	.trim()
	.refine(
		(value) => {
			try {
				new Intl.DateTimeFormat("en-US", { timeZone: value });
				return true;
			} catch {
				return false;
			}
		},
		{ message: "Invalid timezone" },
	);
export type Timezone = z.infer<typeof timezoneSchema>;

const createScheduleSchema = z
	.object({
		startTime: z.coerce.date({ error: "Start time cannot be blank" }),
		endTime: z.coerce.date({ error: "End time cannot be blank" }),
		repeatType: z.enum(["once", "daily", "weekly"], { error: "Invalid repeat type" }),
		timezone: timezoneSchema,
	})
	.refine((data) => data.endTime > data.startTime, { message: "End time must be after start time", path: ["endTime"] });

const deleteScheduleSchema = z.object({ id: z.uuid().min(1, "Id missing or blank") });

export async function handlerCreateSchedule(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("Unauthorized");

	// validate body
	const body = createScheduleSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { startTime, endTime, repeatType, timezone } = body.data;

	//convert to utc to compare to db
	const zonedStart = fromZonedTime(startTime, timezone);
	const zonedEnd = fromZonedTime(endTime, timezone);

	// check user's schedules
	const userSchedules = await getScheduleByUserFromDb(userId);

	// check daily schedule limit
	validateScheduleDailyLimit(
		userSchedules,
		{
			startTime: zonedStart,
			repeatType,
		},
		timezone,
	);

	//check to see if overlap occurs with any of the user's schedules
	for (const schedule of userSchedules) {
		const overlap = getTimeOverlapRepeating(
			{ start: schedule.startTime, end: schedule.endTime, repeatType: schedule.repeatType },
			{ start: zonedStart, end: zonedEnd, repeatType },
		);

		//give user a message for when the new schedule overlaps
		if (overlap !== undefined) {
			throw new BadRequestError(
				`This availability overlaps your existing schedule on ${formatInTimeZone(schedule.startTime, timezone, "Pp")} to ${formatInTimeZone(
					schedule.endTime,
					timezone,
					"h:mm a",
				)}.`,
			);
		}
	}

	// call db
	const result = await addScheduleToDb({ userId, repeatType, startTime: zonedStart, endTime: zonedEnd });
	if (result === undefined) throw new Error("Something went wrong adding the schedule to the db");

	logInfo("schedule.created", { userId, scheduleId: result.id, repeatType: result.repeatType });

	// return
	res.status(201).json(result);
}

export async function handlerDeleteSchedule(req: Request, res: Response) {
	// validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = deleteScheduleSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Id missing or blank");

	// call db
	// 404 is intentional so the route does not reveal whether another user's schedule exists.
	const result = await deleteScheduleFromDb(userId, body.data.id);
	if (result == undefined) throw new NotFoundError("Schedule not found");

	logInfo("schedule.deleted", { userId, scheduleId: result.id });

	// return
	res.status(204).send();
}

export async function handlerGetUserAndFriendSchedules(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db
	const result = await getUserAndFriendsSchedulesFromDb(userId);

	// return
	res.status(200).json(result);
}

/* ========================================================================= */
//                        schedule helpers
/* ========================================================================= */

//#region schedule helpers

type TimeRangeRepeating = { start: Date; end: Date; repeatType: ScheduleRepeatType };

//a should be the user input and converted to UTC
export function getTimeOverlapRepeating(a: TimeRangeRepeating, b: TimeRangeRepeating): TimeRangeRepeating | undefined {
	// get the day of the week for both schedules
	const aDay = getDay(a.start);
	const bDay = getDay(b.start);

	// once/weekly schedules must land on the same weekday.
	// both onces must be same day
	if (a.repeatType !== "daily" && b.repeatType !== "daily" && aDay !== bDay) return undefined;
	if (a.repeatType === "once" && b.repeatType === "once" && !isSameDay(a.start, b.start)) return undefined;

	//use zone for a
	const overlapStart = Math.max(a.start.getTime(), b.start.getTime());
	const overlapEnd = Math.min(a.end.getTime(), b.end.getTime());

	//no overlap
	if (overlapStart >= overlapEnd) return undefined;

	// get the lowest tier of repeat
	const repeatType = scheduleRepeatTypeRank[a.repeatType] <= scheduleRepeatTypeRank[b.repeatType] ? a.repeatType : b.repeatType;

	//get the start date of whichever is later
	const overlapDate = isBefore(a.start, b.start) ? b.start : a.start;
	const start = combineDateAndTime(overlapDate, new Date(overlapStart));
	const end = combineDateAndTime(overlapDate, new Date(overlapEnd));

	//return using the later schedule as the start date
	return { start, end, repeatType };
}

//a should be the user input and b is the existing schedules
// export function getTimeOverlapRepeating(a: TimeRangeRepeating, b: TimeRangeRepeating): TimeRangeRepeating | undefined {
// 	// get the day of the week for both schedules
// 	const aDay = getDay(toZonedTime(a.start, a.timezone));
// 	const bDay = getDay(toZonedTime(b.start, b.timezone));

// 	// once/weekly schedules must land on the same weekday.
// 	// both onces must be same day
// 	if (a.repeatType !== "daily" && b.repeatType !== "daily" && aDay !== bDay) return undefined;
// 	if (a.repeatType === "once" && b.repeatType === "once" && !isSameDay(aDay, bDay)) return undefined;

// 	//convert to minutes
// 	const aStart = dateToMinutes(a.start, a.timezone);
// 	const aEnd = dateToMinutes(a.end, a.timezone);
// 	const bStart = dateToMinutes(b.start, b.timezone);
// 	const bEnd = dateToMinutes(b.end, b.timezone);

// 	//find the actual time overlap
// 	const maxStart = Math.max(aStart, bStart);
// 	const minEnd = Math.min(aEnd, bEnd);

// 	//no overlap
// 	if (maxStart >= minEnd) return undefined;

// 	// get the lowest tier of repeat
// 	const repeat = scheduleRepeatTypeRank[a.repeatType] <= scheduleRepeatTypeRank[b.repeatType] ? a.repeatType : b.repeatType;

// 	//get the start date of whichever is later
// 	const startDate = getLaterDate(a, b);
// 	console.log(startDate);

// 	//return using the later schedule as the start date and with the a timezone
// 	return { start: minutesToDate(maxStart, startDate, a.timezone), end: minutesToDate(minEnd, startDate, a.timezone), repeatType: repeat, timezone: a.timezone };
// }

//converts a date to minutes offset by a timezone
function dateToMinutes(date: Date, timezone: string) {
	const zonedDate = toZonedTime(date, timezone);
	return getHours(zonedDate) * 60 + getMinutes(zonedDate);
}

//reverses minutes back to a date/time
function minutesToDate(minutes: number, date: Date, timezone: string) {
	const zonedDate = toZonedTime(date, timezone);
	return set(zonedDate, { hours: Math.floor(minutes / 60), minutes: minutes % 60, seconds: 0, milliseconds: 0 });
}

function combineDateAndTime(date: Date, time: Date): Date {
	return set(date, { hours: time.getHours(), minutes: time.getMinutes(), seconds: time.getSeconds(), milliseconds: 0 });
}

//#endregion

/* ========================================================================= */
//                        schedule limits
/* ========================================================================= */

//#region schedule limits

type ScheduleForDailyLimitCheck = {
	startTime: Date;
	repeatType: ScheduleRepeatType;
};

//main function
function validateScheduleDailyLimit(schedules: ScheduleForDailyLimitCheck[], newSchedule: ScheduleForDailyLimitCheck, timezone: string): void {
	const candidateDays = getCandidateDays(schedules, newSchedule, timezone);

	//define before loop
	const newScheduleForLimit: ScheduleForDailyLimitCheck = {
		startTime: newSchedule.startTime,
		repeatType: newSchedule.repeatType,
	};

	for (const day of candidateDays) {
		//for each day pass if not on the new schedule day
		if (!scheduleOccursOnDay(newScheduleForLimit, day, timezone)) continue;
		//get count
		const existingCount = countSchedulesForDay(schedules, day, timezone);
		//throw error if over count
		if (existingCount >= MAX_SCHEDULES_PER_DAY) {
			throw new BadRequestError(
				`You can only have ${MAX_SCHEDULES_PER_DAY} availabilities per day. Remove one from ${format(toZonedTime(day, timezone), "PPP")}`,
			);
		}
	}
}

//gets the count for a day
function countSchedulesForDay(schedules: ScheduleForDailyLimitCheck[], date: Date, timezone: string): number {
	return schedules.filter((schedule) => scheduleOccursOnDay(schedule, date, timezone)).length;
}

//helper to check if a schedules occurs on a day with a given start and repeat
function scheduleOccursOnDay(schedule: ScheduleForDailyLimitCheck, day: Date, timezone: string): boolean {
	const scheduleDate = toZonedTime(schedule.startTime, timezone);
	const targetDate = toZonedTime(day, timezone);

	// Recurring schedule hasn't started yet
	if (startOfDay(targetDate) < startOfDay(scheduleDate)) return false;
	if (schedule.repeatType === "daily") return true;
	if (schedule.repeatType === "weekly") return getDay(scheduleDate) === getDay(targetDate);

	// "once"
	return isSameDay(scheduleDate, targetDate);
}

function getCandidateDays(schedules: ScheduleForDailyLimitCheck[], newSchedule: ScheduleForDailyLimitCheck, timezone: string): Date[] {
	const candidateDays: Date[] = [];

	const newStart = toZonedTime(newSchedule.startTime, timezone);

	// Include every existing one-time schedule date.
	// A future "once" schedule could conflict with a new recurring schedule.
	for (const schedule of schedules) {
		if (schedule.repeatType === "once") {
			candidateDays.push(toZonedTime(schedule.startTime, timezone));
		}
	}

	// If the new schedule itself is "once", its date is all we really need
	// in addition to the existing once dates above.
	if (newSchedule.repeatType === "once") {
		candidateDays.push(newStart);
		return getUniqueDays(candidateDays);
	}

	// Find the latest start among recurring schedules.
	// We want our 7-day test window to happen after all recurring
	// schedules involved have started.
	let recurringWindowStart = newStart;

	for (const schedule of schedules) {
		if (schedule.repeatType === "once") {
			continue;
		}

		const scheduleStart = toZonedTime(schedule.startTime, timezone);

		if (scheduleStart > recurringWindowStart) {
			recurringWindowStart = scheduleStart;
		}
	}

	// Seven days covers every possible weekday combination.
	for (let i = 0; i < 7; i++) {
		candidateDays.push(addDays(recurringWindowStart, i));
	}

	return getUniqueDays(candidateDays);
}

function getUniqueDays(days: Date[]): Date[] {
	const uniqueDays = new Map<string, Date>();

	for (const day of days) {
		const key = format(day, "yyyy-MM-dd");
		uniqueDays.set(key, day);
	}

	return [...uniqueDays.values()];
}

//#endregion
