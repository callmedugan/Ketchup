import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

export function ProtectedRoute() {
	//used to pass in previous page
	const location = useLocation();
	const { isAuthenticated } = useAuth();

	// Redirect to login, saving the attempted URL in state for post-login redirection
	if (!isAuthenticated) {
		return <Navigate to="/login" state={{ from: location }} replace />;
	}

	//finally return outlet
	return <Outlet />;
}
