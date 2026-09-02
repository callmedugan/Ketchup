import { Request, Response } from "express";
import { getUserByEmail, addUserToDb, createRefreshToken, getRefreshTokenUser, revokeToken, deleteDb } from "../db/queries.js";
import { UnauthorizedError, BadRequestError, ConflictError } from "../error.js";
import { EMAIL_MAX_LENGTH, PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, REFRESH_TOKEN_EXPIRATION_DAYS } from "../data/constants.js";
import { checkPasswordHash, hashPassword, makeJWT, makeRefreshToken } from "../db/auth.js";
import { UserLogin } from "../db/schema.js";
import { logInfo, logWarn } from "./logging.js";
import z from "zod";

// must use trimmed and lowercase email
const createUserSchema = z.object({
	email: z
		.email("Email is invalid format")
		.trim()
		.toLowerCase()
		.min(1, "Email cannot be blank")
		.max(EMAIL_MAX_LENGTH, `Email must be ${EMAIL_MAX_LENGTH} characters or less`),
	name: z.string().trim().min(1, "Name cannot be blank"),
	password: z
		.string()
		.min(PASSWORD_MIN_LENGTH, `Password must be ${PASSWORD_MIN_LENGTH} characters or more`)
		.max(PASSWORD_MAX_LENGTH, `Password must be ${PASSWORD_MAX_LENGTH} characters or less`),
	timezone: z.string().trim().min(1, "Timezone cannot be blank"),
	avatarUrl: z.string().trim().min(1, "Avatar url cannot be blank"),
});

// must use trimmed and lowercase email
const loginSchema = z.object({
	email: z.email("Email is invalid format").trim().toLowerCase().min(1, "Email cannot be blank"),
	password: z.string().min(1, "Password cannot be blank"),
});

export async function handlerCreateUser(req: Request, res: Response) {
	// validate body
	const body = createUserSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { email, name, password, timezone, avatarUrl } = body.data;

	// check if email already exists
	const userExists = await getUserByEmail(email);
	if (userExists !== undefined) throw new ConflictError("Email has an existing account");

	// hash password
	const hashedPassword = await hashPassword(password);

	// create user
	const result = await addUserToDb({ name, email, hashedPassword, timezone, avatarUrl });
	if (result === undefined) throw new Error("Something went wrong creating the user");

	logInfo("user.created", { userId: result.id });

	// return with password omitted
	res.status(201).json({ id: result.id, name: result.name, email: result.email, createdAt: result.createdAt, updatedAt: result.updatedAt });
}

export async function handlerLogin(req: Request, res: Response) {
	// validate body
	const body = loginSchema.safeParse(req.body);
	if (!body.success) throw new BadRequestError(body.error.issues[0]?.message ?? "Invalid request body");

	const { email, password } = body.data;

	// get user
	const user = await getUserByEmail(email);
	if (user === undefined || user.hashedPassword === undefined || user.id === undefined) {
		throw new UnauthorizedError("Incorrect email or password");
	}

	// authenticate password
	let isAuth = false;

	try {
		isAuth = await checkPasswordHash(password, user.hashedPassword);
	} catch {
		throw new UnauthorizedError("Incorrect email or password");
	}

	if (!isAuth) throw new UnauthorizedError("Incorrect email or password");

	// create access token
	const token = makeJWT(user.id, process.env.JWT_SECRET!);

	// create refresh token
	const refreshTokenString = makeRefreshToken();
	const expiration = new Date();
	expiration.setDate(expiration.getDate() + REFRESH_TOKEN_EXPIRATION_DAYS);

	const refreshToken = await createRefreshToken({ token: refreshTokenString, userId: user.id, expiresAt: expiration });
	if (refreshToken === undefined) throw new Error("Failed to create refresh token on login");

	const result: UserLogin = {
		id: user.id,
		email: user.email,
		name: user.name,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		token,
		refreshToken: refreshTokenString,
		bio: user.bio,
		timezone: user.timezone,
		avatarUrl: user.avatarUrl,
	};

	logInfo("auth.login_succeeded", { userId: user.id });

	// return
	res.status(200).json(result);
}

export async function handlerRefresh(req: Request, res: Response) {
	// validate token
	const header = req.get("Authorization");
	const token = header && header.split(" ")[1];
	if (token == undefined) throw new UnauthorizedError("failed to get bearer token from req headers");

	// get refresh token user
	const tokenUser = await getRefreshTokenUser(token);
	if (tokenUser == undefined) throw new UnauthorizedError("token is invalid or expired");

	// create access token
	const newTokenString = makeJWT(tokenUser, process.env.JWT_SECRET!);

	// return
	res.status(200).send({ token: newTokenString });
}

export async function handlerLogout(req: Request, res: Response) {
	// validate token
	const token = req.token;
	if (token == undefined) throw new BadRequestError("Failed to get token from header to logout");

	// revoke refresh token
	const revoke = await revokeToken(token);
	if (!revoke) throw new Error("User was not logged in - no refresh token exists");

	logInfo("auth.logout_succeeded");

	// return
	res.status(200).send();
}

/* ========================================================================= */
//                        other
/* ========================================================================= */

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
