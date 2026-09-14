import { describe, expect, it } from "vitest";
import { findScheduleDailyLimitViolation, type ScheduleForDailyLimitCheck } from "../recurrence/dailyLimit.js";
import { mondayAt } from "./testUtils.js";

const TIMEZONE = "UTC";

function once(dayOffset: number, hour = 9): ScheduleForDailyLimitCheck {
	return { startTime: mondayAt(dayOffset, hour), repeatType: "once" };
}

describe("findScheduleDailyLimitViolation", () => {
	it("allows a new schedule when the day is under the limit", () => {
		const existing = [once(0, 8), once(0, 10)];
		const newSchedule = once(0, 12);

		expect(findScheduleDailyLimitViolation(existing, newSchedule, TIMEZONE, 4)).toBeUndefined();
	});

	it("blocks a new once schedule that would push the day over the limit", () => {
		const existing = [once(0, 6), once(0, 8), once(0, 10), once(0, 12)];
		const newSchedule = once(0, 14);

		const violation = findScheduleDailyLimitViolation(existing, newSchedule, TIMEZONE, 4);

		expect(violation).toBeDefined();
	});

	it("does not count schedules on other days", () => {
		const existing = [once(1, 8), once(1, 10), once(1, 12), once(1, 14)];
		const newSchedule = once(0, 9);

		expect(findScheduleDailyLimitViolation(existing, newSchedule, TIMEZONE, 4)).toBeUndefined();
	});

	it("blocks a new weekly schedule if any matching weekday within its first cycle is already at the limit", () => {
		// four existing "once" schedules that land on the Monday three weeks out
		const existing = [once(21, 6), once(21, 8), once(21, 10), once(21, 12)];
		const newSchedule: ScheduleForDailyLimitCheck = { startTime: mondayAt(0, 9), repeatType: "weekly" };

		const violation = findScheduleDailyLimitViolation(existing, newSchedule, TIMEZONE, 4);

		expect(violation).toBeDefined();
	});

	it("a daily schedule counts toward the limit on the day a once schedule occurs", () => {
		const existing: ScheduleForDailyLimitCheck[] = [
			{ startTime: mondayAt(0, 6), repeatType: "daily" },
			once(0, 8),
			once(0, 10),
			once(0, 12),
		];
		const newSchedule = once(0, 14);

		const violation = findScheduleDailyLimitViolation(existing, newSchedule, TIMEZONE, 4);

		expect(violation).toBeDefined();
	});
});
