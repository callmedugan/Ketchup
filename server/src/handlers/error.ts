import { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from "../error.js";
import { deleteDb } from "../db/queries.js";
import { logError, logWarn } from "./logging.js";

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
