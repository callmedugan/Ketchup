import { and, eq, inArray, not, or } from "drizzle-orm";
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
	UserPublic,
	UserRecord,
	users,
} from "./schema";
import { BadRequestError, NotFoundError } from "../error";

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

//if a user is provided, returns all except that user (for searching for friends)
export async function getAllUsersFromDb(userId?: string): Promise<UserPublic[]> {
	if (userId) {
		const result = await db
			.select({
				id: users.id,
				name: users.name,
			})
			.from(users)
			.where(not(eq(users.id, userId)));
		return result;
	}
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

export async function blockUserInDb(userId: string, friendId: string): Promise<Friend | undefined> {
	const [result] = await db
		.insert(friends)
		.values({
			userId,
			friendId,
			status: "blocked",
		})
		.onConflictDoUpdate({
			target: [friends.userId, friends.friendId],
			set: {
				status: "blocked",
			},
		})
		.returning();
	return result;
}

export async function requestFriendInDb(userId: string, friendId: string): Promise<Friend | undefined> {
	//check if other user has sent a friend req so we can know if status should be requested or accepted
	const [requestReceived] = await db
		.select()
		.from(friends)
		.where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)));
	if (requestReceived?.status === "accepted") throw new BadRequestError("User is already friends with other user");
	if (requestReceived?.status === "blocked") throw new NotFoundError("Could not find other user");

	//if other user requested then update both records as accepted
	if (requestReceived !== undefined && requestReceived.status === "requested") {
		return await db.transaction(async (tx) => {
			// update request received
			await tx
				.update(friends)
				.set({
					status: "accepted",
				})
				.where(and(eq(friends.userId, friendId), eq(friends.friendId, userId)));

			// create/update user
			const [result] = await tx
				.insert(friends)
				.values({
					userId,
					friendId,
					status: "accepted",
				})
				.onConflictDoUpdate({
					target: [friends.userId, friends.friendId],
					set: {
						status: "accepted",
					},
				})
				.returning();

			return result;
		});
	}

	//if no request received then just create one sided requested entry for default
	const [result] = await db
		.insert(friends)
		.values({
			userId: userId,
			status: "requested",
			friendId: friendId,
		})
		.onConflictDoNothing()
		.returning();
	return result;
}

export async function getFriendsInDb(user: string): Promise<FriendDetails[]> {
	const result = await db
		.select({
			userId: friends.friendId,
			name: users.name,
			updatedAt: friends.updatedAt,
			status: friends.status,
		})
		.from(friends)
		.innerJoin(users, eq(friends.friendId, users.id))
		.where(eq(friends.userId, user));

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

export type PlanRecordDetails = PlanRecord & {
	friendName: string;
};
export async function getPlansFromDb(userId: string): Promise<PlanRecordDetails[]> {
	const result = await db
		.select({
			id: plans.id,
			creatorId: plans.creatorId,
			friendId: plans.friendId,
			createdAt: plans.createdAt,
			updatedAt: plans.updatedAt,
			status: plans.status,
			title: plans.title,
			comments: plans.comments,
			meetTime: plans.meetTime,

			friendName: users.name,
		})
		.from(plans)
		.innerJoin(users, eq(plans.friendId, users.id))
		.where(eq(plans.creatorId, userId));

	return result;
}
