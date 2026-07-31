class Day {
	//time is in 24 hr time so 0 - 2400
	date: Date;
	start: number;
	end: number;

	constructor(date: Date, start?: number, end?: number) {
		this.date = date;
		this.start = start ?? 0;
		this.end = end ?? 0;
	}

	getAvailability(): [number, number] {
		return [this.start, this.end];
	}

	getCommonAvailibility(other: Day): [number, number] | undefined {
		const otherAvail = other.getAvailability();
		const thisAvail = this.getAvailability();
		const start = Math.max(thisAvail[0], otherAvail[0]);
		const end = Math.min(thisAvail[1], otherAvail[1]);
		return start < end ? [start, end] : undefined;
	}

	isAllDay(): boolean {
		return this.start === 0 && this.end === 2400;
	}
}

type User = {
	schedule: [Day];
};

const userA = new Day(new Date(), 1200, 1300);
const userB = new Day(new Date(), 800, 1201);

console.log(userA.getCommonAvailibility(userB));
