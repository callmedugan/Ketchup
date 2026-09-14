import { Request, Response } from "express";
import { UnauthorizedError, BadRequestError, NotFoundError } from "../error.js";
import { addScheduleToDb, deleteScheduleFromDb, getActivePlansForSchedules, getScheduleByUserFromDb, getUserAndFriendsSchedulesFromDb } from "../db/queries.js";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { logInfo } from "./logging.js";
import { format } from "date-fns";
import {
	createScheduleRequestSchema,
	deleteScheduleRequestSchema,
	findScheduleDailyLimitViolation,
	getTimeOverlapRepeating,
	MAX_SCHEDULES_PER_DAY,
} from "@ketchup/shared";

export async function handlerCreateSchedule(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("Unauthorized");

	// validate body
	const body = createScheduleRequestSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { startTime, endTime, repeatType, timezone } = body.data;

	//convert to utc to compare to db
	const utcStart = fromZonedTime(startTime, timezone);
	const utcEnd = fromZonedTime(endTime, timezone);
	if (utcEnd <= utcStart) throw new BadRequestError("End time must be after start time");

	// check user's schedules
	const userSchedules = await getScheduleByUserFromDb(userId);

	// check daily schedule limit
	const limitViolationDay = findScheduleDailyLimitViolation(userSchedules, { startTime: utcStart, repeatType }, timezone, MAX_SCHEDULES_PER_DAY);
	if (limitViolationDay !== undefined) {
		throw new BadRequestError(
			`You can only have ${MAX_SCHEDULES_PER_DAY} availabilities per day. Remove one from ${format(toZonedTime(limitViolationDay, timezone), "PPP")}`,
		);
	}

	//check to see if overlap occurs with any of the user's schedules
	for (const schedule of userSchedules) {
		const overlap = getTimeOverlapRepeating(
			{ start: schedule.startTime, end: schedule.endTime, repeatType: schedule.repeatType },
			{ start: utcStart, end: utcEnd, repeatType },
			timezone,
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

	// call db - make sure to use the utc time
	const result = await addScheduleToDb({ userId, repeatType, startTime: utcStart, endTime: utcEnd });
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
	const body = deleteScheduleRequestSchema.safeParse(req.body);
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
	const { userSchedules, friendSchedules } = await getUserAndFriendsSchedulesFromDb(userId);

	// attach the active plan (if any) each of the user's own schedules is committed to -
	// only the user's own schedules are ever rendered as calendar cards, so friend schedules don't need this
	const activePlansBySchedule = await getActivePlansForSchedules(userSchedules.map((schedule) => schedule.id));
	const userSchedulesWithPlans = userSchedules.map((schedule) => ({ ...schedule, plan: activePlansBySchedule.get(schedule.id) ?? null }));

	// return
	res.status(200).json({ userSchedules: userSchedulesWithPlans, friendSchedules });
}
