import { uuid, pgTable, text, timestamp, varchar, pgEnum } from "drizzle-orm/pg-core";

//users
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
	email: varchar("email", { length: 256 }).unique().notNull(),
	hashedPassword: varchar("hashed_password").notNull().default("unset"),
});

//schedules
export type UserRecord = typeof users.$inferSelect;
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
