export type Schedule = {
	days: [Day];
};

export function addNewDayToSchedule(day: Day, sch: Schedule) {
	sch.days.push(day);
}

export function removeDayFromSchedule(day: Day, sch: Schedule) {
	//probably use a db
}

export type Day = {
	//time is in 24 hr time so 0 - 2400
	date: Date;
	start: number;
	end: number;
};

export function getDayOpenRange(day: Day): [number, number] {
	return [day.start, day.end];
}

export function getDaysCommonOpenRange(first: Day, second: Day): [number, number] | undefined {
	const otherFree = getDayOpenRange(second);
	const thisFree = getDayOpenRange(first);
	const start = Math.max(thisFree[0], otherFree[0]);
	const end = Math.min(thisFree[1], otherFree[1]);
	return start < end ? [start, end] : undefined;
}

export function dayIsOpen(day: Day): boolean {
	return day.start === 0 && day.end === 2400;
}
