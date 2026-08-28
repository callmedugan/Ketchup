import { hash, verify as argonVerify } from "argon2";
import { Request } from "express";
import { UnauthorizedError } from "../error.js";
//goofy naming clash so have to import like this, pkg as all defaults, destructure and then rename
import pkg, { JwtPayload } from "jsonwebtoken";
import { randomBytes } from "crypto";
import { JWT_TOKEN_EXPIRATION_MINS } from "../data/constants.js";
const { sign, verify: jwtVerify } = pkg;

export async function hashPassword(password: string): Promise<string> {
	const result = await hash(password);
	return result;
}

export async function checkPasswordHash(rawPassword: string, hashedPassword: string): Promise<boolean> {
	const result = await argonVerify(hashedPassword, rawPassword);
	return result;
}

//narrow the types of keys
type Payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export function makeJWT(userID: string, secret: string): string {
	const issuedTime = Math.floor(Date.now() / 1000);
	const payload: Payload = {
		//issuer
		iss: "chirpy",
		//subject or person
		sub: userID,
		//time issued
		iat: issuedTime,
		//time expires
		exp: issuedTime + JWT_TOKEN_EXPIRATION_MINS * 60,
	};
	try {
		const result = sign(payload, secret);
		return result;
	} catch (err) {
		throw new Error("failed to create token", { cause: err });
	}
}

//validates jwt and returns userId as a string
export function validateJWT(tokenString: string, secret: string): string {
	try {
		//cast as payload type, check if sub exists for the userId, and if any of it fails, throw and error up the chain
		const decoded = jwtVerify(tokenString, secret) as Payload;
		if (decoded?.sub == undefined) throw new Error();
		//success
		return decoded.sub;
	} catch (err) {
		throw new UnauthorizedError("failed to validate and decode token");
	}
}

//creates a refresh token
export function makeRefreshToken(): string {
	const result = randomBytes(256).toString("hex");
	return result;
}

export function getAPIKey(req: Request) {
	const header = req.get("Authorization");
	const result = header && header.split(" ")[1];
	if (result == undefined) throw new UnauthorizedError("failed to get api key from request");
	return result;
}
