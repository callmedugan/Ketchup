import { useMemo, useState } from "react";
import { addDays, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useFriends } from "../../contexts/FriendsContext";
import { useSchedule } from "../../contexts/SchedulesContext";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import ScrollableContainer from "../common/ScrollableContainer";
import HoldButton from "../ui/HoldButton";
import type { SelectedFriendUser } from "./FriendsSplitView";
import type { ScheduleInstance } from "../calendar/Instance";

type FriendDetailsPaneProps = { activeUser: SelectedFriendUser | null };

const LOOKAHEAD_DAYS = 14;
const MAX_VISIBLE_OVERLAPS = 3;

export default function FriendDetailsPane({ activeUser }: FriendDetailsPaneProps) {
	const { getStatusDisplay, acceptFriend, declineFriend, cancelFriendRequest, removeFriend, blockFriend, unblockFriend, addFriend } = useFriends();
	const { buildScheduleInstances, fetchScheduleData } = useSchedule();
	const navigate = useNavigate();

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const friendId = activeUser?.type === "friend" && activeUser.data.status === "accepted" ? activeUser.data.id : undefined;

	// next few upcoming moments where this specific friend's availability overlaps with the user's own,
	// not yet committed to a plan - lets someone jump straight to "make plans with them" from their profile
	const upcomingOverlaps = useMemo(() => {
		if (!friendId) return [];

		const now = new Date();
		const rangeEnd = addDays(now, LOOKAHEAD_DAYS);

		const overlaps: { instance: ScheduleInstance; overlap: ScheduleInstance["overlaps"][number] }[] = [];

		for (const instance of buildScheduleInstances(now, rangeEnd)) {
			if (instance.plan || instance.end <= now) continue;

			for (const overlap of instance.overlaps) {
				if (overlap.user.id === friendId && overlap.end > now) {
					overlaps.push({ instance, overlap });
				}
			}
		}

		overlaps.sort((a, b) => a.overlap.start.getTime() - b.overlap.start.getTime());

		return overlaps.slice(0, MAX_VISIBLE_OVERLAPS);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [friendId, buildScheduleInstances]);

	if (!activeUser) {
		return <div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">{showEmptyState()}</div>;
	}

	const user = activeUser.data;
	const friend = activeUser.type === "friend" ? activeUser.data : undefined;
	const status = friend ? getStatusDisplay(friend) : null;

	/* ========================================================================= */
	// handlers
	/* ========================================================================= */

	async function handleAction(action: () => Promise<unknown>, onSuccess?: () => Promise<unknown>) {
		setError(null);
		setIsSubmitting(true);

		try {
			await action();
			await onSuccess?.();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong.");
		} finally {
			setIsSubmitting(false);
		}
	}

	// accepting/removing/blocking a friend changes whose availability the server will include as
	// "friendSchedules", so the calendar's cached schedule data needs a refetch to pick up the change -
	// otherwise a newly-accepted friend's overlaps (or a removed friend's) won't show until a reload
	async function handleAccept() {
		if (!friend) return;
		await handleAction(() => acceptFriend(friend.id), fetchScheduleData);
	}

	async function handleDecline() {
		if (!friend) return;
		await handleAction(() => declineFriend(friend.id));
	}

	async function handleCancelRequest() {
		if (!friend) return;
		await handleAction(() => cancelFriendRequest(friend.id));
	}

	async function handleRemove() {
		if (!friend) return;
		await handleAction(() => removeFriend(friend.id), fetchScheduleData);
	}

	async function handleBlock() {
		await handleAction(() => blockFriend(user.id), fetchScheduleData);
	}

	async function handleUnblock() {
		if (!friend) return;
		await handleAction(() => unblockFriend(friend.id));
	}

	async function handleAddFriend() {
		await handleAction(() => addFriend(user.id));
	}

	/* ========================================================================= */
	// display
	/* ========================================================================= */

	function showHeader() {
		return (
			<div className="shrink-0 border-b border-border bg-surface-sunken px-6 py-3">
				<p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Profile</p>
			</div>
		);
	}

	function showUpcomingOverlaps() {
		if (!friendId) return null;

		return (
			<section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
				<div className="border-b border-border px-5 py-3">
					<p className="text-sm font-bold text-ink">Upcoming overlaps</p>
				</div>

				<div className="p-3 sm:p-4">
					{upcomingOverlaps.length === 0 ? (
						<p className="px-2 py-3 text-sm font-medium text-ink-muted">No shared free time in the next two weeks yet.</p>
					) : (
						<div className="space-y-2">
							{upcomingOverlaps.map(({ instance, overlap }) => (
								<div
									key={`${overlap.scheduleId}:${overlap.start.toISOString()}`}
									className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-sunken px-3 py-2.5"
								>
									<div className="min-w-0">
										<p className="text-sm font-bold text-ink">{format(overlap.start, "EEE, MMM d")}</p>
										<p className="mt-0.5 text-xs font-medium text-ink-muted">
											{format(overlap.start, "p")} – {format(overlap.end, "p")}
										</p>
									</div>

									<Button
										size="sm"
										onClick={() =>
											navigate("/plans", {
												state: { newPlanOverlap: overlap, userScheduleId: instance.scheduleId },
											})
										}
									>
										Make plans
									</Button>
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		);
	}

	function showProfile() {
		return (
			<section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
				<div className="p-5">
					<div className="flex items-start gap-4">
						<Avatar name={user.name} rawUrl={user.avatarUrl} variant="large" />

						<div className="min-w-0 flex-1">
							<h2 className="truncate text-xl font-bold text-ink">{user.name}</h2>

							{friend && status && (
								<Badge tone={status.tone} className="mt-1">
									{status.text}
								</Badge>
							)}
						</div>
					</div>

					<div className="mt-5 space-y-4 border-t border-border pt-4">
						{user.bio && (
							<div className="flex items-baseline gap-5">
								<p className="friend-info-label">About</p>
								<p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">{user.bio}</p>
							</div>
						)}
						{user.timezone && (
							<div className="flex items-baseline gap-5">
								<p className="friend-info-label">Timezone</p>
								<p className="text-sm font-bold text-ink">{user.timezone}</p>
							</div>
						)}
					</div>
				</div>
			</section>
		);
	}

	function showError() {
		if (!error) return null;

		return <p className="rounded-xl border border-danger/20 bg-danger-tint px-4 py-3 text-sm font-medium text-danger">{error}</p>;
	}

	function showActions() {
		let primaryActions = null;

		if (!friend) {
			primaryActions = (
				<Button onClick={handleAddFriend} disabled={isSubmitting}>
					{isSubmitting ? "Sending..." : "Send friend request"}
				</Button>
			);
		} else if (friend.status === "requested" && friend.requestDirection === "received") {
			primaryActions = (
				<>
					<HoldButton onComplete={handleDecline} disabled={isSubmitting} variant="secondary">
						Decline
					</HoldButton>

					<Button onClick={handleAccept} disabled={isSubmitting}>
						{isSubmitting ? "Accepting..." : "Accept request"}
					</Button>
				</>
			);
		} else if (friend.status === "requested" && friend.requestDirection === "sent") {
			primaryActions = (
				<HoldButton onComplete={handleCancelRequest} disabled={isSubmitting} variant="secondary">
					Cancel request
				</HoldButton>
			);
		} else if (friend.status === "accepted") {
			primaryActions = (
				<HoldButton onComplete={handleRemove} disabled={isSubmitting} variant="secondary">
					Remove friend
				</HoldButton>
			);
		}

		const isBlockedByUser = friend?.status === "blocked" && friend.requestDirection === "sent";

		if (isBlockedByUser) {
			return (
				<div className="flex justify-end">
					<Button variant="secondary" onClick={handleUnblock} disabled={isSubmitting}>
						Unblock
					</Button>
				</div>
			);
		}

		return (
			<div className="flex justify-end gap-3">
				{primaryActions}

				<HoldButton onComplete={handleBlock} disabled={isSubmitting} variant="danger">
					Block
				</HoldButton>
			</div>
		);
	}

	return (
		<div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
			{showHeader()}

			<ScrollableContainer className="p-5 sm:p-6">
				<div className="mx-auto max-w-2xl space-y-5">
					{showProfile()}
					{showUpcomingOverlaps()}
					{showError()}
					{showActions()}
				</div>
			</ScrollableContainer>
		</div>
	);
}

function showEmptyState() {
	return (
		<div className="flex h-full min-h-100 items-center justify-center p-8">
			<div className="max-w-sm text-center">
				<h2 className="text-lg font-bold text-ink">Select a person</h2>

				<p className="mt-1 text-sm font-medium text-ink-muted">Choose someone from the list to view their profile.</p>
			</div>
		</div>
	);
}
