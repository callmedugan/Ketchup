import { isValidRepeatType, Schedule, ScheduleRepeatType } from "./db/schema";
import express, { Request, Response, NextFunction } from "express";
import {
	BadRequestError,
	NotFoundError,
	ForbiddenError,
	UnauthorizedError,
	ConflictError,
} from "./error";
import {
	addScheduleToDb,
	addUserToDb,
	createRefreshToken,
	deleteAll as deleteDb,
	getAllUsersFromDb,
	getRefreshTokenUser,
	getScheduleByUserFromDb,
	getUserByEmail,
	requestFriendInDb,
	revokeToken,
} from "./db/queries";
import { checkPasswordHash, hashPassword, makeJWT, makeRefreshToken, validateJWT } from "./db/auth";

export function handlerApp(req: Request, res: Response) {
	return res.status(200).json({ message: "Hello from TypeScript & Express!" });
}

export async function handlerCreateUser(req: Request, res: Response) {
	//define shape
	type Shape = {
		email: string;
		name: string;
		password: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!parse.email || parse.email === "") throw new BadRequestError("Email cannot be blank");
	if (!parse.name || parse.name === "") throw new BadRequestError("Name cannot be blank");
	if (!parse.password || parse.password === "")
		throw new BadRequestError("Password cannot be blank");

	//validate password
	if (parse.password.length < 6) throw new BadRequestError("Password must be 6 characters or more");
	if (parse.password.length > 128)
		throw new BadRequestError("Password must be 128 characters or less");
	const hashedPassword = await hashPassword(parse.password);

	//validate email
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parse.email))
		throw new BadRequestError("Email is invalid format");
	const cleanEmail = parse.email.trim().toLowerCase();
	const userExists = await getUserByEmail(cleanEmail);
	if (userExists != undefined) throw new ConflictError("Email has an existing account");

	//result
	const result = await addUserToDb({
		name: parse.name,
		email: cleanEmail,
		hashedPassword: hashedPassword,
	});
	if (result == undefined) throw new Error("Something went wrong creating the user");

	//console.log("Created new user: ", result);

	//return 201 status with password omitted
	res.status(201).send({
		id: result.id,
		name: result.name,
		email: result.email,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
	});
}

export async function handlerLogin(req: Request, res: Response) {
	//define shape
	type Shape = {
		email: string;
		password: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!parse.email || parse.email === "") throw new BadRequestError("Email cannot be blank");
	if (!parse.password || parse.password === "")
		throw new BadRequestError("Password cannot be blank");

	//hash provided password
	const user = await getUserByEmail(parse.email);
	if (user == undefined || user.hashedPassword == undefined || user.id == undefined) {
		throw new UnauthorizedError("Incorrect email or password");
	}

	//auth
	let isAuth = false;
	try {
		isAuth = await checkPasswordHash(parse.password, user.hashedPassword);
	} catch (err) {
		throw new UnauthorizedError("Incorrect email or password");
	}
	if (!isAuth) throw new UnauthorizedError("Incorrect email or password");

	//success
	const token = makeJWT(user.id, process.env.JWT_SECRET!);
	const refreshTokenString = makeRefreshToken();
	const expiration = new Date();
	expiration.setDate(expiration.getDate() + 3600);
	const refreshToken = await createRefreshToken({
		token: refreshTokenString,
		userId: user.id,
		expiresAt: expiration,
	});
	if (refreshToken == undefined) throw new Error("Failed to create refresh token on login");

	//return
	res.status(200).send({
		id: user.id,
		email: user.email,
		name: user.name,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		token: token,
		refreshToken: refreshTokenString,
	});
}

export async function handlerRefresh(req: Request, res: Response) {
	//get bearer token from auth header in req
	const header = req.get("Authorization");
	const token = header && header.split(" ")[1];
	if (token == undefined)
		throw new UnauthorizedError("failed to get bearer token from req headers");

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

///need to add filters - mainly used for finding friends?
export async function handlerGetUsers(req: Request, res: Response) {
	//console.log(await db.select());
	const users = await getAllUsersFromDb();
	if (users == undefined)
		throw new Error("something went wrong with getting user or user does not exist");

	const result = [];
	//build result structure
	for (const u of users) {
		result.push({
			id: u.id,
			createdAt: u.createdAt,
			updatedAt: u.updatedAt,
			name: u.name,
			email: u.email,
			hashPassword: u.hashedPassword,
		});
	}
	//success
	res.status(200);
	res.send(result);
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
	if (!userId || userId === "") throw new BadRequestError("userId cannot be blank");
	if (!parse.startTime) throw new BadRequestError("Start Time cannot be blank");
	if (!parse.endTime) throw new BadRequestError("End Time cannot be blank");
	if (!isValidRepeatType(parse.repeatType)) throw new BadRequestError("Invalid repeat type");

	//result
	const result = await addScheduleToDb({
		userId: userId,
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

export async function handlerGetScheduleByUserId(req: Request, res: Response) {
	//validated user
	const userId = req.userId;

	//get user id from passed param
	const lookupUserId = req.params.userId;
	if (!lookupUserId || typeof lookupUserId !== "string")
		throw new BadRequestError("userId cannot be blank");

	//call db
	const schedules = await getScheduleByUserFromDb(lookupUserId);
	if (schedules == undefined)
		throw new Error("user has no schedule or failed to retrieve schedules");

	const result = [];
	//build result structure
	for (const s of schedules) {
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
	if (user1Schedules == undefined)
		throw new Error("user 1 has no schedule or failed to retrieve schedules");
	const user2Schedules = await getScheduleByUserFromDb(parse.userId2);
	if (user2Schedules == undefined)
		throw new Error("user 2 has no schedule or failed to retrieve schedules");

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

	//define shape
	type Shape = {
		friendId: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!userId || userId === "") throw new BadRequestError("userId cannot be blank");
	if (!parse.friendId || parse.friendId === "")
		throw new BadRequestError("friend id cannot be blank");

	//result
	const result = await requestFriendInDb(userId, parse.friendId);
	if (result == undefined) throw new Error("failed to request friend");

	res.status(201).send({
		userId: result.userId,
		friendId: result.friendId,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
		status: result.status,
	});
}

////////////////////////////////////////////////////////////////////////////////////////////
//Other
////////////////////////////////////////////////////////////////////////////////////////////
export function getScheduleOverlap(first: Schedule, second: Schedule): Schedule | undefined {
	//check for overlap first though because schedules are stored as an array of dates that are all the same time
	//so if there is no overlap, then no need to check the dates
	//looking for start to be less than end if there is an overlap
	const timeOverlap = getTimeOverlap(
		{ start: first.startTime, end: first.endTime },
		{ start: second.startTime, end: second.endTime },
	);
	if (timeOverlap == undefined) return undefined;

	const dateOverlaps: string[] = [];

	//need to correct for timezones so using utc
	//loop through both set of dates and see if any dates match
	// for (const f of first.dates) {
	// 	const firstDate = new Date(f);
	// 	if (isNaN(firstDate.getTime())) continue;

	// 	for (const s of second.dates) {
	// 		const secondDate = new Date(f);
	// 		if (isNaN(secondDate.getTime())) continue;

	// 		// if dates are the same utc dates add to the overlap array
	// 		if (
	// 			firstDate.getUTCFullYear() === secondDate.getUTCFullYear() &&
	// 			firstDate.getUTCMonth() === secondDate.getUTCMonth() &&
	// 			firstDate.getUTCDate() === secondDate.getUTCDate()
	// 		) {
	// 			dateOverlaps.push(firstDate.toISOString());
	// 		}
	// 	}
	// }

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
