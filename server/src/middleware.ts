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
export const middlewareLoginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minute
	limit: 5, // Limit each IP to 5 failed attempts per window
	skipFailedRequests: true,
	message: { status: 429, error: "Too many failed login attempts. Try again later." },
	standardHeaders: "draft-8",
	legacyHeaders: false,
});

export const middlewareRegisterLimiter = rateLimit({
	windowMs: 60 * 60 * 1000, // 1 hour
	limit: 5,
	standardHeaders: "draft-8",
	legacyHeaders: false,
	message: { status: 429, error: "Too many accounts created from this connection. Try again later." },
});

export const middlewareApiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 300, // 300 requests per IP per window
	message: { status: 429, error: "Too many requests. Try again later." },
	standardHeaders: "draft-8",
	legacyHeaders: false,
});

//forces the browser to follow the MIME type in the Content-Type header instead of guessing - should be used API wide
export function noSniffHeader(req: Request, res: Response, next: NextFunction) {
	res.setHeader("X-Content-Type-Options", "nosniff");
	return next();
}
