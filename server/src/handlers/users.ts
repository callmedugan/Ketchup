import z from "zod";
import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../error.js";
import { getUserById, searchForUsersInDb, updateUserProfileInDb } from "../db/queries.js";
import { logInfo } from "./logging.js";

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
