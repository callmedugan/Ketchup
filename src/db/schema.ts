import { primaryKey, uuid, pgTable, text, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";
import { BIO_MAX_LENGTH, EMAIL_MAX_LENGTH } from "../data/constants";

/* ========================================================================= */
//                        users
/* ========================================================================= */
// TODO: photo(s), interests(seperate table), timezone, location, bucket list (seperate)

export type User = typeof users.$inferInsert;
export type Schedule = typeof schedules.$inferInsert;
export const users = pgTable("users", {
	id: uuid("id").primaryKey().defaultRandom(),
	name: text("name").notNull(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	email: varchar("email", { length: EMAIL_MAX_LENGTH }).unique().notNull(),
	hashedPassword: varchar("hashed_password").notNull().default("unset"),
	bio: varchar("bio", { length: BIO_MAX_LENGTH }).notNull().default(""),
	//timezone: text("timezone").notNull().default("America/Los_Angeles"),
});

export type UserRecord = typeof users.$inferSelect;

/* ========================================================================= */
//                        schedules
/* ========================================================================= */
// TODO: add color, matched status? (seperate table for a sepcific overlap),

export type ScheduleRecord = typeof schedules.$inferSelect;

export const scheduleRepeatEnum = pgEnum("repeat_type", ["once", "daily", "weekly"]);
export const schedules = pgTable("schedules", {
	id: uuid("id").primaryKey().defaultRandom(),
	repeatType: scheduleRepeatEnum("repeat_type").default("once").notNull(),
	startTime: timestamp("start_time").notNull(),
	endTime: timestamp("end_time").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
});

export type ScheduleRepeatType = "once" | "daily" | "weekly";
export function isValidRepeatType(obj: any): obj is ScheduleRepeatType {
	if (!obj || typeof obj !== "string") return false;

	if (obj === "once" || obj === "daily" || obj === "weekly") return true;

	return false;
}
/* ========================================================================= */
//                        refresh tokens
/* ========================================================================= */

export type RefreshToken = typeof refreshTokens.$inferInsert;
export const refreshTokens = pgTable("refresh_tokens", {
	token: text("token").primaryKey(),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	expiresAt: timestamp("expires_at").notNull(),
	//null if not revoked
	revokedAt: timestamp("revoked_at"),
});

/* ========================================================================= */
//                        friends
/* ========================================================================= */

export const friendStatusEnum = pgEnum("type", ["requested", "accepted", "blocked"]);
export type Friend = typeof friends.$inferInsert;
export type FriendDetails = {
	userId: typeof friends.$inferSelect.friendId;
	name: typeof users.$inferSelect.name;
	updatedAt: typeof friends.$inferSelect.updatedAt;
	status: typeof friends.$inferSelect.status;
};

export const friends = pgTable("friends", {
	userId: uuid("user_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" })
		.primaryKey(),
	friendId: uuid("friend_id")
		.notNull()
		.references(() => users.id, { onDelete: "cascade" }),
	createdAt: timestamp("created_at").notNull().defaultNow(),
	updatedAt: timestamp("updated_at")
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	status: friendStatusEnum("status").notNull(),
});

export type FriendStatusType = "requested" | "accepted" | "blocked";
export function isValidFriendStatus(obj: any): obj is FriendStatusType {
	if (!obj || typeof obj !== "string") return false;

	if (obj === "requested" || "accepted" || "blocked") return true;

	return false;
}
