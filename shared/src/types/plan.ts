import { z } from "zod";
import { COMMENTS_MAX_LENGTH, LOCATION_MAX_LENGTH, TITLE_MAX_LENGTH } from "../constants.js";

export const planStatusSchema = z.enum(["declined", "pending", "confirmed", "cancelled"]);
export type PlanStatus = z.infer<typeof planStatusSchema>;

export const planDataSchema = z.object({
	id: z.uuid(),
	creatorId: z.uuid(),
	friendId: z.uuid(),
	status: planStatusSchema,
	title: z.string(),
	comments: z.string(),
	location: z.string(),
	meetTime: z.coerce.date(),
	lastUpdatedBy: z.uuid(),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});
export type PlanData = z.infer<typeof planDataSchema>;

/* ========================================================================= */
//                        API request shapes
/* ========================================================================= */

// meetTime is sent by the client as a JSON-serialized Date (always a full
// ISO string with an explicit UTC offset), so coercing it here is safe -
// unlike schedule startTime/endTime, this never carries ambiguous wall-clock
// text.
export const createPlanRequestSchema = z.object({
	friendId: z.uuid().min(1, "friendId cannot be blank"),
	meetTime: z.coerce.date({ error: "meetTime must be a valid date" }),
	title: z.string().max(TITLE_MAX_LENGTH, "Title is too long"),
	comments: z.string().max(COMMENTS_MAX_LENGTH, "Comments are too long").optional(),
	location: z.string().max(LOCATION_MAX_LENGTH, "Location is too long").optional(),
	// the two availability blocks (creator's, then friend's) this plan was proposed from
	scheduleIds: z.tuple([z.uuid(), z.uuid()]),
});
export type CreatePlanRequest = z.infer<typeof createPlanRequestSchema>;

export const respondToPlanRequestSchema = z.object({ response: z.enum(["accepted", "declined"]) });
