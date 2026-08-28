import { useState } from "react";
import Calendar from "../components/calendar/Calendar";
import NewScheduleModal from "../components/calendar/NewScheduleModal";
import PageContainer from "./PageContainer";

export function CalendarPage() {
	const [showScheduleForm, setShowScheduleForm] = useState(false);

	return (
		<PageContainer title="Your calendar" description="Check out what's going on this week.">
			<div className="flex min-h-0 flex-1 flex-col">
				<Calendar />

				<button type="button" onClick={() => setShowScheduleForm(true)} className="btn-primary mt-4 w-full self-end sm:w-auto sm:min-w-44">
					+ Add availability
				</button>
			</div>

			{showScheduleForm && <NewScheduleModal onClose={() => setShowScheduleForm(false)} />}
		</PageContainer>
	);
}
