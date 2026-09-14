import { useState, type SubmitEvent } from "react";
import type { ScheduleRepeatType } from "../../utils/types";
import { useSchedule } from "../../contexts/SchedulesContext";
import { format } from "date-fns";
import Modal from "../ui/Modal";
import { Input } from "../ui/Input";
import Button from "../ui/Button";

type NewScheduleModalProps = {
	onClose: () => void;
	initialDate?: Date;
};

const REPEAT_OPTIONS: { value: ScheduleRepeatType; label: string }[] = [
	{ value: "once", label: "Once" },
	{ value: "daily", label: "Daily" },
	{ value: "weekly", label: "Weekly" },
];

export default function NewScheduleModal({ onClose, initialDate }: NewScheduleModalProps) {
	const [date, setDate] = useState(format(initialDate ?? new Date(), "yyyy-MM-dd"));
	const [startTime, setStartTime] = useState("18:00");
	const [endTime, setEndTime] = useState("21:00");
	const [repeatType, setRepeatType] = useState<ScheduleRepeatType>("once");

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { addUserSchedule, fetchScheduleData } = useSchedule();

	/* ========================================================================= */
	//                        submit
	/* ========================================================================= */

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setError(null);

		const scheduleStart = new Date(`${date}T${startTime}`);
		const scheduleEnd = new Date(`${date}T${endTime}`);

		if (scheduleEnd <= scheduleStart) {
			setError("End time must be after start time.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

		addUserSchedule(date, startTime, endTime, repeatType, timezone)
			.then(() => {
				fetchScheduleData();
				onClose();
			})
			.catch((err) => {
				setError(err.message);
			})
			.finally(() => {
				setIsSubmitting(false);
			});
	}

	function setPreset(start: string, end: string) {
		setStartTime(start);
		setEndTime(end);
	}

	return (
		<Modal title="Add availability" onClose={onClose}>
			<form onSubmit={handleSubmit} className="space-y-2.5 overflow-y-auto p-4 sm:space-y-3 sm:p-5">
				{/* Step 1 */}
				<section>
					<StepTitle text="Choose a date" num="1" />

					<Input
						label="Date"
						id="availability-date"
						type="date"
						required
						min={format(new Date(), "yyyy-MM-dd")}
						value={date}
						onChange={(event) => setDate(event.target.value)}
					/>
				</section>

				{/* Step 2 */}
				<section>
					<StepTitle text="Choose a time" num="2" />

					{/* Quick select */}
					<div className="grid grid-cols-4 gap-1.5 sm:gap-2">
						<PresetButton label="Morning" onClick={() => setPreset("09:00", "12:00")} />
						<PresetButton label="Afternoon" onClick={() => setPreset("12:00", "17:00")} />
						<PresetButton label="Evening" onClick={() => setPreset("17:00", "22:00")} />
						<PresetButton label="All Day" onClick={() => setPreset("00:00", "23:59")} />
					</div>

					{/* Custom time */}
					<div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4">
						<Input
							label="Start"
							id="availability-start"
							type="time"
							step={900}
							required
							value={startTime}
							onChange={(event) => setStartTime(event.target.value)}
						/>

						<Input
							label="End"
							id="availability-end"
							type="time"
							step={900}
							required
							value={endTime}
							onChange={(event) => setEndTime(event.target.value)}
						/>
					</div>
				</section>

				{/* Step 3 */}
				<section>
					<StepTitle text="Select frequency" num="3" />

					<div className="grid grid-cols-3 gap-1.5 rounded-xl border border-border bg-surface-sunken p-1">
						{REPEAT_OPTIONS.map((option) => (
							<button
								key={option.value}
								type="button"
								onClick={() => setRepeatType(option.value)}
								className={`rounded-lg py-2 text-xs font-bold transition sm:text-sm ${
									repeatType === option.value ? "bg-accent text-white shadow-sm" : "text-ink-muted hover:text-ink"
								}`}
							>
								{option.label}
							</button>
						))}
					</div>
				</section>

				{/* Error */}
				{error && <p className="rounded-lg bg-danger-tint px-3 py-2 text-xs text-danger sm:text-sm">{error}</p>}

				{/* Actions */}
				<div className="flex gap-2 pt-1 sm:justify-end">
					<Button type="button" variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
						Cancel
					</Button>

					<Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
						{isSubmitting ? "Adding..." : "Add availability"}
					</Button>
				</div>
			</form>
		</Modal>
	);
}

type PresetButtonProps = {
	label: string;
	onClick: () => void;
};

function PresetButton({ label, onClick }: PresetButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-lg border border-border bg-surface px-1.5 py-2 text-xs font-bold text-ink transition hover:border-accent hover:bg-accent-tint hover:text-accent-dark sm:px-3 sm:py-2.5 sm:text-sm"
		>
			{label}
		</button>
	);
}

type StepTitleProps = {
	text: string;
	num: string;
};

function StepTitle({ text, num }: StepTitleProps) {
	return (
		<div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
			<div className="modal-step-number">{num}</div>

			<div>
				<p className="text-xs font-bold text-ink sm:text-sm">{text}</p>
			</div>
		</div>
	);
}
