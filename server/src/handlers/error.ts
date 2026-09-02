import { Request, Response, NextFunction } from "express";
import { BadRequestError, NotFoundError, ForbiddenError, UnauthorizedError, ConflictError } from "../error.js";
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
