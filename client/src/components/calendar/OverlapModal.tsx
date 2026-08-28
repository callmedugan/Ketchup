import { differenceInMinutes, format } from "date-fns";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import type { MatchedSchedule, Schedule } from "../../utils/types";
import { useSchedule } from "../../contexts/SchedulesContext";

import Avatar from "../common/Avatar";
import ScrollableContainer from "../common/ScrollableContainer";
import ModalContainer from "../common/ModalContainer";
import ModalHeader from "../common/ModalHeader";
import HoldButton from "../common/HoldButton";

type OverlapModalProps = {
	noteSchedule: Schedule;
	noteOverlaps: MatchedSchedule[];
	noteStartTime: Date;
	noteEndTime: Date;
	hasPassed: boolean;
	onClose: () => void;
	onDeleted: () => void;
};

export default function OverlapModal({ noteSchedule, noteOverlaps, noteStartTime, noteEndTime, hasPassed, onClose, onDeleted }: OverlapModalProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const { deleteUserSchedule } = useSchedule();
	const navigate = useNavigate();

	const overlaps = [...noteOverlaps].sort((a, b) => differenceInMinutes(b.endTime, b.startTime) - differenceInMinutes(a.endTime, a.startTime));

	async function handleDeleteSchedule() {
		setLoading(true);
		setError(null);

		deleteUserSchedule(noteSchedule.id)
			.then(() => {
				onClose();
				onDeleted();
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setLoading(false);
			});
	}

	return (
		<ModalContainer onClose={onClose} className={hasPassed ? "bg-stone-100" : ""}>
			<ModalHeader title="Who else is free?" onClose={onClose} />

			{/* Schedule info */}
			<div className={`shrink-0 border-b border-stone-200 px-4 py-3 sm:px-5 ${hasPassed ? "bg-stone-50" : "bg-brand-surface"}`}>
				<p className={`text-sm font-bold ${hasPassed ? "text-brand-muted/70" : "text-brand-text"}`}>{format(noteStartTime, "EEEE, MMMM d")}</p>

				<p className={`mt-0.5 text-xs font-medium sm:text-sm ${hasPassed ? "text-brand-muted/60" : "text-brand-muted"}`}>
					{format(noteStartTime, "p")} – {format(noteEndTime, "p")}
				</p>
			</div>

			{/* Overlaps */}
			<ScrollableContainer className="min-h-0 flex-1 px-3 py-3 sm:px-5 sm:py-4">
				<div className="space-y-2">
					{overlaps.length > 0 ? (
						overlaps.map((overlap) => showOverlap(overlap))
					) : (
						<div className="rounded-xl border border-stone-200 bg-white px-4 py-5 text-center">
							<p className={`text-xs font-medium sm:text-sm ${hasPassed ? "text-brand-muted/60" : "text-brand-muted"}`}>
								None of your friends are free during this time.
							</p>
						</div>
					)}
				</div>
			</ScrollableContainer>

			{/* Error */}
			{error && (
				<div role="alert" className="mx-4 mb-2 rounded-lg bg-red-50 px-3 py-2 text-center text-xs font-medium text-red-700 sm:mx-5 sm:text-sm">
					{error}
				</div>
			)}

			{/* Footer */}
			<div className="shrink-0 border-t border-stone-200 bg-brand-card p-3 sm:p-4">
				<HoldButton variant="danger" onComplete={handleDeleteSchedule} disabled={loading} className="mt-3 w-full">
					{loading ? "Deleting..." : "Delete schedule"}
				</HoldButton>
			</div>
		</ModalContainer>
	);

	function showOverlap(overlap: MatchedSchedule) {
		return (
			<div key={overlap.id} className={`rounded-xl border border-stone-200 bg-white p-3 shadow-sm ${hasPassed ? "opacity-60" : ""}`}>
				<div className="flex items-center gap-2.5 sm:gap-3">
					<Avatar name={overlap.friendName} rawUrl={overlap.friendAvatarUrl} />

					{showFriendInfo(overlap)}
				</div>

				<button
					type="button"
					disabled={hasPassed}
					onClick={() => {
						navigate("/plans", { state: { overlap } });
					}}
					className={`mt-2.5 w-full rounded-lg px-3 py-2 text-xs font-bold transition active:scale-[0.98] sm:text-sm ${
						hasPassed ? "cursor-not-allowed bg-stone-200 text-brand-muted/70" : "bg-brand-red text-white hover:bg-brand-red-dark active:bg-brand-red-dark"
					}`}
				>
					{hasPassed ? "Expired" : "Make plans!"}
				</button>
			</div>
		);
	}

	function showFriendInfo(overlap: MatchedSchedule) {
		const minutes = differenceInMinutes(overlap.endTime, overlap.startTime);

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		let duration: string;

		if (hours === 0) {
			duration = `${minutes} min${minutes !== 1 ? "s" : ""}`;
		} else if (remainingMinutes === 0) {
			duration = `${hours} hr${hours !== 1 ? "s" : ""}`;
		} else {
			duration = `${hours} hr${hours !== 1 ? "s" : ""} ${remainingMinutes} min${remainingMinutes !== 1 ? "s" : ""}`;
		}

		let durationStyle = "text-brand-muted";

		if (minutes >= 180) {
			durationStyle = "text-green-700";
		} else if (minutes >= 60) {
			durationStyle = "text-amber-700";
		}

		return (
			<div className="min-w-0 flex-1">
				<div className="truncate text-sm font-semibold text-brand-text">{overlap.friendName}</div>

				<p className={`mt-0.5 text-xs font-bold sm:text-sm ${durationStyle}`}>{duration}</p>
			</div>
		);
	}
}
