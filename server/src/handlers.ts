import { ScheduleRecord, ScheduleRepeatType, scheduleRepeatTypeRank, UserLogin } from "./db/schema.js";
import { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from "./error.js";
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
	searchForUsersInDb,
	getFriendsInDb,
	getPlansFromDb,
	getRefreshTokenUser,
	getScheduleByUserFromDb,
	getUserByEmail,
	getUserById,
	requestFriendInDb,
	respondToPlanInDb,
	revokeToken,
	respondToFriendRequestInDb,
	removeFriendInDb,
	updateUserProfileInDb,
	blockUserInDb,
	unblockUserInDb,
} from "./db/queries.js";
import { checkPasswordHash, hashPassword, makeJWT, makeRefreshToken } from "./db/auth.js";
import {
	COMMENTS_MAX_LENGTH,
	EMAIL_MAX_LENGTH,
	LOCATION_MAX_LENGTH,
	PASSWORD_MAX_LENGTH,
	PASSWORD_MIN_LENGTH,
	REFRESH_TOKEN_EXPIRATION_DAYS,
	TITLE_MAX_LENGTH,
} from "./data/constants.js";
import { format, getDay, getHours, getMinutes, set } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { z } from "zod";

/* ========================================================================= */
//                        logging
/* ========================================================================= */

//#region logging

type LogFields = Record<string, string | number | boolean | null | undefined>;

function formatLogFields(fields: LogFields) {
	return Object.entries(fields)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
		.join(" ");
}

function logInfo(event: string, fields: LogFields = {}) {
	const details = formatLogFields(fields);
	console.info(`[${new Date().toISOString()}] [INFO] ${event}${details ? ` ${details}` : ""}`);
}

function logWarn(event: string, fields: LogFields = {}) {
	const details = formatLogFields(fields);
	console.warn(`[${new Date().toISOString()}] [WARN] ${event}${details ? ` ${details}` : ""}`);
}

function logError(event: string, error: Error, fields: LogFields = {}) {
	const details = formatLogFields(fields);
	console.error(`[${new Date().toISOString()}] [ERROR] ${event}${details ? ` ${details}` : ""}`);
	console.error(error.stack ?? error.message);
}

export function handlerRequestLogger(req: Request, res: Response, next: NextFunction) {
	const startedAt = Date.now();

	res.on("finish", () => {
		logInfo("request.completed", { method: req.method, path: req.originalUrl, status: res.statusCode, durationMs: Date.now() - startedAt, userId: req.userId });
	});

	next();
}

//#endregion

/* ========================================================================= */
//                        auth
/* ========================================================================= */

//#region auth

const createUserSchema = z.object({
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
	timezone: z.string().trim().min(1, "Timezone cannot be blank"),
	avatarUrl: z.string().trim().min(1, "Avatar url cannot be blank"),
});

const loginSchema = z.object({
	email: z.email("Email is invalid format").trim().toLowerCase().min(1, "Email cannot be blank"),
	password: z.string().min(1, "Password cannot be blank"),
});

export async function handlerCreateUser(req: Request, res: Response) {
	// validate body
	const body = createUserSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { email, name, password, timezone, avatarUrl } = body.data;

	// check if email already exists
	const userExists = await getUserByEmail(email);
	if (userExists !== undefined) throw new ConflictError("Email has an existing account");

	// hash password
	const hashedPassword = await hashPassword(password);

	// create user
	const result = await addUserToDb({ name, email, hashedPassword, timezone, avatarUrl });
	if (result === undefined) throw new Error("Something went wrong creating the user");

	logInfo("user.created", { userId: result.id });

	// return with password omitted
	res.status(201).json({ id: result.id, name: result.name, email: result.email, createdAt: result.createdAt, updatedAt: result.updatedAt });
}

export async function handlerLogin(req: Request, res: Response) {
	// validate body
	const body = loginSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { email, password } = body.data;

	// get user
	const user = await getUserByEmail(email);
	if (user === undefined || user.hashedPassword === undefined || user.id === undefined) {
		throw new UnauthorizedError("Incorrect email or password");
	}

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

	const refreshToken = await createRefreshToken({ token: refreshTokenString, userId: user.id, expiresAt: expiration });
	if (refreshToken === undefined) throw new Error("Failed to create refresh token on login");

	const result: UserLogin = {
		id: user.id,
		email: user.email,
		name: user.name,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		token,
		refreshToken: refreshTokenString,
		bio: user.bio,
		timezone: user.timezone,
		avatarUrl: user.avatarUrl,
	};

	logInfo("auth.login_succeeded", { userId: user.id });

	// return
	res.status(200).json(result);
}

export async function handlerRefresh(req: Request, res: Response) {
	// validate token
	const header = req.get("Authorization");
	const token = header && header.split(" ")[1];
	if (token == undefined) throw new UnauthorizedError("failed to get bearer token from req headers");

	// get refresh token user
	const tokenUser = await getRefreshTokenUser(token);
	if (tokenUser == undefined) throw new UnauthorizedError("token is invalid or expired");

	// create access token
	const newTokenString = makeJWT(tokenUser, process.env.JWT_SECRET!);

	// return
	res.status(200).send({ token: newTokenString });
}

export async function handlerLogout(req: Request, res: Response) {
	// validate token
	const token = req.token;
	if (token == undefined) throw new BadRequestError("Failed to get token from header to logout");

	// revoke refresh token
	const revoke = await revokeToken(token);
	if (!revoke) throw new Error("User was not logged in - no refresh token exists");

	logInfo("auth.logout_succeeded");

	// return
	res.status(200).send();
}

//#endregion

/* ========================================================================= */
//                        users
/* ========================================================================= */

//#region users

const userSearchSchema = z.object({ search: z.string().trim().min(1, "Search is required") });

const updateUserSchema = z.object({ bio: z.string().trim().max(300), timezone: z.string().trim(), avatarUrl: z.string().trim() });

export async function handlerSearchForUsers(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate query params
	const query = userSearchSchema.safeParse(req.query);
	if (!query.success) throw new BadRequestError("Invalid search query");

	// call db
	const users = await searchForUsersInDb(userId, query.data.search);

	// return
	res.status(200).json(users);
}

export async function handlerGetProfile(req: Request, res: Response) {
	// validated user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db
	const result = await getUserById(userId);
	if (result == undefined) throw new Error("something went wrong with getting user or user does not exist");

	// return only client-safe profile fields
	res
		.status(200)
		.json({
			id: result.id,
			email: result.email,
			name: result.name,
			bio: result.bio,
			timezone: result.timezone,
			avatarUrl: result.avatarUrl,
			createdAt: result.createdAt,
			updatedAt: result.updatedAt,
		});
}

export async function handlerUpdateUser(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = updateUserSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError("Invalid profile data");

	// call db
	const updatedUser = await updateUserProfileInDb(userId, body.data);

	logInfo("user.profile_updated", { userId });

	// return
	res.status(200).json(updatedUser);
}

//#endregion

/* ========================================================================= */
//                        schedules
/* ========================================================================= */

//#region schedules

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

//#endregion

/* ========================================================================= */
//                        plans
/* ========================================================================= */

//#region plans

const planParamsSchema = z.object({ id: z.uuid() });

const createPlanSchema = z.object({
	friendId: z.uuid().min(1, "friendId cannot be blank"),
	meetTime: z.coerce.date({ error: "meetTime must be a valid date" }),
	title: z.string().max(TITLE_MAX_LENGTH, "Title is too long"),
	comments: z.string().max(COMMENTS_MAX_LENGTH, "Comments are too long").optional(),
	location: z.string().max(LOCATION_MAX_LENGTH, "Location is too long").optional(),
});

const respondToPlanSchema = z.object({ response: z.enum(["accepted", "declined"]) });

export async function handlerGetPlans(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// call db
	const plans = await getPlansFromDb(userId);

	// return
	res.status(200).json(plans);
}

export async function handlerCreatePlans(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = createPlanSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { friendId, meetTime, title, comments, location } = body.data;

	// validate friendship
	const areFriends = await checkUsersAreFriendsFromDb(userId, friendId);
	if (!areFriends) throw new ForbiddenError("User is not friends with other user");

	// call db
	const result = await addPlanToDb({
		creatorId: userId,
		friendId,
		status: "pending",
		meetTime,
		title,
		comments: comments ?? "",
		location: location ?? "",
		lastUpdatedBy: userId,
	});

	if (result == undefined) throw new Error("something went wrong adding the plan to the db");

	logInfo("plan.created", { userId, planId: result.id, friendId });

	// return
	res.status(201).json(result);
}

export async function handlerRespondToPlan(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate body
	const body = respondToPlanSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	// validate params
	const params = planParamsSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid params provided");

	// call db
	const planResponse = await respondToPlanInDb(userId, params.data.id, body.data.response);
	if (!planResponse) throw new NotFoundError("Failed to respond to plan");

	logInfo("plan.responded", { userId, planId: params.data.id, response: body.data.response });

	// return
	res.status(200).json(planResponse);
}

export async function handlerCancelPlan(req: Request, res: Response) {
	// validate user
	const userId = req.userId;
	if (!userId) throw new UnauthorizedError("User not authenticated");

	// validate params
	const params = planParamsSchema.safeParse(req.params);
	if (!params.success) throw new BadRequestError(params.error.issues[0]?.message ?? "Invalid params provided");

	// call db
	const cancelledPlan = await cancelPlanInDb(userId, params.data.id);
	if (!cancelledPlan) throw new NotFoundError("Failed to cancel plan");

	logInfo("plan.cancelled", { userId, planId: params.data.id });

	// return
	res.status(200).json(cancelledPlan);
}

//#endregion

/* ========================================================================= */
//                        friends
/* ========================================================================= */

//#region friends

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

//#endregion

/* ========================================================================= */
//                        error / dev
/* ========================================================================= */

//#region error / dev

export function handlerError(err: Error, req: Request, res: Response, next: NextFunction) {
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

	const fields = { method: req.method, path: req.originalUrl, status, userId: req.userId, error: err.name, message: err.message };

	if (status >= 500) {
		logError("request.failed", err, fields);
	} else {
		logWarn("request.rejected", fields);
	}

	res.status(status).json({ error: message });
}

export async function handlerReset(req: Request, res: Response) {
	if (process.env.PLATFORM !== "dev") {
		logWarn("database.reset_rejected", { platform: process.env.PLATFORM });
		res.status(403).send();
	} else {
		await deleteDb();
		logWarn("database.reset", { platform: process.env.PLATFORM });
		res.status(200).send("Reset complete");
	}
}

//#endregion

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

function getTimeOverlapRepeating(a: TimeRangeRepeating, b: TimeRangeRepeating): TimeRangeRepeating | undefined {
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
