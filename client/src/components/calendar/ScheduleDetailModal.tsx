import { differenceInMinutes, format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ScheduleInstance } from "./Instance";
import type { Plan } from "../../utils/types";

import { useSchedule } from "../../contexts/SchedulesContext";
import { usePlans } from "../../contexts/PlansContext";

import Avatar from "../ui/Avatar";
import Button from "../ui/Button";
import ScrollableContainer from "../common/ScrollableContainer";
import Modal from "../ui/Modal";
import HoldButton from "../ui/HoldButton";
import EmptyState from "../ui/EmptyState";
import Badge from "../ui/Badge";

type ScheduleOverlap = ScheduleInstance["overlaps"][number];

type ScheduleDetailModalProps = {
	instance: ScheduleInstance;
	onClose: () => void;
};

export default function ScheduleDetailModal({ instance, onClose }: ScheduleDetailModalProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { deleteUserSchedule } = useSchedule();
	const { plans } = usePlans();
	const navigate = useNavigate();

	const hasPassed = instance.end <= new Date();
	// a schedule can only ever be committed to one active plan at a time (enforced server-side too) -
	// once it has one, every overlap on this instance is blocked from starting another
	const hasExistingPlan = !!instance.plan;

	// instance.plan only carries id/title/status/meetTime (see ScheduleActivePlan) - the full record
	// with the friend's identity and plan details lives in PlansContext, already fetched for the user
	const plan = instance.plan ? plans.find((candidate) => candidate.id === instance.plan!.id) : undefined;

	const overlaps = [...instance.overlaps].sort((a, b) => differenceInMinutes(b.end, b.start) - differenceInMinutes(a.end, a.start));

	const friendCount = new Set(overlaps.map((overlap) => overlap.user.id)).size;

	/* ========================================================================= */
	//                        handlers
	/* ========================================================================= */

	async function handleDeleteSchedule() {
		setLoading(true);
		setError(null);

		try {
			await deleteUserSchedule(instance.scheduleId);
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to delete schedule");
		} finally {
			setLoading(false);
		}
	}

	/* ========================================================================= */
	//                        page
	/* ========================================================================= */

	return (
		<Modal title="Availability" onClose={onClose} className={hasPassed ? "bg-surface-sunken" : ""}>
			{/* Schedule info */}
			<div className={`shrink-0 border-b border-border px-4 py-3 sm:px-5 ${hasPassed ? "bg-surface-sunken" : "bg-surface-sunken/60"}`}>
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0">
						<p className={`text-sm font-bold ${hasPassed ? "text-ink-muted/70" : "text-ink"}`}>{format(instance.start, "EEEE, MMMM d")}</p>

						<p className={`mt-0.5 text-xs font-medium sm:text-sm ${hasPassed ? "text-ink-muted/60" : "text-ink-muted"}`}>
							{format(instance.start, "p")} – {format(instance.end, "p")}
						</p>
					</div>

					{!instance.plan && !hasPassed && friendCount > 0 && (
						<div className="shrink-0 rounded-full border border-accent-light/40 bg-accent-tint px-2.5 py-1 text-[10px] font-bold text-accent-dark sm:text-xs">
							{friendCount} friend
							{friendCount !== 1 && "s"} free
						</div>
					)}
				</div>
			</div>

			{/* Overlaps, or the plan this schedule is already committed to */}
			<ScrollableContainer className="min-h-0 flex-1 px-3 py-3 sm:px-5 sm:py-4">
				{plan ? (
					showPlannedDetails(plan)
				) : (
					<div className="space-y-2">
						{overlaps.length > 0 ? overlaps.map(showOverlap) : <EmptyState title="No overlap yet" description="No friends are free during this availability." />}
					</div>
				)}
			</ScrollableContainer>

			{/* Error */}
			{error && (
				<div role="alert" className="mx-4 mb-2 rounded-lg bg-danger-tint px-3 py-2 text-center text-xs font-medium text-danger sm:mx-5 sm:text-sm">
					{error}
				</div>
			)}

			{/* Footer */}
			<div className="shrink-0 border-t border-border bg-surface p-3 sm:p-4">
				<HoldButton variant="danger" onComplete={handleDeleteSchedule} disabled={loading} className="w-full">
					{loading ? "Deleting..." : "Delete availability"}
				</HoldButton>
			</div>
		</Modal>
	);

	/* ========================================================================= */
	//                        planned
	/* ========================================================================= */

	function showPlannedDetails(plan: Plan) {
		return (
			<div className="space-y-4">
				<div className="flex items-center gap-3 sm:gap-5">
					<p className="plan-label">With</p>

					<div className="flex min-w-0 items-center gap-2.5">
						<Avatar name={plan.friendName} rawUrl={plan.friendAvatarUrl} />
						<p className="truncate text-sm font-bold text-ink">{plan.friendName}</p>
					</div>
				</div>

				<div className="flex items-start gap-3 sm:gap-5">
					<p className="plan-label">What</p>
					<p className="min-w-0 text-sm font-bold text-ink">{plan.title}</p>
				</div>

				<div className="flex items-start gap-3 sm:gap-5">
					<p className="plan-label">When</p>
					<p className="min-w-0 text-sm font-bold text-ink">{format(plan.meetTime, "EEEE, MMMM d 'at' h:mm a")}</p>
				</div>

				{(plan.location || plan.comments) && (
					<div className="flex items-start gap-3 sm:gap-5">
						<p className="plan-label">Details</p>
						<div className="min-w-0 flex-1 space-y-1">
							{plan.location && <p className="text-sm font-bold text-ink">{plan.location}</p>}
							{plan.comments && <p className="whitespace-pre-wrap text-sm text-ink-muted">{plan.comments}</p>}
						</div>
					</div>
				)}

				<div className="flex items-start gap-3 sm:gap-5">
					<p className="plan-label mt-1">Status</p>
					<Badge tone={plan.status === "confirmed" ? "success" : "warning"}>{plan.status === "confirmed" ? "Confirmed" : "Pending"}</Badge>
				</div>

				<Button variant="secondary" onClick={() => navigate("/plans")} className="w-full">
					View plan
				</Button>
			</div>
		);
	}

	/* ========================================================================= */
	//                        overlap
	/* ========================================================================= */

	function showOverlap(overlap: ScheduleOverlap) {
		const overlapId = `${overlap.scheduleId}:${overlap.start.toISOString()}`;

		return (
			<div key={overlapId} className={`card p-3 ${hasPassed ? "opacity-60" : ""}`}>
				<div className="flex items-center gap-2.5 sm:gap-3">
					<Avatar name={overlap.user.name} rawUrl={overlap.user.avatarUrl} />

					{showFriendInfo(overlap)}
				</div>

				<button
					type="button"
					disabled={hasPassed || hasExistingPlan}
					onClick={() => {
						navigate("/plans", {
							state: {
								newPlanOverlap: overlap,
								userScheduleId: instance.scheduleId,
							},
						});
					}}
					className={`
						mt-2.5 w-full
						${
							hasPassed || hasExistingPlan
								? "cursor-not-allowed rounded-lg bg-surface-sunken px-3 py-2 text-xs font-bold text-ink-muted/70 sm:px-4 sm:py-2.5 sm:text-sm"
								: "btn-primary"
						}
					`}
				>
					{hasPassed ? "Expired" : hasExistingPlan ? "Already planned" : "Make plans"}
				</button>
			</div>
		);
	}

	/* ========================================================================= */
	//                        friend info
	/* ========================================================================= */

	function showFriendInfo(overlap: ScheduleOverlap) {
		const minutes = differenceInMinutes(overlap.end, overlap.start);

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		let duration: string;

		if (hours === 0) {
			duration = `${minutes} min${minutes !== 1 ? "s" : ""}`;
		} else if (remainingMinutes === 0) {
			duration = `${hours} hr${hours !== 1 ? "s" : ""}`;
		} else {
			duration = `${hours} hr${hours !== 1 ? "s" : ""} ` + `${remainingMinutes} min${remainingMinutes !== 1 ? "s" : ""}`;
		}

		return (
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-ink">{overlap.user.name}</div>

				<p className="mt-0.5 text-xs font-medium text-ink-muted sm:text-sm">
					{format(overlap.start, "p")} – {format(overlap.end, "p")} · {duration}
				</p>
			</div>
		);
	}
}
