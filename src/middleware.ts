import { NextFunction, Request, Response } from "express";
import { validateJWT } from "./db/auth";
import { BadRequestError, UnauthorizedError } from "./error";
import { checkUsersAreFriendsFromDb } from "./db/queries";

declare global {
	namespace Express {
		interface Request {
			userId?: string; // Declares the injected property globally to make ts hush
			token?: string;
		}
	}
}

export async function middlewareAuthentication(req: Request, res: Response, next: NextFunction) {
	//get bearer token from auth header in req
	const header = req.get("Authorization");
	const token = header && header.split(" ")[1];
	if (token == undefined) throw new UnauthorizedError("failed to get bearer token from request");

	//check if jwt is valid
	const validatedUserId = validateJWT(token, process.env.JWT_SECRET!);

	//inject userId and token
	req.userId = validatedUserId;
	req.token = token;

	return next();
}

export async function middlewareAuthorizedViewer(req: Request, res: Response, next: NextFunction) {
	//check to see if user matches target user or is friends with them

	//validated user
	const userId = req.userId;
	if (!userId || typeof userId !== "string") throw new BadRequestError("userId missing or invalid");

	//get user id from passed param
	const lookupUserId = req.params.userId;
	if (!lookupUserId || typeof lookupUserId !== "string")
		throw new BadRequestError("targetUserId param missing or invalid");

	//only run query if needed
	if (userId === lookupUserId) return next();
	const isFriend = await checkUsersAreFriendsFromDb(userId, lookupUserId);
	if (isFriend) return next();

	//finally
	throw new UnauthorizedError("user must be friends with user to view schedule");
}
