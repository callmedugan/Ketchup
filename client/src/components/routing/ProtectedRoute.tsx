import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LoadingSpinner from "../ui/LoadingSpinner";

export function ProtectedRoute() {
	//used to pass in previous page
	const location = useLocation();
	const { isAuthenticated, isInitializing } = useAuth();

	// wait for a saved session to finish restoring (which may include a silent token refresh)
	// before deciding whether to redirect - otherwise a valid session with an expired access
	// token would bounce to /login before it had a chance to refresh
	if (isInitializing) {
		return (
			<div className="flex h-dvh items-center justify-center bg-canvas">
				<LoadingSpinner />
			</div>
		);
	}

	// Redirect to login, saving the attempted URL in state for post-login redirection
	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	//finally return outlet
	return <Outlet />;
}
