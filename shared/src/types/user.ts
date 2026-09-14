import { z } from "zod";
import { timezoneSchema } from "./timezone.js";

// public-safe user info, embedded in schedules/friends/plans
export const userPublicSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	avatarUrl: z.string(),
	bio: z.string(),
	timezone: timezoneSchema,
});
export type UserPublic = z.infer<typeof userPublicSchema>;

// full profile, returned from /api/profile and login/register
export const userSchema = z.object({
	id: z.uuid(),
	name: z.string(),
	email: z.email(),
	bio: z.string(),
	timezone: timezoneSchema,
	avatarUrl: z.string(),
});
export type User = z.infer<typeof userSchema>;

export const userSearchResultSchema = userPublicSchema;
export type UserSearchResult = z.infer<typeof userSearchResultSchema>;
