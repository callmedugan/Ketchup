import { z } from "zod";
import { timezoneSchema } from "./timezone.js";

export const friendStatusSchema = z.enum(["requested", "accepted", "declined", "blocked"]);
export type FriendStatus = z.infer<typeof friendStatusSchema>;

export const friendSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	bio: z.string(),
	timezone: timezoneSchema,
	avatarUrl: z.string(),
	status: friendStatusSchema,
	requestDirection: z.enum(["sent", "received"]),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});
export type Friend = z.infer<typeof friendSchema>;

/* ========================================================================= */
//                        API request shapes
/* ========================================================================= */

export const requestFriendRequestSchema = z.object({ friendId: z.uuid().min(1, "friendId cannot be blank") });
export const respondToFriendRequestBodySchema = z.object({ response: z.enum(["accepted", "declined"]) });
export const removeFriendRequestSchema = z.object({ friendId: z.uuid().min(1, "friendId cannot be blank") });
