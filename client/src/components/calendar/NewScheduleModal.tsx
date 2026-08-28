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
	const [allDay, setAllDay] = useState(false);

	const [error, setError] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const { addUserSchedule, fetchMatchedSchedules } = useSchedule();
	const { user } = useAuth();

	/* ========================================================================= */
	//                        submit
	/* ========================================================================= */

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		if (!user) return;

		event.preventDefault();

		setError(null);

		const submitStartTime = allDay ? "00:00" : startTime;
		const submitEndTime = allDay ? "23:59" : endTime;

		const scheduleStart = new Date(`${date}T${submitStartTime}`);
		const scheduleEnd = new Date(`${date}T${submitEndTime}`);

		if (!allDay && scheduleEnd <= scheduleStart) {
			setError("End time must be after start time.");
			return;
		}

		setIsSubmitting(true);
		setError(null);

		addUserSchedule(user.id, date, submitStartTime, submitEndTime, repeatType, user.timezone)
			.then(() => {
				fetchMatchedSchedules();
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
		setAllDay(false);
		setStartTime(start);
		setEndTime(end);
	}

	return (
		<ModalContainer onClose={onClose}>
			<ModalHeader title="Add availability" onClose={onClose} />

			<form onSubmit={handleSubmit} className="space-y-2.5 overflow-y-auto p-4 sm:space-y-3 sm:p-5">
				{/* Step 1 */}
				<section>
					<div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white sm:h-7 sm:w-7 sm:text-sm">
							1
						</div>

						<div>
							<p className="text-xs font-bold text-stone-800 sm:text-sm">Choose a date</p>
						</div>
					</div>

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
					<div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white sm:h-7 sm:w-7 sm:text-sm">
							2
						</div>

						<div>
							<p className="text-xs font-bold text-stone-800 sm:text-sm">Choose a time</p>
						</div>
					</div>

					{/* All day */}
					<div className="mb-2 flex items-center justify-between rounded-xl border border-stone-200 bg-white px-3 py-2 sm:px-4">
						<div>
							<p className="text-xs font-bold text-stone-800 sm:text-sm">All day</p>
						</div>

						<button
							type="button"
							onClick={() => setAllDay((prev) => !prev)}
							aria-pressed={allDay}
							className={`relative h-6 w-11 shrink-0 rounded-full transition ${allDay ? "bg-brand-red" : "bg-stone-300"}`}
						>
							<span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${allDay ? "left-6" : "left-1"}`} />
						</button>
					</div>

					{/* Quick select */}
					<div className={allDay ? "pointer-events-none opacity-40" : ""}>
						<div className="grid grid-cols-3 gap-1.5 sm:gap-2">
							<PresetButton label="Morning" onClick={() => setPreset("09:00", "12:00")} />
							<PresetButton label="Afternoon" onClick={() => setPreset("12:00", "17:00")} />
							<PresetButton label="Evening" onClick={() => setPreset("17:00", "22:00")} />
						</div>
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
									required={!allDay}
									disabled={allDay}
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
									required={!allDay}
									disabled={allDay}
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
					<div className="mb-2 flex items-center gap-2 sm:mb-3 sm:gap-3">
						<div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-red text-xs font-bold text-white sm:h-7 sm:w-7 sm:text-sm">
							3
						</div>

						<div>
							<p className="text-xs font-bold text-stone-800 sm:text-sm">Select frequency</p>
						</div>
					</div>

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
