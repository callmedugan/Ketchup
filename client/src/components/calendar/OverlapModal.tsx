import { differenceInMinutes, format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { ScheduleInstance } from "./Instance";

import { useSchedule } from "../../contexts/SchedulesContext";

import Avatar from "../ui/Avatar";
import ScrollableContainer from "../common/ScrollableContainer";
import Modal from "../ui/Modal";
import HoldButton from "../ui/HoldButton";
import EmptyState from "../ui/EmptyState";

type ScheduleOverlap = ScheduleInstance["overlaps"][number];

type OverlapModalProps = {
	instance: ScheduleInstance;
	onClose: () => void;
};

export default function OverlapModal({ instance, onClose }: OverlapModalProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { deleteUserSchedule } = useSchedule();
	const navigate = useNavigate();

	const hasPassed = instance.end <= new Date();

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

					{!hasPassed && friendCount > 0 && (
						<div className="shrink-0 rounded-full border border-brand-red-light/40 bg-brand-red-tint px-2.5 py-1 text-[10px] font-bold text-brand-red-dark sm:text-xs">
							{friendCount} friend
							{friendCount !== 1 && "s"} free
						</div>
					)}
				</div>
			</div>

			{/* Overlaps */}
			<ScrollableContainer className="min-h-0 flex-1 px-3 py-3 sm:px-5 sm:py-4">
				<div className="space-y-2">
					{overlaps.length > 0 ? (
						overlaps.map(showOverlap)
					) : (
						<EmptyState title="No overlap yet" description="No friends are free during this availability." />
					)}
				</div>
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
					disabled={hasPassed}
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
							hasPassed
								? "cursor-not-allowed rounded-xl bg-surface-sunken px-3 py-2 text-xs font-bold text-ink-muted/70 sm:px-4 sm:py-2.5 sm:text-sm"
								: "btn-primary"
						}
					`}
				>
					{hasPassed ? "Expired" : "Make plans"}
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

		let durationStyle = "text-ink-muted";

		if (minutes >= 180) {
			durationStyle = "text-success";
		} else if (minutes >= 60) {
			durationStyle = "text-brand-mustard-dark";
		}

		return (
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-ink">{overlap.user.name}</div>

				<p className={`mt-0.5 text-xs font-bold sm:text-sm ${durationStyle}`}>{duration}</p>

				<p className="mt-0.5 text-[10px] font-medium text-ink-muted sm:text-xs">
					{format(overlap.start, "p")} – {format(overlap.end, "p")}
				</p>
			</div>
		);
	}
}
