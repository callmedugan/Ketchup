import ErrorBoundary from "./components/routing/ErrorBoundary";
import { ProtectedRoute } from "./components/routing/ProtectedRoute";
import AppProviders from "./contexts/AppProviders";
import { CalendarPage } from "./pages/CalendarPage";
import { FriendsPage } from "./pages/FriendsPage";
import { LoginPage } from "./pages/LoginPage";
import { PlansPage } from "./pages/PlansPage";
import { ProfilePage } from "./pages/ProfilePage";
import { RegisterPage } from "./pages/RegisterPage";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

export default function App() {
	return (
		<ErrorBoundary>
			<AppProviders>
				<BrowserRouter>
					<Routes>
						{/* Public Routes */}
						<Route path="/login" element={<LoginPage />} />
						<Route path="/register" element={<RegisterPage />} />

						{/* Protected Routes Wrapper */}
						<Route element={<ProtectedRoute />}>
							<Route path="/" element={<Navigate to="/calendar" replace />} />
							<Route path="/calendar" element={<CalendarPage />} />
							<Route path="/friends" element={<FriendsPage />} />
							<Route path="/profile" element={<ProfilePage />} />
							<Route path="/plans" element={<PlansPage />} />
						</Route>
					</Routes>
				</BrowserRouter>
			</AppProviders>
		</ErrorBoundary>
	);
}
