import { primaryKey, uuid, pgTable, text, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";
import { BIO_MAX_LENGTH, COMMENTS_MAX_LENGTH, EMAIL_MAX_LENGTH, TITLE_MAX_LENGTH } from "../data/constants.js";
import z from "zod";

/* ========================================================================= */
//                        users
/* ========================================================================= */
// TODO: photo(s), interests(seperate table), timezone, location, bucket list (seperate)

export type UserInsert = typeof users.$inferInsert;
export type UserPrivate = typeof users.$inferSelect;
export type UserPublic = Pick<typeof users.$inferSelect, "id" | "name" | "avatarUrl" | "bio" | "timezone">;
//response shape when user logs in
export type UserLogin = Omit<typeof users.$inferSelect, "hashedPassword"> & { token: string; refreshToken: string };

export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	email: varchar("email", { length: EMAIL_MAX_LENGTH }).unique().notNull(),
	hashedPassword: varchar("hashed_password").notNull().default("unset"),
	bio: varchar("bio", { length: BIO_MAX_LENGTH }).notNull().default(""),
	timezone: text("timezone").notNull().default("America/Los_Angeles"),
	avatarUrl: varchar("avatar_url", { length: 255 }).notNull().default("ketchup"),
});

/* ========================================================================= */
//                        schedules
/* ========================================================================= */
// TODO: add color, matched status? (seperate table for a sepcific overlap),

export type ScheduleRecord = typeof schedules.$inferSelect;
export type Schedule = typeof schedules.$inferInsert;

export const scheduleRepeatEnum = pgEnum("repeat_type", ["once", "daily", "weekly"]);
export const schedules = pgTable("schedules", {
	id: uuid("id").primaryKey().defaultRandom(),
	repeatType: scheduleRepeatEnum("repeat_type").default("once").notNull(),
	startTime: timestamp("start_time", { withTimezone: true }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	timezone: varchar("timezone", { length: 64 }).notNull(),
});

export type ScheduleRepeatType = "once" | "daily" | "weekly";
export function isValidRepeatType(obj: any): obj is ScheduleRepeatType {
	if (!obj || typeof obj !== "string") return false;

	if (obj === "once" || obj === "daily" || obj === "weekly") return true;

	return false;
}

//used to nicely rank the repeat types when comparing
export const scheduleRepeatTypeRank: Record<ScheduleRepeatType, number> = { once: 1, weekly: 2, daily: 3 };
/* ========================================================================= */
//                        refresh tokens
/* ========================================================================= */

export type RefreshToken = typeof refreshTokens.$inferInsert;
export const refreshTokens = pgTable("refresh_tokens", {
	token: text("token").primaryKey(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
	//null if not revoked
	revokedAt: timestamp("revoked_at", { withTimezone: true }),
});

/* ========================================================================= */
//                        friends
/* ========================================================================= */
//zod
export const FriendStatusSchema = z.enum(["requested", "accepted", "declined", "blocked"]);
//drizzle
export const friendStatusEnum = pgEnum("friend_status", ["requested", "accepted", "declined", "blocked"]);
export type Friend = typeof friends.$inferInsert;
export type FriendDetails = Pick<typeof friends.$inferSelect, "status"> &
	Pick<typeof users.$inferSelect, "id" | "name" | "createdAt" | "updatedAt" | "bio" | "timezone" | "avatarUrl"> & { requestDirection: "sent" | "received" };
//actual type
export type FriendStatusType = z.infer<typeof FriendStatusSchema>;

export const friends = pgTable(
	"friends",
	{
		requesterId: uuid("requester_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		responderId: uuid("responder_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
		status: friendStatusEnum("status").notNull(),
	},
	//make composite primary key for user/friend relationship
	(table) => [primaryKey({ columns: [table.requesterId, table.responderId] })],
);

export function isValidFriendStatus(obj: any): obj is FriendStatusType {
	if (!obj || typeof obj !== "string") return false;

	if (obj === "requested" || "accepted" || "declined" || "blocked") return true;

	return false;
}

/* ========================================================================= */
//                        plans
/* ========================================================================= */

type PlanStatusType = "declined" | "pending" | "confirmed" | "cancelled";
export const PlanStatusEnum = pgEnum("plan_status", ["declined", "pending", "confirmed", "cancelled"]);

export type Plan = typeof plans.$inferInsert;
export type PlanRecord = typeof plans.$inferSelect;

export const plans = pgTable("plans", {
	id: uuid("id").primaryKey().defaultRandom(),
	creatorId: uuid("creator_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	friendId: uuid("friend_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	status: PlanStatusEnum("status").notNull(),
	title: varchar("title", { length: TITLE_MAX_LENGTH }).notNull().default("New Plan"),
	comments: varchar("comments", { length: COMMENTS_MAX_LENGTH }).notNull().default(""),
	meetTime: timestamp("meet_time", { withTimezone: true }).notNull(),
	lastUpdatedBy: uuid("last_updated_by").references(() => users.id),
	location: varchar("location", { length: 255 }),
});

export function isValidPlanStatus(obj: any): obj is PlanStatusType {
	if (!obj || typeof obj !== "string") return false;

	if (obj === "declined" || "pending" || "confirmed" || "cancelled") return true;

	return false;
}
