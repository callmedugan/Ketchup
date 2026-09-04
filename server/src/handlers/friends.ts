import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../error.js";
import z from "zod";
import {
	blockUserInDb,
	FriendScheduleRecord,
	FriendScheduleWithTimezone,
	getAllFriendSchedules,
	getFriendsInDb,
	getScheduleByUserFromDb,
	getUserSchedulesFromDb,
	removeFriendInDb,
	requestFriendInDb,
	respondToFriendRequestInDb,
	unblockUserInDb,
} from "../db/queries.js";
import { logInfo } from "./logging.js";
import { getTimeOverlapRepeating } from "./schedules.js";
import { addDays, addMonths, addWeeks, differenceInDays } from "date-fns";
import { ScheduleRecord } from "../db/schema.js";

const requestFriendSchema = z.object({ friendId: z.uuid().min(1, "friendId cannot be blank") });
const respondToFriendBodySchema = z.object({ response: z.enum(["accepted", "declined"]) });
const respondToFriendParamsSchema = z.object({ id: z.uuid() });
const blockSchema = z.object({ id: z.uuid().min(1, "userId cannot be blank") });
const unblockSchema = z.object({ id: z.uuid().min(1, "userId cannot be blank") });
const removeFriendSchema = z.object({ friendId: z.uuid().min(1, "friendId cannot be blank") });

export async function handlerRequestFriend(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = requestFriendSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");
	const { friendId } = body.data;

	if (userId === friendId) throw new BadRequestError("Cannot friend request yourself!");

	// call db
	const result = await requestFriendInDb(userId, friendId);

	logInfo("friend.requested", { userId, friendId });

	// return
	res.status(201).json(result);
}

export async function handlerRespondToFriendRequest(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = respondToFriendBodySchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	// validate params
	const params = respondToFriendParamsSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid params provided");

	// validate request
	if (userId === params.data.id) throw new BadRequestError("Cannot respond to a friend request from yourself!");

	// call db
	const result = await respondToFriendRequestInDb(userId, params.data.id, body.data.response);

	logInfo("friend.request_responded", { userId, friendId: params.data.id, response: body.data.response });

	// return
	res.status(200).json(result);
}

export async function handlerBlockUser(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate params
	const params = blockSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid request params");

	// validate request
	if (userId === params.data.id) throw new BadRequestError("Cannot block yourself!");

	// call db
	const result = await blockUserInDb(userId, params.data.id);

	logInfo("user.blocked", { userId, blockedUserId: params.data.id });

	// return
	res.status(200).json(result);
}

export async function handlerUnblockUser(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate params
	const params = unblockSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid request params");

	// validate request
	if (userId === params.data.id) throw new BadRequestError("Cannot unblock yourself!");

	// call db
	const result = await unblockUserInDb(userId, params.data.id);

	logInfo("user.unblocked", { userId, unblockedUserId: params.data.id });

	// return
	res.status(200).json(result);
}

export async function handlerRemoveFriend(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = removeFriendSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");
	const { friendId } = body.data;

	if (userId === friendId) throw new BadRequestError("Cannot remove yourself!");

	// call db
	const result = await removeFriendInDb(userId, friendId);

	logInfo("friend.removed", { userId, friendId });

	// return
	res.status(200).json(result);
}

export async function handlerGetFriends(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db
	const result = await getFriendsInDb(userId);

	// return
	res.status(200).json(result);
}

export async function handlerGetFriendsOverlap(req: Request, res: Response) {
	// validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db for user
	const userSchedule = await getScheduleByUserFromDb(userId);
	if (userSchedule === undefined) throw new Error("Failed to retrieve user schedules");
	if (userSchedule.length === 0) return res.status(200).json([]);

	// call db for friends
	const friendSchedules = await getAllFriendSchedules(userId);
	if (friendSchedules == undefined) throw new Error("Failed to retrieve friends schedules");
	if (friendSchedules.length === 0) return res.status(200).json([]);

	// find overlaps
	const overlapsInDateRange: FriendScheduleWithTimezone[] = [];

	//loop through all combinations of user and friends schedules - all should be in utc time
	for (const user of userSchedule) {
		for (const friend of friendSchedules) {
			const overlap = getTimeOverlapRepeating(
				{ start: user.startTime, end: user.endTime, repeatType: user.repeatType },
				{ start: friend.startTime, end: friend.endTime, repeatType: friend.repeatType },
			);

			if (overlap === undefined) continue;

			overlapsInDateRange.push({
				id: friend.id,
				userId: friend.userId,
				startTime: overlap.start,
				endTime: overlap.end,
				repeatType: overlap.repeatType,
				createdAt: friend.createdAt,
				updatedAt: friend.updatedAt,
				schedules: [user.id, friend.id],
				timezone: user.timezone,
			});
		}
	}

	// return
	res.status(200).send(overlapsInDateRange);
}

//query params should be 31 or less days and must be in the right order
//also complicated start and end schema is so that arrays cannot be passed in
export const overlapQuerySchema = z
	.object({ start: z.iso.datetime({ offset: true }).pipe(z.coerce.date()), end: z.iso.datetime({ offset: true }).pipe(z.coerce.date()) })
	.refine((data) => data.end > data.start, { message: "End date must be after start date", path: ["end"] })
	.refine(({ start, end }) => differenceInDays(end, start) <= 31, { message: "Date range cannot exceed 31 days", path: ["end"] });

type InstanceUserData = {
	id: string;
	name: string;
	timezone: string;
	avatarUrl: string | null;
	bio: string | null;
};

//main type
export type ScheduleInstance = {
	id: string;
	scheduleId: string;
	start: Date;
	end: Date;
	user: InstanceUserData;
	overlaps: {
		id: string;
		start: Date;
		end: Date;
		user: InstanceUserData;
	}[];
};

//builds an id for the instance
function getInstanceId(scheduleId: string, startTime: Date) {
	return `${scheduleId}:${startTime.toISOString()}`;
}

//does not care about timezone
//builds out instances for the frontend to display
export async function handlerGetScheduleInstances(req: Request, res: Response) {
	// validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//query params for the start and end date
	const result = overlapQuerySchema.safeParse(req.query);
	if (!result.success) throw new BadRequestError("Invalid query parameters: " + result.error.message);
	const { start: rangeStart, end: rangeEnd } = result.data;

	// call db for user
	const userSchedule = await getUserSchedulesFromDb(userId);
	if (userSchedule === undefined) throw new Error("Failed to retrieve user schedules");
	if (userSchedule.length === 0) return res.status(200).json([]);

	// call db for friends
	const friendSchedules = await getAllFriendSchedules(userId);
	if (friendSchedules == undefined) throw new Error("Failed to retrieve friends schedules");
	if (friendSchedules.length === 0) return res.status(200).json([]);

	// build instances
	const userInstances = buildInstances(userSchedule, rangeStart, rangeEnd);
	const friendInstances = buildInstances(friendSchedules, rangeStart, rangeEnd);

	//find overlaps
	for (const userInst of userInstances) {
		for (const friendInst of friendInstances) {
			const overlap = getOverlap(userInst, friendInst);
			if (!overlap) continue;

			//add to the overlaps
			userInst.overlaps.push({
				id: friendInst.id,
				start: overlap.start,
				end: overlap.end,
				user: friendInst.user,
			});
		}
	}

	// return
	res.status(200).send(userInstances);
}

function buildInstances(schedules: FriendScheduleRecord[], rangeStart: Date, rangeEnd: Date): ScheduleInstance[] {
	const instances: ScheduleInstance[] = [];
	//loop through user schedule and build the instances
	for (const s of schedules) {
		if (s.startTime >= rangeEnd) continue;
		if (s.repeatType === "once") {
			if (s.endTime <= rangeStart) continue;
			//confirmed its within range
			instances.push({
				id: getInstanceId(s.id, s.startTime),
				scheduleId: s.id,
				start: s.startTime,
				end: s.endTime,
				user: s.user,
				overlaps: [],
			});
		} else if (s.repeatType === "weekly") {
			//used to find first occurance that lands in range
			let occurrenceStart = s.startTime;

			// move forward until we're near the requested range
			while (occurrenceStart <= rangeStart) occurrenceStart = addWeeks(occurrenceStart, 1);

			//inside range
			const duration = s.endTime.getTime() - s.startTime.getTime();
			while (occurrenceStart <= rangeEnd) {
				const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
				//add to array
				instances.push(createInstance(s, occurrenceStart, occurrenceEnd));
				occurrenceStart = addWeeks(occurrenceStart, 1);
			}
		} else if (s.repeatType === "daily") {
			//used to find first occurance that lands in range
			let occurrenceStart = s.startTime;

			// move forward until we're near the requested range
			while (occurrenceStart <= rangeStart) occurrenceStart = addDays(occurrenceStart, 1);

			//inside range
			const duration = s.endTime.getTime() - s.startTime.getTime();
			while (occurrenceStart <= rangeEnd) {
				const occurrenceEnd = new Date(occurrenceStart.getTime() + duration);
				//add to array
				instances.push(createInstance(s, occurrenceStart, occurrenceEnd));
				occurrenceStart = addDays(occurrenceStart, 1);
			}
		}
	}
	return instances;
}

//gets latest start and earliest end and compares to see if start is after the end
function getOverlap(a: ScheduleInstance, b: ScheduleInstance) {
	const start = new Date(Math.max(a.start.getTime(), b.start.getTime()));
	const end = new Date(Math.min(a.end.getTime(), b.end.getTime()));

	if (start >= end) return undefined;

	return {
		start,
		end,
	};
}

function createInstance(s: FriendScheduleRecord, start: Date, end: Date): ScheduleInstance {
	return {
		id: getInstanceId(s.id, s.startTime),
		scheduleId: s.id,
		start: s.startTime,
		end: s.endTime,
		user: s.user,
		overlaps: [],
	};
}
