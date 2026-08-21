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
