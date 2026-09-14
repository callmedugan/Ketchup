import { buildUserInstances, scheduleWithUserSchema } from "@ketchup/shared";
import type { ScheduleInstance, ScheduleWithUser } from "@ketchup/shared";

export { buildUserInstances };
export type { ScheduleInstance };

// kept under this app's existing naming for the raw API shape
export const scheduleWithUserInfoSchema = scheduleWithUserSchema;
export type ScheduleWithUserInfo = ScheduleWithUser;
