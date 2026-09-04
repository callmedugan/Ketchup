import { useState, type SubmitEvent } from "react";
import { addMinutes, differenceInMinutes, format } from "date-fns";
import type { ScheduleInstance } from "../../utils/types";
import { usePlans } from "../../contexts/PlansContext";
import ModalContainer from "../common/ModalContainer";
import ModalHeader from "../common/ModalHeader";
import Avatar from "../common/Avatar";

type ScheduleOverlap = ScheduleInstance["overlaps"][number];

type NewPlanModalProps = {
	overlap: ScheduleOverlap;
	userScheduleId: string;
	onClose: () => void;
};

export default function NewPlanModal({ overlap, userScheduleId, onClose }: NewPlanModalProps) {
	const [title, setTitle] = useState("");
	const [location, setLocation] = useState("");
	const [comments, setComments] = useState("");
	const [startOffset, setStartOffset] = useState(0);

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { addPlan } = usePlans();

	const overlapMinutes = differenceInMinutes(overlap.end, overlap.start);

	const maxStartOffset = Math.max(0, overlapMinutes - 15);

	const meetTime = addMinutes(overlap.start, startOffset);

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setError(null);
		setIsSubmitting(true);

		try {
			await addPlan(overlap.user.id, title, comments, meetTime, location, [userScheduleId, overlap.id]);

			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong while creating the plan.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<ModalContainer onClose={onClose}>
			<ModalHeader title="New Plan" onClose={onClose} />

			<form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
				<section>
					<div className="rounded-xl border border-stone-200 bg-brand-surface p-3 sm:p-4">
						<div className="space-y-4 sm:space-y-5">
							{/* When */}
							<div>
								<div className="flex items-baseline gap-3 sm:gap-4">
									<p className="plan-label">When</p>

									<p className="text-xs font-bold text-brand-text sm:text-sm">{format(meetTime, "EEE, MMM d ' @ ' h:mm a")}</p>
								</div>

								<div className="ml-12 mt-2 sm:ml-18">
									{showSlider()}

									<div className="mt-1.5 flex justify-between text-[10px] text-brand-muted sm:text-xs">
										<span>{format(overlap.start, "h:mm a")}</span>

										<span>{format(overlap.end, "h:mm a")}</span>
									</div>
								</div>
							</div>

							{/* With */}
							<div className="flex items-center gap-3">
								<p className="plan-label">With</p>

								<div className="flex min-w-0 items-center gap-2.5">
									<Avatar name={overlap.user.name} rawUrl={overlap.user.avatarUrl} />

									<p className="truncate text-xs font-bold text-brand-text sm:text-sm">{overlap.user.name}</p>
								</div>
							</div>

							{/* Where */}
							<div className="flex items-start gap-3">
								<label htmlFor="plan-location" className="plan-label">
									Where
								</label>

								<input
									id="plan-location"
									type="text"
									maxLength={255}
									value={location}
									onChange={(event) => setLocation(event.target.value)}
									placeholder="Optional location"
									className="plan-input-field"
								/>
							</div>

							{/* What */}
							<div className="flex items-start gap-3">
								<label htmlFor="plan-title" className="plan-label">
									What
								</label>

								<div className="min-w-0 flex-1">
									<input
										id="plan-title"
										type="text"
										required
										maxLength={100}
										value={title}
										onChange={(event) => setTitle(event.target.value)}
										placeholder="Dinner, coffee, movie night..."
										className="plan-input-field"
									/>

									<textarea
										id="plan-comments"
										maxLength={500}
										rows={3}
										value={comments}
										onChange={(event) => setComments(event.target.value)}
										placeholder="Details..."
										className="mt-2 plan-input-field"
									/>
								</div>
							</div>
						</div>
					</div>
				</section>

				{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 sm:text-sm">{error}</p>}

				<div className="flex gap-2 sm:justify-end">
					<button type="button" onClick={onClose} disabled={isSubmitting} className="btn-secondary flex-1 sm:flex-none sm:min-w-1/4">
						Cancel
					</button>

					<button type="submit" disabled={isSubmitting} className="btn-primary flex-1 sm:flex-none sm:min-w-1/4">
						{isSubmitting ? "Sending..." : "Send"}
					</button>
				</div>
			</form>
		</ModalContainer>
	);

	function showSlider() {
		return (
			<input
				id="plan-start-time"
				type="range"
				min={0}
				max={maxStartOffset}
				step={15}
				value={startOffset}
				onChange={(event) => setStartOffset(Number(event.target.value))}
				aria-label="Plan start time"
				className="
					w-full cursor-pointer appearance-none bg-transparent

					[&::-webkit-slider-runnable-track]:h-1.5
					[&::-webkit-slider-runnable-track]:rounded-full
					[&::-webkit-slider-runnable-track]:bg-stone-200

					[&::-webkit-slider-thumb]:-mt-1.5
					[&::-webkit-slider-thumb]:h-4.5
					[&::-webkit-slider-thumb]:w-4.5
					[&::-webkit-slider-thumb]:appearance-none
					[&::-webkit-slider-thumb]:rounded-full
					[&::-webkit-slider-thumb]:bg-brand-red

					[&::-moz-range-track]:h-1.5
					[&::-moz-range-track]:rounded-full
					[&::-moz-range-track]:bg-stone-200

					[&::-moz-range-progress]:bg-stone-200

					[&::-moz-range-thumb]:h-4
					[&::-moz-range-thumb]:w-4
					[&::-moz-range-thumb]:rounded-full
					[&::-moz-range-thumb]:border-0
					[&::-moz-range-thumb]:bg-brand-red
				"
			/>
		);
	}
}
