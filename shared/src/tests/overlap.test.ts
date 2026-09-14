import { describe, expect, it } from "vitest";
import { getTimeOverlapRepeating } from "../recurrence/overlap.js";
import { mondayAt } from "./testUtils.js";

describe("getTimeOverlapRepeating", () => {
	it("finds an overlap between two once schedules on the same day", () => {
		const a = { start: mondayAt(0, 10), end: mondayAt(0, 12), repeatType: "once" as const };
		const b = { start: mondayAt(0, 11), end: mondayAt(0, 13), repeatType: "once" as const };

		const result = getTimeOverlapRepeating(a, b, "UTC");

		expect(result).toBeDefined();
		expect(result?.start).toEqual(mondayAt(0, 11));
		expect(result?.end).toEqual(mondayAt(0, 12));
		expect(result?.repeatType).toBe("once");
	});

	it("rejects two once schedules on different days even if the times overlap", () => {
		const a = { start: mondayAt(0, 10), end: mondayAt(0, 12), repeatType: "once" as const };
		const b = { start: mondayAt(1, 10), end: mondayAt(1, 12), repeatType: "once" as const };

		expect(getTimeOverlapRepeating(a, b, "UTC")).toBeUndefined();
	});

	it("rejects two once schedules on the same day with non-overlapping times", () => {
		const a = { start: mondayAt(0, 9), end: mondayAt(0, 10), repeatType: "once" as const };
		const b = { start: mondayAt(0, 10), end: mondayAt(0, 11), repeatType: "once" as const };

		expect(getTimeOverlapRepeating(a, b, "UTC")).toBeUndefined();
	});

	it("matches a once schedule against a weekly schedule on the same weekday", () => {
		// mondayAt(7, ...) is the following Monday - weekly should still match on weekday alone
		const once = { start: mondayAt(7, 10), end: mondayAt(7, 12), repeatType: "once" as const };
		const weekly = { start: mondayAt(0, 11), end: mondayAt(0, 13), repeatType: "weekly" as const };

		const result = getTimeOverlapRepeating(once, weekly, "UTC");

		expect(result).toBeDefined();
		// the lower-rank (once) repeat type wins
		expect(result?.repeatType).toBe("once");
	});

	it("rejects a once schedule against a weekly schedule on a different weekday", () => {
		const once = { start: mondayAt(1, 10), end: mondayAt(1, 12), repeatType: "once" as const }; // tuesday
		const weekly = { start: mondayAt(0, 10), end: mondayAt(0, 12), repeatType: "weekly" as const }; // monday

		expect(getTimeOverlapRepeating(once, weekly, "UTC")).toBeUndefined();
	});

	it("matches a daily schedule against any weekday", () => {
		const daily = { start: mondayAt(0, 8), end: mondayAt(0, 22), repeatType: "daily" as const };
		const weekly = { start: mondayAt(4, 10), end: mondayAt(4, 12), repeatType: "weekly" as const }; // friday

		const result = getTimeOverlapRepeating(daily, weekly, "UTC");

		expect(result).toBeDefined();
		expect(result?.repeatType).toBe("weekly");
	});

	it("rejects two weekly schedules on different weekdays", () => {
		const a = { start: mondayAt(0, 10), end: mondayAt(0, 12), repeatType: "weekly" as const };
		const b = { start: mondayAt(2, 10), end: mondayAt(2, 12), repeatType: "weekly" as const }; // wednesday

		expect(getTimeOverlapRepeating(a, b, "UTC")).toBeUndefined();
	});

	it("matches two weekly schedules on the same weekday with overlapping times", () => {
		const a = { start: mondayAt(0, 10), end: mondayAt(0, 13), repeatType: "weekly" as const };
		const b = { start: mondayAt(7, 12), end: mondayAt(7, 15), repeatType: "weekly" as const };

		const result = getTimeOverlapRepeating(a, b, "UTC");

		expect(result).toBeDefined();
		expect(result?.repeatType).toBe("weekly");
	});

	it("still matches two weekly schedules on the same weekday when their start dates are many weeks apart", () => {
		// e.g. a permanent Monday slot created months ago vs. a new Monday slot created today -
		// comparing raw epoch instants here would wrongly report no overlap
		const createdMonthsAgo = { start: mondayAt(0, 10), end: mondayAt(0, 13), repeatType: "weekly" as const };
		const createdToday = { start: mondayAt(70, 12), end: mondayAt(70, 15), repeatType: "weekly" as const };

		const result = getTimeOverlapRepeating(createdMonthsAgo, createdToday, "UTC");

		expect(result).toBeDefined();
		expect(result?.repeatType).toBe("weekly");
	});

	it("still rejects two weekly schedules with non-overlapping times when their start dates are many weeks apart", () => {
		const createdMonthsAgo = { start: mondayAt(0, 9), end: mondayAt(0, 10), repeatType: "weekly" as const };
		const createdToday = { start: mondayAt(70, 10), end: mondayAt(70, 11), repeatType: "weekly" as const };

		expect(getTimeOverlapRepeating(createdMonthsAgo, createdToday, "UTC")).toBeUndefined();
	});
});
