import { Request, Response } from "express";
import { UnauthorizedError, BadRequestError, NotFoundError } from "../error.js";
import z from "zod";
import { addScheduleToDb, deleteScheduleFromDb, getScheduleByUserFromDb } from "../db/queries.js";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { logInfo } from "./logging.js";
import { ScheduleRepeatType, scheduleRepeatTypeRank } from "../db/schema.js";
import { getDay, getHours, getMinutes, set } from "date-fns";

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
const compareSchedulesSchema = z.object({ userId2: z.uuid().min(1, "userId2 cannot be blank") });

export async function handlerCreateSchedule(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("Unauthorized");

	// validate body
	const body = createScheduleSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { startTime, endTime, repeatType, timezone } = body.data;

	// check for overlapping schedules
	const userSchedules = await getScheduleByUserFromDb(userId);

	//check to see if overlap occurs with any of the user's schedules
	for (const schedule of userSchedules) {
		const overlap = getTimeOverlapRepeating(
			{ start: schedule.startTime, end: schedule.endTime, repeatType: schedule.repeatType, timezone: schedule.timezone },
			{ start: startTime, end: endTime, repeatType, timezone },
		);

		//give user a message for when the new schedule overlaps
		if (overlap !== undefined) {
			throw new BadRequestError(
				`This availability overlaps your existing schedule on ${formatInTimeZone(schedule.startTime, schedule.timezone, "Pp")} to ${formatInTimeZone(
					schedule.endTime,
					schedule.timezone,
					"h:mm a",
				)}.`,
			);
		}
	}

	// call db
	const result = await addScheduleToDb({ userId, repeatType, startTime, endTime, timezone });
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

export async function handlerGetSchedules(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db
	const result = await getScheduleByUserFromDb(userId);

	// return
	res.status(200).json(result);
}

/* ========================================================================= */
//                        schedule helpers
/* ========================================================================= */

//#region schedule helpers

type TimeRangeRepeating = { start: Date; end: Date; repeatType: ScheduleRepeatType; timezone: string };

function _dateToMinutes(date: Date, timezone: string) {
	const zonedDate = toZonedTime(date, timezone);
	return getHours(zonedDate) * 60 + getMinutes(zonedDate);
}

function _getDay(date: Date, timezone: string) {
	const zonedDate = toZonedTime(date, timezone);
	return getDay(zonedDate);
}

function _minutesToDate(minutes: number, date: Date, timezone: string) {
	const zonedDate = toZonedTime(date, timezone);
	return set(zonedDate, { hours: Math.floor(minutes / 60), minutes: minutes % 60, seconds: 0, milliseconds: 0 });
}

export function getTimeOverlapRepeating(a: TimeRangeRepeating, b: TimeRangeRepeating): TimeRangeRepeating | undefined {
	// Use the first schedule's timezone for the entire comparison.
	const timezone = a.timezone;

	const aDay = _getDay(a.start, timezone);
	const bDay = _getDay(b.start, timezone);

	// once/weekly schedules must land on the same weekday.
	// daily schedules are always eligible for an overlap.
	if (a.repeatType !== "daily" && b.repeatType !== "daily" && aDay !== bDay) {
		return undefined;
	}

	const aStart = _dateToMinutes(a.start, timezone);
	const aEnd = _dateToMinutes(a.end, timezone);

	const bStart = _dateToMinutes(b.start, timezone);
	const bEnd = _dateToMinutes(b.end, timezone);

	const maxStart = Math.max(aStart, bStart);
	const minEnd = Math.min(aEnd, bEnd);

	if (maxStart >= minEnd) {
		return undefined;
	}

	const repeat = scheduleRepeatTypeRank[a.repeatType] <= scheduleRepeatTypeRank[b.repeatType] ? a.repeatType : b.repeatType;

	return { start: _minutesToDate(maxStart, a.start, timezone), end: _minutesToDate(minEnd, a.start, timezone), repeatType: repeat, timezone };
}

//#endregion
