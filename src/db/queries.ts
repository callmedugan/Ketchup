import { and, eq, inArray, or } from "drizzle-orm";
import { db } from ".";
import {
	Friend,
	FriendDetails,
	friends,
	FriendStatusType,
	Plan,
	PlanRecord,
	plans,
	RefreshToken,
	refreshTokens,
	Schedule,
	ScheduleRecord,
	schedules,
	User,
	UserRecord,
	users,
} from "./schema";

/* ========================================================================= */
//                        all
/* ========================================================================= */

export async function deleteAll() {
	await db.delete(users);
	await db.delete(schedules);
	await db.delete(refreshTokens);
	await db.delete(friends);
}

/* ========================================================================= */
//                        users
/* ========================================================================= */

export async function addUserToDb(user: User): Promise<UserRecord | undefined> {
	const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
	return result;
}

export async function getUserByEmail(email: string): Promise<UserRecord | undefined> {
	const [result] = await db.select().from(users).where(eq(users.email, email));
	return result;
}

export async function getUserById(id: string): Promise<UserRecord | undefined> {
	const [result] = await db.select().from(users).where(eq(users.id, id));
	return result;
}

//need to add filters here - mainly for finding friends?
export async function getAllUsersFromDb(): Promise<UserRecord[]> {
	const result = await db.select().from(users);
	return result;
}

/* ========================================================================= */
//                        schedules
/* ========================================================================= */

export async function addScheduleToDb(schedule: Schedule): Promise<ScheduleRecord | undefined> {
	const [result] = await db.insert(schedules).values(schedule).onConflictDoNothing().returning();
	return result;
}

//will only return if user owns the schedule
export async function deleteScheduleFromDb(requestingUser: string, id: string): Promise<ScheduleRecord | undefined> {
	const [result] = await db
		.delete(schedules)
		.where(and(eq(schedules.userId, requestingUser), eq(schedules.id, id)))
		.returning();
	return result;
}

export async function getScheduleByUserFromDb(userId: string): Promise<ScheduleRecord[]> {
	const result = await db.select().from(schedules).where(eq(schedules.userId, userId));
	return result;
}

/* ========================================================================= */
//                        refresh tokens
/* ========================================================================= */

export async function createRefreshToken(token: RefreshToken): Promise<RefreshToken | undefined> {
	const [result] = await db.insert(refreshTokens).values(token).onConflictDoNothing().returning();
	return result;
}

//will return undefined if token is invalid or expired, otherwise returns userId
export async function getRefreshTokenUser(tokenIdString: string): Promise<string | undefined> {
	console.log(tokenIdString);
	const [result] = await db.select().from(refreshTokens).where(eq(refreshTokens.token, tokenIdString));
	if (result != undefined && result.revokedAt == null && result.expiresAt > new Date()) {
		return result.userId;
	}
	return undefined;
}

//will revoke a token and return true on success
export async function revokeToken(tokenIdString: string): Promise<boolean> {
	const [result] = await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.token, tokenIdString)).returning();
	return result != undefined;
}

/* ========================================================================= */
//                        friends
/* ========================================================================= */

export async function requestFriendInDb(user: string, other: string): Promise<Friend | undefined> {
	//check if other user has sent a friend req so we can know if status should be requested or accepted
	const [requestReceived] = await db.select().from(friends).where(eq(friends.friendId, user));

	//both requested
	const isMutual = requestReceived != undefined && requestReceived?.status === "requested";
	if (isMutual) {
		//update other user
		const [otherUserResult] = await db.update(friends).set({ status: "accepted" }).where(eq(friends.friendId, user)).returning();
	}

	//just create entry for the user if this is initial request between the 2 users
	const [result] = await db
		.insert(friends)
		.values({
			userId: user,
			status: isMutual ? "accepted" : "requested",
			friendId: other,
		})
		.onConflictDoNothing()
		.returning();
	return result;
}

export async function getFriendsInDb(user: string): Promise<FriendDetails[]> {
	//check if other user has sent a friend req so we can know if status should be requested or accepted
	const result: FriendDetails[] = await db
		.select({
			userId: friends.friendId,
			name: users.name,
			updatedAt: friends.updatedAt,
			status: friends.status,
		})
		.from(friends)
		.innerJoin(users, eq(friends.friendId, users.id))
		.where(and(eq(friends.userId, user), eq(friends.status, "accepted")));

	return result;
}

export async function checkUsersAreFriendsFromDb(user1: string, user2: string): Promise<boolean> {
	const [result] = await db
		.select()
		.from(friends)
		.where(and(eq(friends.userId, user1), eq(friends.friendId, user2), eq(friends.status, "accepted")));

	return result !== undefined;
}

export type FriendScheduleRecord = {
	friendId: string;
	friendName: string;
	userScheduleIdMatched?: string | null;
} & ScheduleRecord;

export async function getAllFriendSchedules(userId: string): Promise<FriendScheduleRecord[]> {
	const result = await db
		.select({
			id: schedules.id,
			userId: schedules.userId,
			startTime: schedules.startTime,
			endTime: schedules.endTime,
			repeatType: schedules.repeatType,
			createdAt: schedules.createdAt,
			updatedAt: schedules.updatedAt,
			friendId: users.id,
			friendName: users.name,
		})
		.from(schedules)
		.innerJoin(friends, and(eq(schedules.userId, friends.friendId), eq(friends.userId, userId), eq(friends.status, "accepted")))
		.innerJoin(users, eq(users.id, friends.friendId));

	return result;
}

/* ========================================================================= */
//                        plans
/* ========================================================================= */

export async function addPlansToDb(plan: Plan): Promise<PlanRecord | undefined> {
	const [result] = await db.insert(plans).values(plan).onConflictDoNothing().returning();
	return result;
}
