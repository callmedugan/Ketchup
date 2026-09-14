import type { ScheduleActivePlan, ScheduleRepeatType, ScheduleWithUser } from "../types/schedule.js";

let counter = 0;

export function makeSchedule(
	start: Date,
	end: Date,
	repeatType: ScheduleRepeatType,
	userId = "user-a",
	plan: ScheduleActivePlan | null = null,
): ScheduleWithUser {
	counter += 1;
	return {
		id: `schedule-${counter}`,
		userId,
		repeatType,
		startTime: start,
		endTime: end,
		createdAt: start,
		updatedAt: start,
		user: { id: userId, name: userId, avatarUrl: "ketchup", bio: "", timezone: "UTC" },
		plan,
	};
}

export function makePlan(overrides: Partial<ScheduleActivePlan> = {}): ScheduleActivePlan {
	return { id: "plan-1", title: "Dinner", status: "pending", meetTime: mondayAt(0, 18), ...overrides };
}

// 2024-01-01 is a Monday (in UTC). Builds a genuine UTC instant so tests are
// deterministic regardless of the machine running them.
export function mondayAt(dayOffset: number, hour: number, minute = 0): Date {
	return new Date(Date.UTC(2024, 0, 1 + dayOffset, hour, minute, 0, 0));
}
