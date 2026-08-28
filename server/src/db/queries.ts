import { and, asc, eq, exists, getTableColumns, ilike, inArray, ne, not, or, sql } from "drizzle-orm";
import { db } from "./index.js";
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
	UserInsert,
	UserPublic,
	UserPrivate,
	users,
} from "./schema.js";
import { BadRequestError, NotFoundError } from "../error.js";

/* ========================================================================= */
//                        all
/* ========================================================================= */

export async function deleteDb() {
	await db.delete(users);
	await db.delete(schedules);
	await db.delete(refreshTokens);
	await db.delete(friends);
	await db.delete(plans);
}

/* ========================================================================= */
//                        users
/* ========================================================================= */

export async function addUserToDb(user: UserInsert): Promise<UserPrivate | undefined> {
	const [result] = await db.insert(users).values(user).onConflictDoNothing().returning();
	return result;
}

export async function getUserByEmail(email: string): Promise<UserPrivate | undefined> {
	const [result] = await db.select().from(users).where(eq(users.email, email));
	return result;
}

export async function getUserById(id: string): Promise<UserPrivate | undefined> {
	const [result] = await db.select().from(users).where(eq(users.id, id));
	return result;
}

//if a user is provided, returns all except that user (for searching for friends)
export async function searchForUsersInDb(userId: string, search: string): Promise<UserPublic[]> {
	//remove whitespace
	const normalizedSearch = search.trim();

	return await db
		.select({ id: users.id, name: users.name, timezone: users.timezone, avatarUrl: users.avatarUrl, bio: users.bio })
		.from(users)
		.where(and(not(eq(users.id, userId)), or(ilike(users.name, `%${normalizedSearch}%`), eq(users.email, normalizedSearch.toLowerCase()))))
		.orderBy(
			sql`
			CASE
				WHEN lower(${users.name}) = lower(${normalizedSearch}) THEN 1
				WHEN lower(${users.name}) LIKE lower(${normalizedSearch + "%"}) THEN 2
				WHEN lower(${users.name}) LIKE lower(${"%" + normalizedSearch + "%"}) THEN 3
				WHEN lower(${users.email}) = lower(${normalizedSearch}) THEN 4
				ELSE 5
			END
		`,
			asc(users.name),
		)
		.limit(20);
}

export async function updateUserProfileInDb(userId: string, updates: { bio: string; timezone: string; avatarUrl: string }): Promise<UserInsert> {
	const [result] = await db
		.update(users)
		.set({ ...updates, updatedAt: new Date() })
		.where(eq(users.id, userId))
		.returning();

	if (!result) {
		throw new NotFoundError("User not found");
	}

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

//used to find both sides in the friend db
function checkBothFriends(user1: string, user2: string) {
	return or(and(eq(friends.requesterId, user1), eq(friends.responderId, user2)), and(eq(friends.requesterId, user2), eq(friends.responderId, user1)));
}
//checks both sides for user
function checkUserTwice(userId: string) {
	return or(eq(friends.requesterId, userId), eq(friends.responderId, userId));
}

export async function blockUserInDb(requesterId: string, responderId: string): Promise<Friend> {
	return await db.transaction(async (tx) => {
		// remove all existing relationship records between the users
		await tx.delete(friends).where(checkBothFriends(requesterId, responderId));

		// create the block owned by the user doing the blocking
		const [result] = await tx.insert(friends).values({ requesterId, responderId, status: "blocked" }).returning();

		if (!result) throw new Error("Failed to block user");

		return result;
	});
}

export async function unblockUserInDb(requesterId: string, responderId: string): Promise<Friend> {
	const [result] = await db
		.delete(friends)
		.where(and(eq(friends.requesterId, requesterId), eq(friends.responderId, responderId), eq(friends.status, "blocked")))
		.returning();

	if (!result) throw new NotFoundError("Blocked user not found");

	return result;
}

// sends friend request
export async function requestFriendInDb(requesterId: string, responderId: string): Promise<Friend> {
	// check relationships in either direction
	const existingRelationships = await db.select().from(friends).where(checkBothFriends(requesterId, responderId));

	// block prevents any request in either direction
	if (existingRelationships.some((relationship) => relationship.status === "blocked")) throw new NotFoundError("Could not find other user");

	// already friends
	if (existingRelationships.some((relationship) => relationship.status === "accepted")) throw new BadRequestError("User is already friends with other user");

	// prevent the original requester from sending again after being declined
	const previouslyDeclined = existingRelationships.some(
		(relationship) => relationship.status === "declined" && relationship.requesterId === requesterId && relationship.responderId === responderId,
	);
	if (previouslyDeclined) throw new BadRequestError("Friend request was previously declined");

	// pending request exists in either direction
	if (existingRelationships.some((relationship) => relationship.status === "requested")) throw new BadRequestError("Friend request already pending");

	// no existing relationship preventing a request
	const [result] = await db.insert(friends).values({ requesterId, responderId, status: "requested" }).returning();

	if (result === undefined) throw new Error("failed to request friend");

	return result;
}

// responds to a received friend request
export async function respondToFriendRequestInDb(userId: string, requesterId: string, response: "accepted" | "declined"): Promise<Friend> {
	// find the incoming request specifically from requester -> current user
	const [request] = await db
		.select()
		.from(friends)
		.where(and(eq(friends.requesterId, requesterId), eq(friends.responderId, userId)));

	if (!request) throw new NotFoundError("Friend request not found");
	if (request.status === "blocked") throw new NotFoundError("Could not find other user");
	if (request.status === "accepted") throw new BadRequestError("User is already friends with other user");
	if (request.status === "declined") throw new BadRequestError("Friend request was already declined");
	if (request.status !== "requested") throw new BadRequestError("No pending friend request");

	const [result] = await db
		.update(friends)
		.set({ status: response })
		.where(and(eq(friends.requesterId, requesterId), eq(friends.responderId, userId), eq(friends.status, "requested")))
		.returning();

	if (result === undefined) throw new Error("failed to respond to friend request");

	return result;
}

// removes friend records between two users, but never removes blocked records
export async function removeFriendInDb(user1Id: string, user2Id: string): Promise<Friend> {
	const [result] = await db
		.delete(friends)
		.where(and(checkBothFriends(user1Id, user2Id), ne(friends.status, "blocked")))
		.returning();

	if (!result) throw new NotFoundError("Friend relationship not found");

	return result;
}

//returns all friends where user is sender or receiver of requests
export async function getFriendsInDb(userId: string): Promise<FriendDetails[]> {
	const otherUserId = sql<string>`
		CASE
			WHEN ${friends.requesterId} = ${userId}
				THEN ${friends.responderId}
			ELSE ${friends.requesterId}
		END
	`;

	const requestDirection = sql<"sent" | "received">`
		CASE
			WHEN ${friends.requesterId} = ${userId}
				THEN 'sent'
			ELSE 'received'
		END
	`;

	const result = await db
		.select({
			// relationship info
			status: friends.status,
			requestDirection,

			// other user's info
			id: users.id,
			name: users.name,
			createdAt: users.createdAt,
			updatedAt: users.updatedAt,
			bio: users.bio,
			timezone: users.timezone,
			avatarUrl: users.avatarUrl,
		})
		.from(friends)
		.innerJoin(users, eq(users.id, otherUserId))
		//filter out any users that have blocked the user
		.where(and(checkUserTwice(userId), or(ne(friends.status, "blocked"), eq(friends.requesterId, userId))));

	return result;
}

export async function checkUsersAreFriendsFromDb(user1: string, user2: string): Promise<boolean> {
	const [result] = await db
		.select()
		.from(friends)
		.where(and(checkBothFriends(user1, user2), eq(friends.status, "accepted")));

	return result !== undefined;
}

//added later
export type FriendScheduleRecord = { userScheduleIdMatched?: string | null } & ScheduleRecord;

// gets schedules where a relationship exists between user and any oher user
export async function getAllFriendSchedules(userId: string): Promise<FriendScheduleRecord[]> {
	return db
		.select({ ...getTableColumns(schedules) })
		.from(schedules)
		.where(
			exists(
				db
					.select()
					.from(friends)
					.where(
						and(
							eq(friends.status, "accepted"),
							or(
								and(eq(friends.requesterId, userId), eq(friends.responderId, schedules.userId)),
								and(eq(friends.responderId, userId), eq(friends.requesterId, schedules.userId)),
							),
						),
					),
			),
		);
}

/* ========================================================================= */
//                        plans
/* ========================================================================= */

export async function addPlanToDb(plan: Plan): Promise<PlanRecord | undefined> {
	const [result] = await db.insert(plans).values(plan).onConflictDoNothing().returning();
	return result;
}

//gets all plans where user is either creator or friend
export async function getPlansFromDb(userId: string): Promise<PlanRecord[]> {
	const result = await db
		.select()
		.from(plans)
		.where(or(eq(plans.creatorId, userId), eq(plans.friendId, userId)));

	return result;
}

export async function respondToPlanInDb(userId: string, planId: string, response: "accepted" | "declined"): Promise<PlanRecord | undefined> {
	const [result] = await db
		.update(plans)
		.set({ status: response === "accepted" ? "confirmed" : "declined", lastUpdatedBy: userId })
		.where(and(eq(plans.friendId, userId), eq(plans.id, planId), eq(plans.status, "pending")))
		.returning();

	return result;
}

//only allow pedning or confirmed plans to be cancelled
export async function cancelPlanInDb(userId: string, planId: string): Promise<PlanRecord | undefined> {
	const [result] = await db
		.update(plans)
		.set({ status: "cancelled", lastUpdatedBy: userId })
		.where(
			and(
				eq(plans.id, planId),

				or(eq(plans.creatorId, userId), eq(plans.friendId, userId)),

				or(eq(plans.status, "pending"), eq(plans.status, "confirmed")),
			),
		)
		.returning();

	return result;
}
