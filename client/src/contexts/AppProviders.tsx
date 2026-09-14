import type { ReactNode } from "react";

import { AuthProvider } from "./AuthContext";
import { ScheduleProvider } from "./SchedulesContext";
import { FriendsProvider } from "./FriendsContext";
import { PlansProvider } from "./PlansContext";
import { ThemeProvider } from "./ThemeContext";

type AppProvidersProps = {
	children: ReactNode;
};

//used to keep the app.tsx file simpler
export default function AppProviders({ children }: AppProvidersProps) {
	return (
		<ThemeProvider>
			<AuthProvider>
				<FriendsProvider>
					<ScheduleProvider>
						<PlansProvider>{children}</PlansProvider>
					</ScheduleProvider>
				</FriendsProvider>
			</AuthProvider>
		</ThemeProvider>
	);
}
