import { z } from "zod";
import {
	friendSchema,
	planDataSchema,
	presetAvatarStrings,
	isPresetAvatar,
	timezoneSchema,
	userSchema,
	userSearchResultSchema,
	type Friend,
	type FriendStatus,
	type PlanData,
	type PlanStatus,
	type PresetAvatarType,
	type ScheduleRepeatType,
	type Timezone,
	type User,
	type UserSearchResult,
} from "@ketchup/shared";

export { friendSchema, isPresetAvatar, planDataSchema, presetAvatarStrings, timezoneSchema, userSchema, userSearchResultSchema };
export type { Friend, FriendStatus as FriendStatusType, PlanData, PlanStatus, PresetAvatarType, ScheduleRepeatType, Timezone, User, UserSearchResult };

/* ========================================================================= */
//                        shared helpers
/* ========================================================================= */

function parseOneOrMany<T>(schema: z.ZodType<T>, data: unknown): T[] | undefined {
	const arrayResult = z.array(schema).safeParse(data);
	if (arrayResult.success) return arrayResult.data;
	const singleResult = schema.safeParse(data);
	if (singleResult.success) return [singleResult.data];
	return undefined;
}

export function getFriendsFromParsedJson(data: unknown): Friend[] | undefined {
	return parseOneOrMany(friendSchema, data);
}

export function getUserFromParsedJson(data: unknown): User | undefined {
	const result = userSchema.safeParse(data);
	if (!result.success) return undefined;
	return result.data;
}

export function getUserSearchResultsFromParsedJson(data: unknown): UserSearchResult[] | undefined {
	return parseOneOrMany(userSearchResultSchema, data);
}

export function getPlansFromParsedJson(data: unknown): PlanData[] | undefined {
	return parseOneOrMany(planDataSchema, data);
}

/* ========================================================================= */
//                        plans (frontend-only extension)
/* ========================================================================= */

// the client joins each plan with its friend's display info, resolved from FriendsContext
export const planSchema = planDataSchema.extend({
	friendName: z.string(),
	friendAvatarUrl: z.string(),
});

export type Plan = z.infer<typeof planSchema>;
