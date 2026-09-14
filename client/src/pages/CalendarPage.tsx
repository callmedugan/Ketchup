import { useState } from "react";

import Calendar from "../components/calendar/Calendar";
import NewScheduleModal from "../components/calendar/NewScheduleModal";
import PageContainer from "./PageContainer";

export function CalendarPage() {
	const [showScheduleForm, setShowScheduleForm] = useState(false);

	return (
		<PageContainer>
			<div className="flex min-h-0 flex-1 flex-col">
				<Calendar />
			</div>

			{showScheduleForm && <NewScheduleModal onClose={() => setShowScheduleForm(false)} />}
		</PageContainer>
	);
}
