import { useMemo, useState } from "react";
import { addDays, format, isToday, isTomorrow, startOfDay } from "date-fns";
import { useNavigate } from "react-router-dom";

import { useSchedule } from "../../contexts/SchedulesContext";
import { useFriends } from "../../contexts/FriendsContext";
import type { ScheduleInstance } from "../calendar/Instance";

import OverlapModal from "../calendar/OverlapModal";
import OverlapEntryCard from "./OverlapEntryCard";
import OverlapMark from "../ui/OverlapMark";
import EmptyState from "../ui/EmptyState";
import Button from "../ui/Button";

const LOOKAHEAD_DAYS = 14;

export default function OverlapsFeed() {
	const { buildScheduleInstances, userSchedules } = useSchedule();
	const { friends } = useFriends();
	const navigate = useNavigate();

	const [selectedInstance, setSelectedInstance] = useState<ScheduleInstance | null>(null);

	const hasFriends = friends.some((friend) => friend.status === "accepted");
	const hasAvailability = userSchedules.length > 0;

	const overlapInstances = useMemo(() => {
		const now = new Date();
		const rangeEnd = addDays(startOfDay(now), LOOKAHEAD_DAYS);

		return buildScheduleInstances(now, rangeEnd)
			.filter((instance) => instance.overlaps.length > 0 && instance.end > now)
			.sort((a, b) => a.start.getTime() - b.start.getTime());
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [buildScheduleInstances]);

	const dayGroups = useMemo(() => groupByDay(overlapInstances), [overlapInstances]);

	if (!hasFriends) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<EmptyState
					title="Add friends to get started"
					description="Once you're friends with someone, you'll see when you're both free right here."
					action={
						<Button onClick={() => navigate("/friends")} size="sm">
							Find friends
						</Button>
					}
				/>
			</div>
		);
	}

	if (!hasAvailability) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<EmptyState
					title="Post your availability"
					description="Add some availability on your calendar to start seeing overlaps with friends."
					action={
						<Button onClick={() => navigate("/calendar")} size="sm">
							Go to calendar
						</Button>
					}
				/>
			</div>
		);
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4">
			{showHero()}

			{dayGroups.length === 0 ? (
				<EmptyState
					className="mt-5"
					title="No overlaps in the next two weeks"
					description="Try adding more availability, or check back once your friends post theirs."
				/>
			) : (
				<div className="mt-5 space-y-6">
					{dayGroups.map(({ day, instances }) => (
						<div key={day.getTime()}>
							<h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-muted">{getDayLabel(day)}</h2>

							<div className="space-y-2.5">
								{instances.map((instance) => (
									<OverlapEntryCard key={instance.id} instance={instance} onClick={() => setSelectedInstance(instance)} />
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{selectedInstance && <OverlapModal instance={selectedInstance} onClose={() => setSelectedInstance(null)} />}
		</div>
	);

	function showHero() {
		return (
			<div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
				<OverlapMark size={48} className="shrink-0" />

				<div className="min-w-0">
					<h1 className="font-display text-xl font-semibold tracking-tight text-ink sm:text-2xl">When are you free together?</h1>

					<p className="mt-1 text-sm text-ink-muted">
						{overlapInstances.length === 0
							? "Nothing yet - check back soon."
							: `${overlapInstances.length} moment${overlapInstances.length === 1 ? "" : "s"} with friends in the next two weeks.`}
					</p>
				</div>
			</div>
		);
	}
}

/* ========================================================================= */
//                        helpers
/* ========================================================================= */

function groupByDay(instances: ScheduleInstance[]): { day: Date; instances: ScheduleInstance[] }[] {
	const groups = new Map<number, { day: Date; instances: ScheduleInstance[] }>();

	for (const instance of instances) {
		const day = startOfDay(instance.start);
		const key = day.getTime();

		const existing = groups.get(key);
		if (existing) existing.instances.push(instance);
		else groups.set(key, { day, instances: [instance] });
	}

	return [...groups.values()];
}

function getDayLabel(date: Date): string {
	if (isToday(date)) return "Today";
	if (isTomorrow(date)) return "Tomorrow";
	return format(date, "EEEE, MMMM d");
}
