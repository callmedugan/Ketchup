import { Request, Response, NextFunction } from "express";

type LogFields = Record<string, string | number | boolean | null | undefined>;

export function formatLogFields(fields: LogFields) {
	return Object.entries(fields)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `${key}=${JSON.stringify(value)}`)
		.join(" ");
}

export function logInfo(event: string, fields: LogFields = {}) {
	const details = formatLogFields(fields);
	console.info(`[${new Date().toISOString()}] [INFO] ${event}${details ? ` ${details}` : ""}`);
}

export function logWarn(event: string, fields: LogFields = {}) {
	const details = formatLogFields(fields);
	console.warn(`[${new Date().toISOString()}] [WARN] ${event}${details ? ` ${details}` : ""}`);
}

export function logError(event: string, error: Error, fields: LogFields = {}) {
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
