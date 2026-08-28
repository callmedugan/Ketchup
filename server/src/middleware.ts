import { NextFunction, Request, Response } from "express";
import { validateJWT } from "./db/auth.js";
import { BadRequestError, UnauthorizedError } from "./error.js";
import rateLimit from "express-rate-limit";

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

// user ip is stored in memory, so it will reset on server restart and this can be bypassed by someone using ip rotation
export const middlewareAuthRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minute ban window
	limit: 5, // Limit each IP to 5 failed attempts per window
	message: { status: 429, error: "Too many login attempts. Please try again after 15 minutes." },
	standardHeaders: "draft-7",
	legacyHeaders: false,
});
