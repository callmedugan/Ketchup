import { z } from "zod";
import { timezoneSchema } from "./timezone.js";
import { userPublicSchema } from "./user.js";

export const scheduleRepeatTypeSchema = z.enum(["once", "daily", "weekly"]);
export type ScheduleRepeatType = z.infer<typeof scheduleRepeatTypeSchema>;

// used to rank repeat types when comparing two schedules (more frequent wins)
export const scheduleRepeatTypeRank: Record<ScheduleRepeatType, number> = { once: 1, weekly: 2, daily: 3 };

/* ========================================================================= */
//                        API response shapes
/* ========================================================================= */

// a schedule as returned by the API - dates arrive as ISO strings with an
// explicit UTC offset, so coercing them here is safe (unlike request bodies,
// which carry wall-clock local time and must never be coerced - see
// createScheduleRequestSchema below).
export const scheduleSchema = z.object({
	id: z.uuid(),
	userId: z.uuid(),
	repeatType: scheduleRepeatTypeSchema,
	startTime: z.coerce.date(),
	endTime: z.coerce.date(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});
export type Schedule = z.infer<typeof scheduleSchema>;

// the active (pending/confirmed) plan a schedule is currently committed to, if any -
// a schedule can be tied to at most one active plan at a time (enforced at creation)
export const scheduleActivePlanSchema = z.object({
	id: z.uuid(),
	title: z.string(),
	status: z.enum(["pending", "confirmed"]),
	meetTime: z.coerce.date(),
});
export type ScheduleActivePlan = z.infer<typeof scheduleActivePlanSchema>;

export const scheduleWithUserSchema = scheduleSchema.extend({ user: userPublicSchema, plan: scheduleActivePlanSchema.nullable().optional() });
export type ScheduleWithUser = z.infer<typeof scheduleWithUserSchema>;

/* ========================================================================= */
//                        API request shapes
/* ========================================================================= */

// startTime/endTime are raw wall-clock strings, converted to UTC server-side
// using the request's own timezone field - never coerce these to Date directly,
// that would use the server's local timezone instead of the user's.
export const createScheduleRequestSchema = z.object({
	startTime: z.string().min(1, "Start time cannot be blank"),
	endTime: z.string().min(1, "End time cannot be blank"),
	repeatType: scheduleRepeatTypeSchema,
	timezone: timezoneSchema,
});
export type CreateScheduleRequest = z.infer<typeof createScheduleRequestSchema>;

export const deleteScheduleRequestSchema = z.object({ id: z.uuid().min(1, "Id missing or blank") });
