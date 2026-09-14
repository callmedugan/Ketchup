import { useState, type SubmitEvent } from "react";
import { addMinutes, differenceInMinutes, format } from "date-fns";
import { usePlans } from "../../contexts/PlansContext";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import type { ScheduleInstance } from "../calendar/Instance";

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
			await addPlan(overlap.user.id, title, comments, meetTime, location, [userScheduleId, overlap.scheduleId]);

			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Something went wrong while creating the plan.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<Modal title="New Plan" onClose={onClose}>
			<form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4 sm:space-y-5 sm:p-5">
				<section>
					<div className="rounded-xl border border-border bg-surface-sunken p-3 sm:p-4">
						<div className="space-y-4 sm:space-y-5">
							{/* When */}
							<div>
								<div className="flex items-baseline gap-3 sm:gap-4">
									<p className="plan-label">When</p>

									<p className="text-xs font-bold text-ink sm:text-sm">{format(meetTime, "EEE, MMM d ' @ ' h:mm a")}</p>
								</div>

								<div className="ml-12 mt-2 sm:ml-18">
									{showSlider()}

									<div className="mt-1.5 flex justify-between text-[10px] text-ink-muted sm:text-xs">
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

									<p className="truncate text-xs font-bold text-ink sm:text-sm">{overlap.user.name}</p>
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

				{error && <p className="rounded-lg bg-danger-tint px-3 py-2 text-xs text-danger sm:text-sm">{error}</p>}

				<div className="flex gap-2 sm:justify-end">
					<Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting} className="flex-1 sm:flex-none sm:min-w-1/4">
						Cancel
					</Button>

					<Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none sm:min-w-1/4">
						{isSubmitting ? "Sending..." : "Send"}
					</Button>
				</div>
			</form>
		</Modal>
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
					[&::-webkit-slider-runnable-track]:bg-border

					[&::-webkit-slider-thumb]:-mt-1.5
					[&::-webkit-slider-thumb]:h-4.5
					[&::-webkit-slider-thumb]:w-4.5
					[&::-webkit-slider-thumb]:appearance-none
					[&::-webkit-slider-thumb]:rounded-full
					[&::-webkit-slider-thumb]:bg-brand-red

					[&::-moz-range-track]:h-1.5
					[&::-moz-range-track]:rounded-full
					[&::-moz-range-track]:bg-border

					[&::-moz-range-progress]:bg-border

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
