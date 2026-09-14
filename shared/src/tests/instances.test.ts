import { describe, expect, it } from "vitest";
import { buildInstances, buildUserInstances } from "../recurrence/instances.js";
import { makeSchedule, mondayAt } from "./testUtils.js";

describe("buildInstances", () => {
	it("expands a weekly schedule into one instance per week within the range", () => {
		const schedule = makeSchedule(mondayAt(0, 9), mondayAt(0, 10), "weekly");

		const instances = buildInstances([schedule], mondayAt(0, 0), mondayAt(21, 0));

		expect(instances).toHaveLength(3);
		expect(instances.map((instance) => instance.start)).toEqual([mondayAt(0, 9), mondayAt(7, 9), mondayAt(14, 9)]);
	});

	it("expands a daily schedule into one instance per day within the range", () => {
		const schedule = makeSchedule(mondayAt(0, 9), mondayAt(0, 10), "daily");

		const instances = buildInstances([schedule], mondayAt(0, 0), mondayAt(3, 0));

		expect(instances).toHaveLength(3);
	});

	it("includes a once schedule only if it falls within the range", () => {
		const inRange = makeSchedule(mondayAt(2, 9), mondayAt(2, 10), "once");
		const outOfRange = makeSchedule(mondayAt(30, 9), mondayAt(30, 10), "once");

		const instances = buildInstances([inRange, outOfRange], mondayAt(0, 0), mondayAt(7, 0));

		expect(instances).toHaveLength(1);
		expect(instances[0]?.scheduleId).toBe(inRange.id);
	});
});

describe("buildUserInstances", () => {
	it("attaches a friend's overlapping instance to the user's instance", () => {
		const userSchedule = makeSchedule(mondayAt(0, 9), mondayAt(0, 11), "once", "user-a");
		const friendSchedule = makeSchedule(mondayAt(0, 10), mondayAt(0, 12), "once", "user-b");

		const instances = buildUserInstances([userSchedule], [friendSchedule], mondayAt(0, 0), mondayAt(1, 0), "UTC");

		expect(instances).toHaveLength(1);
		expect(instances[0]?.overlaps).toHaveLength(1);
		expect(instances[0]?.overlaps[0]?.scheduleId).toBe(friendSchedule.id);
	});

	it("finds no overlap when the user and friend are never free at the same time", () => {
		const userSchedule = makeSchedule(mondayAt(0, 9), mondayAt(0, 10), "once", "user-a");
		const friendSchedule = makeSchedule(mondayAt(0, 11), mondayAt(0, 12), "once", "user-b");

		const instances = buildUserInstances([userSchedule], [friendSchedule], mondayAt(0, 0), mondayAt(1, 0), "UTC");

		expect(instances[0]?.overlaps).toHaveLength(0);
	});
});
