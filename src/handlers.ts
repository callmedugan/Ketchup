import { isValidRepeatType, Schedule, ScheduleRepeatType } from "./db/schema";
import express, { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError } from "./error";
import {
	addScheduleToDb,
	addUserToDb,
	deleteAll as deleteUsersAndSchedulesDb,
	getAllUsersFromDb,
	getScheduleByUserFromDb,
} from "./db/queries";
import { getBearerTokenFromReq, hashPassword, validateJWT } from "./db/auth";

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

	//result
	const hashedPassword = await hashPassword(parse.password);

	//result
	const result = await addUserToDb({
		name: parse.name,
		email: parse.email,
		hashedPassword: hashedPassword,
	});
	if (result == undefined) throw new Error("something went wrong creating the user");

	//return 201 status with password omitted
	res.status(201).send({
		id: result.id,
		name: result.name,
		email: result.email,
		createdAt: result.createdAt,
		updatedAt: result.updatedAt,
	});
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
	//validate user is auth first - will throw if failed auth
	//const token = getBearerTokenFromReq(req);
	//const validatedUserId = validateJWT(token, process.env.JWT_SECRET!);

	//define shape
	type Shape = {
		userId: string;
		startTime: Date;
		endTime: Date;
		repeatType: ScheduleRepeatType;
	};

	//get parsed body
	const parse: Shape = req.body;

	//handle the parsed data
	if (!parse.userId || parse.userId === "") throw new BadRequestError("userId cannot be blank");
	if (!parse.startTime) throw new BadRequestError("Start Time cannot be blank");
	if (!parse.endTime) throw new BadRequestError("End Time cannot be blank");
	if (!isValidRepeatType(parse.repeatType)) throw new BadRequestError("Invalid repeat type");

	//result
	const result = await addScheduleToDb({
		userId: parse.userId,
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
	//get user id from passed param
	const userId = req.params.userId;
	if (!userId || typeof userId !== "string") throw new BadRequestError("userId cannot be blank");

	//call db
	const schedules = await getScheduleByUserFromDb(userId);
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
	//const token = getBearerTokenFromReq(req);
	//const validatedUserId = validateJWT(token, process.env.JWT_SECRET!);

	//define shape
	type Shape = {
		userId1: string;
		userId2: string;
	};

	//get parsed body
	const parse: Shape = req.body;

	//get user id from passed param
	if (!parse.userId1 || parse.userId1 === "") throw new BadRequestError("userId1 cannot be blank");
	if (!parse.userId2 || parse.userId2 === "") throw new BadRequestError("userId2 cannot be blank");

	//call db
	const user1Schedules = await getScheduleByUserFromDb(parse.userId1);
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
	console.error(err.stack);
	res.status(500).json({ error: "Internal Server Error" });
}

export async function handlerReset(req: Request, res: Response) {
	//res.set("Content-Type", "text/plain; charset=utf-8");
	if (process.env.PLATFORM !== "dev") {
		res.status(403);
	} else {
		await deleteUsersAndSchedulesDb();
		res.status(200).send("Reset complete");
	}
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
