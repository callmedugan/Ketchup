import { date, uuid, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
	id: uuid("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
	scheduleId: uuid("schedule_id")
		.notNull()
		.references(() => schedules.id, { onDelete: "cascade" }),
});

export const schedules = pgTable("schedules", {
	id: uuid("id").primaryKey(),
	dates: date("dates").notNull().array(),
	startTime: timestamp("start_time").notNull(),
	endTime: timestamp("end_time").notNull(),
	createdAt: timestamp("created_at").defaultNow().notNull(),
	updatedAt: timestamp("updated_at")
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
