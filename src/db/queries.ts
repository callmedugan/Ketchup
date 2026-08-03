import { eq } from "drizzle-orm";
import { db } from ".";
import {
	RefreshToken,
	refreshTokens,
	Schedule,
	ScheduleRecord,
	schedules,
	User,
	UserRecord,
	users,
} from "./schema";

///////All//////////

export async function deleteAll() {
	await db.delete(users);
	await db.delete(schedules);
}

///////Users////////
export async function addUserToDb(user: User): Promise<UserRecord | undefined> {
	const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
	return result;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
	const [result] = await db.select().from(users).where(eq(users.email, email));
	return result;
}

//need to add filters here - mainly for finding friends?
export async function getAllUsersFromDb(): Promise<UserRecord[] | undefined> {
	const result = await db.select().from(users);
	return result;
}

//////Schedules//////
export async function addScheduleToDb(schedule: Schedule): Promise<ScheduleRecord | undefined> {
	const [result] = await db.insert(schedules).values(schedule).onConflictDoNothing().returning();
	return result;
}

export async function getScheduleByUserFromDb(
	userId: string,
): Promise<ScheduleRecord[] | undefined> {
	const result = await db.select().from(schedules).where(eq(schedules.userId, userId));
	return result;
}

//////Refresh Tokens//////
export async function createRefreshToken(token: RefreshToken): Promise<RefreshToken | undefined> {
	const [result] = await db.insert(refreshTokens).values(token).onConflictDoNothing().returning();
	return result;
}

//will return undefined if token is invalid or expired, otherwise returns userId
export async function getRefreshTokenUser(tokenIdString: string): Promise<string | undefined> {
	const [result] = await db
		.select()
		.from(refreshTokens)
		.where(eq(refreshTokens.token, tokenIdString));
	if (result != undefined && result.revokedAt == null && result.expiresAt > new Date()) {
		return result.userId;
	}
	return undefined;
}

//will revoke a token and return true on success
export async function revokeToken(tokenIdString: string): Promise<boolean> {
	const [result] = await db
		.update(refreshTokens)
		.set({ revokedAt: new Date() })
		.where(eq(refreshTokens.token, tokenIdString))
		.returning();
	return result != undefined;
}
