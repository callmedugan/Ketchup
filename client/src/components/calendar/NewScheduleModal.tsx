import { useState, type SubmitEvent } from "react";
import type { ScheduleRepeatType } from "../../utils/types";
import { useSchedule } from "../../contexts/SchedulesContext";
import { useAuth } from "../../contexts/AuthContext";
import { format } from "date-fns";
import ModalContainer from "../common/ModalContainer";
import ModalHeader from "../common/ModalHeader";

type NewScheduleModalProps = { onClose: () => void };

export default function NewScheduleModal({ onClose }: NewScheduleModalProps) {
	const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
	const [startTime, setStartTime] = useState("18:00");
	const [endTime, setEndTime] = useState("21:00");
	const [repeatType, setRepeatType] = useState<ScheduleRepeatType>("once");

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { addUserSchedule, fetchScheduleInstances } = useSchedule();
	const { user } = useAuth();

	/* ========================================================================= */
	//                        submit
	/* ========================================================================= */

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		if (!user) return;

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

		addUserSchedule(user.id, date, startTime, endTime, repeatType, user.timezone)
			.then(() => {
				fetchScheduleInstances();
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
		<ModalContainer onClose={onClose}>
			<ModalHeader title="Add availability" onClose={onClose} />

			<form onSubmit={handleSubmit} className="space-y-2.5 overflow-y-auto p-4 sm:space-y-3 sm:p-5">
				{/* Step 1 */}
				<section>
					<StepTitle text="Choose a date" num="1" />

					<input
						id="availability-date"
						type="date"
						required
						min={format(new Date(), "yyyy-MM-dd")}
						value={date}
						onChange={(event) => setDate(event.target.value)}
						className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition focus:border-[#b65a4f] focus:ring-2 focus:ring-[#b65a4f]/20 sm:py-2.5 sm:text-sm"
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
					<div className="mt-2">
						<div className="grid grid-cols-2 gap-2 sm:gap-4">
							<div>
								<label htmlFor="availability-start" className="mb-1 block text-[11px] font-semibold text-stone-500 sm:mb-1.5 sm:text-xs">
									Start
								</label>

								<input
									id="availability-start"
									type="time"
									step={900}
									required={true}
									value={startTime}
									onChange={(event) => setStartTime(event.target.value)}
									className="w-full rounded-xl border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none transition focus:border-[#b65a4f] focus:ring-2 focus:ring-[#b65a4f]/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 sm:px-3 sm:py-2.5 sm:text-sm"
								/>
							</div>

							<div>
								<label htmlFor="availability-end" className="mb-1 block text-[11px] font-semibold text-stone-500 sm:mb-1.5 sm:text-xs">
									End
								</label>

								<input
									id="availability-end"
									type="time"
									step={900}
									required={true}
									value={endTime}
									onChange={(event) => setEndTime(event.target.value)}
									className="w-full rounded-xl border border-stone-300 bg-white px-2.5 py-2 text-xs text-stone-800 outline-none transition focus:border-[#b65a4f] focus:ring-2 focus:ring-[#b65a4f]/20 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400 sm:px-3 sm:py-2.5 sm:text-sm"
								/>
							</div>
						</div>
					</div>
				</section>

				{/* Step 3 */}
				<section>
					<StepTitle text="Select frequency" num="3" />

					<select
						id="availability-repeat"
						value={repeatType}
						onChange={(event) => setRepeatType(event.target.value as ScheduleRepeatType)}
						className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs text-stone-800 outline-none transition focus:border-[#b65a4f] focus:ring-2 focus:ring-[#b65a4f]/20 sm:py-2.5 sm:text-sm"
					>
						<option value="once">Once</option>
						<option value="daily">Daily</option>
						<option value="weekly">Weekly</option>
					</select>
				</section>

				{/* Error */}
				{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 sm:text-sm">{error}</p>}

				{/* Actions */}
				<div className="flex gap-2 pt-1 sm:justify-end">
					<button type="button" onClick={onClose} className="btn-secondary flex-1 sm:flex-none">
						Cancel
					</button>

					<button type="submit" disabled={isSubmitting} className="btn-primary flex-1 sm:flex-none">
						{isSubmitting ? "Adding..." : "Add availability"}
					</button>
				</div>
			</form>
		</ModalContainer>
	);
}

type PresetButtonProps = { label: string; onClick: () => void };

function PresetButton({ label, onClick }: PresetButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="rounded-xl border border-stone-300 bg-white px-1.5 py-2 text-xs font-bold text-stone-700 transition hover:border-[#b65a4f] hover:bg-[#fff4ef] hover:text-brand-red sm:px-3 sm:py-2.5 sm:text-sm"
		>
			{label}
		</button>
	);
}

type StepTitleProps = { text: string; num: string };

function StepTitle({ text, num }: StepTitleProps) {
	return (
		<div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
			<div className="modal-step-number">{num}</div>
			<div>
				<p className="text-xs font-bold text-stone-800 sm:text-sm">{text}</p>
			</div>
		</div>
	);
}
