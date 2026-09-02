import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../error.js";
import z from "zod";
import {
	blockUserInDb,
	FriendScheduleRecord,
	getAllFriendSchedules,
	getFriendsInDb,
	getScheduleByUserFromDb,
	removeFriendInDb,
	requestFriendInDb,
	respondToFriendRequestInDb,
	unblockUserInDb,
} from "../db/queries.js";
import { logInfo } from "./logging.js";
import { getTimeOverlapRepeating } from "./schedules.js";

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
	const overlapsInDateRange: FriendScheduleRecord[] = [];

	for (const userAvailability of userSchedule) {
		for (const friendAvailability of friendSchedules) {
			const overlap = getTimeOverlapRepeating(
				{ start: userAvailability.startTime, end: userAvailability.endTime, repeatType: userAvailability.repeatType, timezone: userAvailability.timezone },
				{
					start: friendAvailability.startTime,
					end: friendAvailability.endTime,
					repeatType: friendAvailability.repeatType,
					timezone: friendAvailability.timezone,
				},
			);

			if (overlap == undefined) continue;

			overlapsInDateRange.push({
				id: friendAvailability.id,
				userId: friendAvailability.userId,
				startTime: overlap.start,
				endTime: overlap.end,
				repeatType: overlap.repeatType,
				createdAt: friendAvailability.createdAt,
				updatedAt: friendAvailability.updatedAt,
				schedules: [userAvailability.id, friendAvailability.id],
				timezone: userAvailability.timezone,
			});
		}
	}

	// return
	res.status(200).send(overlapsInDateRange);
}
