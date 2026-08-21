import { isValidRepeatType, Schedule, ScheduleRepeatType } from "./db/schema";
import { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from "./error";
import {
	addPlanToDb,
	addScheduleToDb,
	addUserToDb,
	cancelPlanInDb,
	checkUsersAreFriendsFromDb,
	createRefreshToken,
	deleteDb,
	deleteScheduleFromDb,
	FriendScheduleRecord,
	getAllFriendSchedules,
	getAllUsersFromDb,
	getFriendsInDb,
	getPlansFromDb,
	getRefreshTokenUser,
	getScheduleByUserFromDb,
	getUserByEmail,
	getUserById,
	requestFriendInDb,
	respondToPlanInDb,
	revokeToken,
} from "./db/queries";
import { checkPasswordHash, hashPassword, makeJWT, makeRefreshToken } from "./db/auth";
import {
	COMMENTS_MAX_LENGTH,
	EMAIL_MAX_LENGTH,
	LOCATION_MAX_LENGTH,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	REFRESH_TOKEN_EXPIRATION_DAYS,
	TITLE_MAX_LENGTH,
} from "./data/constants";
import { format, getDay, getHours, getMinutes, isSameDay, set } from "date-fns";
import { z } from "zod";

export function handlerApp(req: Request, res: Response) {
	return res.status(200).json({ message: "Hello from TypeScript & Express!" });
}

export async function handlerCreateUser(req: Request, res: Response) {
	// create schema
	const schema = z.object({
		email: z
			.email("Email is invalid format")
			.trim()
			.toLowerCase()
			.min(1, "Email cannot be blank")
			.max(EMAIL_MAX_LENGTH, `Email must be ${EMAIL_MAX_LENGTH} characters or less`),
		name: z.string().trim().min(1, "Name cannot be blank"),
		password: z
			.string()
			.min(PASSWORD_MIN_LENGTH, `Password must be ${PASSWORD_MIN_LENGTH} characters or more`)
			.max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or less`),
	});

	// validate body
	const body = schema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");
	const { email, name, password } = body.data;

	// check if email already exists
	const userExists = await getUserByEmail(email);
	if (userExists !== undefined) throw new ConflictError("Email has an existing account");

	// hash password
	const hashedPassword = await hashPassword(password);

	// create user
	const result = await addUserToDb({
		name,
		email,
		hashedPassword,
	});
	if (result === undefined) throw new Error("Something went wrong creating the user");

	// return 201 with password omitted
	res.status(201).json({
		id: result.id,
		name: result.name,
		email: result.email,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
	});
}

export async function handlerLogin(req: Request, res: Response) {
	// create schema
	const schema = z.object({
		email: z.email("Email is invalid format").trim().toLowerCase().min(1, "Email cannot be blank"),
		password: z.string().min(1, "Password cannot be blank"),
	});

	// validate body
	const body = schema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");
	const { email, password } = body.data;

	// get user
	const user = await getUserByEmail(email);
	if (user === undefined || user.hashedPassword === undefined || user.id === undefined) throw new UnauthorizedError("Incorrect email or password");

	// authenticate password
	let isAuth = false;

	try {
		isAuth = await checkPasswordHash(password, user.hashedPassword);
	} catch {
		throw new UnauthorizedError("Incorrect email or password");
	}

	if (!isAuth) throw new UnauthorizedError("Incorrect email or password");

	// create access token
	const token = makeJWT(user.id, process.env.JWT_SECRET!);

	// create refresh token
	const refreshTokenString = makeRefreshToken();
	const expiration = new Date();
	expiration.setDate(expiration.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);
	const refreshToken = await createRefreshToken({
		token: refreshTokenString,
		userId: user.id,
		expiresAt: expiration,
	});
	if (refreshToken === undefined) throw new Error("Failed to create refresh token on login");

	// return
	res.status(200).json({
		id: user.id,
		email: user.email,
		name: user.name,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		token,
		refreshToken: refreshTokenString,
		bio: user.bio,
	});
}

export async function handlerRefresh(req: Request, res: Response) {
	//get bearer token from auth header in req
	const header = req.get("Authorization");
	const token = header && header.split(" ")[1];
	if (token == undefined) throw new UnauthorizedError("failed to get bearer token from req headers");

	//get token that was provided and look up the refresh token to see if valid and not expired
	const tokenUser = await getRefreshTokenUser(token);
	if (tokenUser == undefined) throw new UnauthorizedError("token is invalid or expired");

	//success - create and issue a new jwt token
	const newTokenString = makeJWT(tokenUser, process.env.JWT_SECRET!);

	//return
	res.status(200).send({
		token: newTokenString,
	});
}

export async function handlerLogout(req: Request, res: Response) {
	//validated token from middleware
	const token = req.token;

	if (token == undefined) throw new BadRequestError("Failed to get token from header to logout");

	//get token that was provided and try to revoke the refresh token
	const revoke = await revokeToken(token);
	if (!revoke) throw new Error("User was not logged in - no refresh token exists");

	//return success
	res.status(200).send();
}

///need to add query params
//removing sensitive info
export async function handlerGetUsers(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//call db
	const users = await getAllUsersFromDb(userId);
	if (users == undefined) throw new Error("something went wrong with getting user or user does not exist");

	//return entire object
	res.status(200).json(users);
}

export async function handlerGetProfile(req: Request, res: Response) {
	//validated user
	const userId = req.userId;

	const result = await getUserById(userId!);
	if (result == undefined) throw new Error("something went wrong with getting user or user does not exist");

	//success
	res.status(200).send({
		id: result.id,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
		name: result.name,
		email: result.email,
	});
}

export async function handlerCreateSchedule(req: Request, res: Response) {
	//validated user
	const userId = req.userId;

	//define shape
	type Shape = {
		startTime: Date;
		endTime: Date;
		repeatType: ScheduleRepeatType;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!parse.startTime) throw new BadRequestError("Start Time cannot be blank");
	if (!parse.endTime) throw new BadRequestError("End Time cannot be blank");
	if (!isValidRepeatType(parse.repeatType)) throw new BadRequestError("Invalid repeat type");

	//pull user schedules and see if new one would clash
	const userSchedules = await getScheduleByUserFromDb(userId!);

	for (const s of userSchedules) {
		const overlap = getTimeOverlapRepeating(
			{ start: s.startTime, end: s.endTime, repeatType: s.repeatType },
			{ start: parse.startTime, end: parse.endTime, repeatType: parse.repeatType },
		);

		//overlap found
		if (overlap !== undefined)
			throw new BadRequestError(
				`This availability overlaps your existing schedule on ${format(s.startTime, "Pp")} to ${format(s.endTime, "h:mm a")}.`,
			);
	}

	//result
	const result = await addScheduleToDb({
		userId: userId!,
		repeatType: parse.repeatType,
		startTime: new Date(parse.startTime),
		endTime: new Date(parse.endTime),
	});
	if (result == undefined) throw new Error("something went wrong adding the schedule to the db");

	//return 201 status with password omitted
	res.status(201).send({
		id: result.id,
		repeatType: result.repeatType,
		startTime: result.startTime,
		endTime: result.endTime,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
		userId: result.userId,
	});
}

export async function handlerDeleteSchedule(req: Request, res: Response) {
	//validated user
	const userId = req.userId;

	//define shape
	type Shape = {
		id: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!parse.id || parse.id === "") throw new BadRequestError("Id missing or blank");

	//result - better to call a 404 if user is not owner so that it does not reveal if it exists to someone not authorized
	const result = await deleteScheduleFromDb(userId!, parse.id);
	if (result == undefined) throw new NotFoundError("Schedule not found");

	//return 204 for successful delete
	res.status(204).send({
		id: result.id,
		repeatType: result.repeatType,
		startTime: result.startTime,
		endTime: result.endTime,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
		userId: result.userId,
	});
}

export async function handlerGetSchedules(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//call db
	const result = await getScheduleByUserFromDb(userId);

	//return 200 status with data
	res.status(200).json(result);
}

export async function handlerCompareUsersSchedules(req: Request, res: Response) {
	// compare 2 users
	//validate user is auth first - will throw if failed auth
	const userId1 = req.userId;

	//define shape
	type Shape = {
		userId2: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//get user id from passed param
	if (!userId1 || userId1 === "") throw new BadRequestError("userId1 cannot be blank");
	if (!parse.userId2 || parse.userId2 === "") throw new BadRequestError("userId2 cannot be blank");

	//call db
	const user1Schedules = await getScheduleByUserFromDb(userId1);
	if (user1Schedules == undefined) throw new Error("user 1 has no schedule or failed to retrieve schedules");
	const user2Schedules = await getScheduleByUserFromDb(parse.userId2);
	if (user2Schedules == undefined) throw new Error("user 2 has no schedule or failed to retrieve schedules");

	const allOverlaps: Schedule[] = [];

	//loop through all schedule combinations and find overlaps
	for (const a of user1Schedules) {
		for (const b of user2Schedules) {
			const overlap = getScheduleOverlap(a, b);
			if (overlap != undefined) allOverlaps.push(overlap);
		}
	}

	const result = [];
	//build result structure
	for (const s of allOverlaps) {
		result.push({
			id: s.id,
			createdAt: s.createdAt,
			updatedAt: s.updatedAt,
			repeatType: s.repeatType,
			userId: s.userId,
			startTime: s.startTime,
			endTime: s.endTime,
		});
	}

	//return 200 status with data
	res.status(200).send(result);
}

/* ========================================================================= */
//                        plans
/* ========================================================================= */

//used for routes with planId param
const planParamsSchema = z.object({
	id: z.uuid(),
});

export async function handlerGetPlans(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//call db
	const plans = await getPlansFromDb(userId);

	//return entire object
	res.status(200).json(plans);
}

export async function handlerCreatePlans(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//create schema
	const schema = z.object({
		friendId: z.string().min(1, "friendId cannot be blank"),
		meetTime: z.coerce.date({
			error: "meetTime must be a valid date",
		}),
		title: z.string().max(TITLE_MAX_LENGTH, "Title is too long"),
		comments: z.string().max(COMMENTS_MAX_LENGTH, "Comments are too long").optional(),
		location: z.string().max(LOCATION_MAX_LENGTH, "Location is too long").optional(),
	});

	//try to parse
	const body = schema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");
	const parse = body.data;

	//call db
	const areFriends = await checkUsersAreFriendsFromDb(userId!, parse.friendId);
	if (!areFriends) throw new UnauthorizedError("User is not friends with other user");

	const result = await addPlanToDb({
		creatorId: userId!,
		friendId: parse.friendId,
		status: "pending",
		meetTime: parse.meetTime,
		title: parse.title,
		comments: parse.comments ?? "",
		location: parse.location ?? "",
		lastUpdatedBy: userId,
	});

	if (result == undefined) throw new Error("something went wrong adding the plan to the db");

	//return 201 status with data
	res.status(201).json(result);
}

export async function handlerRespondToPlan(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//zod schema
	const bodySchema = z.object({
		response: z.enum(["accepted", "declined"]),
	});

	//try to parse
	const tryBody = bodySchema.safeParse(req.body);
	if (!tryBody.success) throw new BadRequestError(tryBody.error.issues[0]?.message ?? "Invalid request body");
	const tryParams = planParamsSchema.safeParse(req.params);
	if (!tryParams.success) throw new BadRequestError(tryParams.error.issues[0]?.message ?? "Invalid params provided");

	const body = tryBody.data;
	const params = tryParams.data;

	//call db
	const planResponse = await respondToPlanInDb(userId, params.id, body.response);
	if (!planResponse) throw new NotFoundError("Failed to respond to plan");

	//return 200 status with data
	res.status(200).json(planResponse);
}

export async function handlerCancelPlan(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	const tryParams = planParamsSchema.safeParse(req.params);
	if (!tryParams.success) throw new BadRequestError(tryParams.error.issues[0]?.message ?? "Invalid params provided");

	const params = tryParams.data;

	//call db
	const cancelledPlan = await cancelPlanInDb(userId, params.id);
	if (!cancelledPlan) throw new NotFoundError("Failed to cancel plan");

	//return 204 status with data
	res.status(204).json(cancelledPlan);
}

/* ========================================================================= */
//                        error/other
/* ========================================================================= */

export function handlerError(err: Error, req: Request, res: Response, next: NextFunction) {
	console.log(err.message);
	//default to 500
	let status = 500;
	let message = "Something went wrong on our end";
	if (err instanceof BadRequestError) {
		status = 400;
		message = err.message;
	} else if (err instanceof UnauthorizedError) {
		status = 401;
		message = err.message;
	} else if (err instanceof ForbiddenError) {
		status = 403;
		message = err.message;
	} else if (err instanceof NotFoundError) {
		status = 404;
		message = err.message;
	} else if (err instanceof ConflictError) {
		status = 409;
		message = err.message;
	}
	res.status(status).json({
		error: message,
	});
}

export async function handlerReset(req: Request, res: Response) {
	//res.set("Content-Type", "text/plain; charset=utf-8");
	if (process.env.PLATFORM !== "dev") {
		res.status(403);
	} else {
		await deleteDb();
		res.status(200).send("Reset complete");
	}
}
/* ========================================================================= */
//                        friends
/* ========================================================================= */

export async function handlerRequestFriend(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	const schema = z.object({
		friendId: z.string().min(1, "friendId cannot be blank"),
	});

	//try to parse
	const body = schema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");
	const parse = body.data;

	//handle the parsed data
	if (!userId || userId === "") throw new BadRequestError("userId cannot be blank");
	if (!parse.friendId || parse.friendId === "") throw new BadRequestError("friend id cannot be blank");

	if (userId === parse.friendId) throw new BadRequestError("Cannot friend request yourself!");

	//result
	const result = await requestFriendInDb(userId, parse.friendId);
	if (result === undefined) throw new Error("failed to request friend");

	res.status(201).json(result);
}

export async function handlerGetFriends(req: Request, res: Response) {
	//validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	//result
	const result = await getFriendsInDb(userId);

	res.status(200).json(result);
}

export async function handlerGetFriendsOverlap(req: Request, res: Response) {
	// //query params
	// const { start, end } = req.query;

	// //validate params
	// if (typeof start !== "string" || typeof end !== "string")
	// 	throw new BadRequestError("start and end query parameters are required");

	// const startDate = new Date(start);
	// const endDate = new Date(end);

	// if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()))
	// 	throw new BadRequestError("Invalid start or end date");

	//validate user is auth first - will throw if failed auth
	const userId = req.userId;

	//call db for user
	const userSchedule = await getScheduleByUserFromDb(userId!);
	if (userSchedule == undefined) throw new Error("User has no schedule or failed to retrieve schedules");

	//call for friends
	const friendSchedules = await getAllFriendSchedules(userId!);
	if (friendSchedules == undefined) throw new Error("User has no friends, friends have no schedules, or failed to retrieve friends schedules");

	//loop through all schedule combinations and find overlaps
	const overlapsInDateRange: FriendScheduleRecord[] = [];
	for (const a of userSchedule) {
		for (const b of friendSchedules) {
			//gets time range of overlap
			const overlap = getTimeOverlapRepeating(
				{ start: a.startTime, end: a.endTime, repeatType: a.repeatType },
				{ start: b.startTime, end: b.endTime, repeatType: b.repeatType },
			);

			//check
			if (overlap == undefined) continue;
			//check if between query range?
			//later

			overlapsInDateRange.push({
				id: b.id,
				userId: b.userId,
				startTime: overlap.start,
				endTime: overlap.end,
				repeatType: overlap.repeatType,
				createdAt: b.createdAt,
				updatedAt: b.updatedAt,
				friendId: b.friendId,
				friendName: b.friendName,
				userScheduleIdMatched: a.id,
			});
		}
	}

	//return 200 status with data
	res.status(200).send(overlapsInDateRange);
}

////////////////////////////////////////////////////////////////////////////////////////////
//Other
////////////////////////////////////////////////////////////////////////////////////////////
//#region other

export function getScheduleOverlap(first: Schedule, second: Schedule): Schedule | undefined {
	//check for overlap first though because schedules are stored as an array of dates that are all the same time
	//so if there is no overlap, then no need to check the dates
	//looking for start to be less than end if there is an overlap
	const timeOverlap = getTimeOverlap({ start: first.startTime, end: first.endTime }, { start: second.startTime, end: second.endTime });
	if (timeOverlap == undefined) return undefined;

	const dateOverlaps: string[] = [];

	//build result
	const overlap: Schedule = {
		repeatType: first.repeatType === second.repeatType ? first.repeatType : "once",
		startTime: timeOverlap.start,
		endTime: timeOverlap.end,
		userId: "null",
	};
	return overlap;
}

type TimeRange = {
	start: Date;
	end: Date;
};

function getTimeOverlap(a: TimeRange, b: TimeRange): TimeRange | undefined {
	const aStart = a.start.getTime();
	const aEnd = a.end.getTime();
	const bStart = b.start.getTime();
	const bEnd = b.end.getTime();

	if (isNaN(aStart) || isNaN(aEnd) || isNaN(bStart) || isNaN(bEnd)) return undefined;

	// find the latest start time and earliest end time
	const maxStart = Math.max(aStart, bStart);
	const minEnd = Math.min(aEnd, bEnd);

	// check if the start happens before the end
	if (maxStart < minEnd) {
		const result: TimeRange = {
			start: new Date(maxStart),
			end: new Date(minEnd),
		};
		return result;
	}

	return undefined;
}

type TimeRangeRepeating = {
	start: Date;
	end: Date;
	repeatType: ScheduleRepeatType;
};

function _dateToMinutes(date: Date) {
	return getHours(date) * 60 + getMinutes(date);
}
function _minutesToDate(minutes: number, date: Date) {
	return set(date, {
		hours: Math.floor(minutes / 60),
		minutes: minutes % 60,
		seconds: 0,
		milliseconds: 0,
	});
}

function getTimeOverlapRepeating(a: TimeRangeRepeating, b: TimeRangeRepeating): TimeRangeRepeating | undefined {
	//check to see if repeat types can overlap - only need to make sure once and weekly times
	//fall on the same day of the week to be eligible
	//daily for either will automatically be eligible
	if (a.repeatType !== "daily" && b.repeatType !== "daily" && getDay(a.start) !== getDay(b.start)) {
		return undefined;
	}

	//validate date strings
	const aStart = _dateToMinutes(a.start);
	const aEnd = _dateToMinutes(a.end);
	const bStart = _dateToMinutes(b.start);
	const bEnd = _dateToMinutes(b.end);

	// find the latest start time and earliest end time
	const maxStart = Math.max(aStart, bStart);
	const minEnd = Math.min(aEnd, bEnd);

	// check if the start happens before the end
	if (maxStart < minEnd) {
		//get repeat type as the "lowest" repeat of either
		let repeat: ScheduleRepeatType = "once";
		if (a.repeatType === "daily" || b.repeatType === "daily") repeat = "daily";
		else if (a.repeatType === "weekly" || b.repeatType === "weekly") repeat = "weekly";
		//result
		const result: TimeRangeRepeating = {
			start: _minutesToDate(maxStart, new Date()),
			end: _minutesToDate(minEnd, new Date()),
			repeatType: repeat,
		};
		return result;
	}

	return undefined;
}
//#endregion
