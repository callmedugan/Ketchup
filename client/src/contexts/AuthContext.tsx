import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { isTokenValid } from "../utils/authUtils";
import { getUserFromParsedJson, type User } from "../utils/types";

/* ========================================================================= */
//                        context
/* ========================================================================= */

type AuthContextType = {
	user: User | null;
	token: string | null;
	login: (newToken: string, user: User) => void;
	logout: () => void;
	manualLogout: () => Promise<void>;
	isAuthenticated: boolean;
	authFetch: (url: string, options?: RequestInit) => Promise<Response>;
	updateProfile: (updates: { bio: string; timezone: string; avatarUrl: string }) => Promise<User>;
};

const AuthContext = createContext<AuthContextType | null>(null);

/* ========================================================================= */
//                        provider
/* ========================================================================= */

type AuthProviderProps = { children: ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
	//declare first
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

	// use the function version of use state to immediately set and check if the token is valid on start or refresh
	const [user, setUser] = useState<User | null>(() => {
		const savedUser = localStorage.getItem("user");
		//gotta parse the user before passing to obj converter
		if (savedUser != null) {
			const parse = JSON.parse(savedUser);
			return getUserFromParsedJson(parse) ?? null;
		}
		return null;
	});
	const [token, setToken] = useState<string | null>(() => {
		const savedToken = localStorage.getItem("token");
		setIsAuthenticated(isTokenValid(savedToken));
		return savedToken;
	});

	// any time user is modified save the string to local storage
	useEffect(() => {
		if (user) localStorage.setItem("user", JSON.stringify(user));
		else localStorage.removeItem("user");
	}, [user]);

	// any time token is modified update local storage and set isAuthenticated
	useEffect(() => {
		if (token) localStorage.setItem("token", token);
		else localStorage.removeItem("token");
	}, [token]);

	function login(newToken: string, newUser: User) {
		setToken(newToken);
		setIsAuthenticated(isTokenValid(newToken));
		setUser(isTokenValid(newToken) ? newUser : null);
	}

	function logout() {
		setToken(null);
		setIsAuthenticated(false);
		setUser(null);
	}

	async function manualLogout() {
		logout();
	}

	// fetch wrapper for auth calls
	async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
		// Create standard headers object
		const headers = new Headers(options.headers);

		if (!headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}

		if (token) {
			headers.set("Authorization", `Bearer ${token}`);
		}

		const response = await fetch(url, { ...options, headers });

		// token rejected by backend
		if (response.status === 401) {
			logout();
			throw new Error("Session expired. Please log in again.");
		}

		return response;
	}

	async function updateProfile(updates: { bio: string; timezone: string; avatarUrl: string }): Promise<User> {
		const response = await authFetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });

		if (!response.ok) {
			const data = await response.json();
			throw new Error(data.error ?? "Unable to update profile");
		}

		const data = await response.json();
		const updatedUser = getUserFromParsedJson(data);

		if (!updatedUser) throw new Error("Invalid user response");

		setUser(updatedUser);

		return updatedUser;
	}

	return (
		<AuthContext.Provider value={{ token, login, logout, isAuthenticated, authFetch, manualLogout, user, updateProfile }}>{children}</AuthContext.Provider>
	);
};

/* ========================================================================= */
//                        hook
/* ========================================================================= */

export function useAuth(): AuthContextType {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error("useAuth must be used within an AuthProvider");
	}
	return context;
}
