import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { getTokenExpiryMs, isTokenValid } from "../utils/authUtils";
import { getUserFromParsedJson, type User } from "../utils/types";

/* ========================================================================= */
//                        constants
/* ========================================================================= */

// refresh this many ms before the access token actually expires
const REFRESH_BUFFER_MS = 60_000;

/* ========================================================================= */
//                        context
/* ========================================================================= */

type AuthContextType = {
	user: User | null;
	token: string | null;
	login: (newToken: string, newRefreshToken: string, user: User) => void;
	logout: () => Promise<void>;
	isAuthenticated: boolean;
	// true while restoring/refreshing a session on initial load - callers should
	// wait for this before deciding whether to redirect to /login
	isInitializing: boolean;
	authFetch: (url: string, options?: RequestInit) => Promise<Response>;
	updateProfile: (updates: { bio: string; timezone: string; avatarUrl: string }) => Promise<User>;
};

const AuthContext = createContext<AuthContextType | null>(null);

/* ========================================================================= */
//                        provider
/* ========================================================================= */

type AuthProviderProps = { children: ReactNode };

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<User | null>(() => {
		const savedUser = localStorage.getItem("user");
		if (savedUser != null) {
			const parse = JSON.parse(savedUser);
			return getUserFromParsedJson(parse) ?? null;
		}
		return null;
	});
	const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
	const [refreshToken, setRefreshToken] = useState<string | null>(() => localStorage.getItem("refreshToken"));
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isTokenValid(localStorage.getItem("token")));
	const [isInitializing, setIsInitializing] = useState(true);

	// dedupes concurrent refresh attempts (a proactive timer and a reactive 401 firing near the same time)
	const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

	function persistAuthState(newToken: string | null, newRefreshToken: string | null, newUser: User | null) {
		setToken(newToken);
		setRefreshToken(newRefreshToken);
		setUser(newUser);
		setIsAuthenticated(isTokenValid(newToken));
	}

	// any time user/token/refreshToken change, sync to local storage
	useEffect(() => {
		if (user) localStorage.setItem("user", JSON.stringify(user));
		else localStorage.removeItem("user");
	}, [user]);

	useEffect(() => {
		if (token) localStorage.setItem("token", token);
		else localStorage.removeItem("token");
	}, [token]);

	useEffect(() => {
		if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
		else localStorage.removeItem("refreshToken");
	}, [refreshToken]);

	/* ========================================================================= */
	// refresh
	/* ========================================================================= */

	// exchanges the refresh token for a new access token; single-flights concurrent callers
	function performRefresh(currentRefreshToken: string): Promise<string | null> {
		if (refreshPromiseRef.current) return refreshPromiseRef.current;

		const promise = (async () => {
			try {
				const response = await fetch("/auth/refresh", { method: "POST", headers: { Authorization: `Bearer ${currentRefreshToken}` } });
				if (!response.ok) return null;

				const data = await response.json();
				return typeof data.token === "string" ? data.token : null;
			} catch {
				return null;
			} finally {
				refreshPromiseRef.current = null;
			}
		})();

		refreshPromiseRef.current = promise;
		return promise;
	}

	// on mount: restore the session, silently refreshing if the saved access token has already expired
	useEffect(() => {
		let cancelled = false;

		(async () => {
			if (isTokenValid(token)) {
				setIsInitializing(false);
				return;
			}

			if (refreshToken) {
				const newToken = await performRefresh(refreshToken);
				if (cancelled) return;

				if (newToken) {
					setToken(newToken);
					setIsAuthenticated(true);
				} else {
					persistAuthState(null, null, null);
				}
			} else {
				persistAuthState(null, null, null);
			}

			setIsInitializing(false);
		})();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// proactively renews the access token shortly before it expires, and reschedules itself after each renewal
	useEffect(() => {
		if (isInitializing || !token || !refreshToken) return;

		const expiryMs = getTokenExpiryMs(token);
		if (expiryMs === null) return;

		const delay = Math.max(expiryMs - Date.now() - REFRESH_BUFFER_MS, 0);

		const timeoutId = window.setTimeout(async () => {
			const newToken = await performRefresh(refreshToken);
			if (newToken) setToken(newToken);
			else persistAuthState(null, null, null);
		}, delay);

		return () => window.clearTimeout(timeoutId);
	}, [token, refreshToken, isInitializing]);

	/* ========================================================================= */
	// auth actions
	/* ========================================================================= */

	function login(newToken: string, newRefreshToken: string, newUser: User) {
		persistAuthState(newToken, newRefreshToken, isTokenValid(newToken) ? newUser : null);
	}

	async function logout() {
		const currentToken = token;
		const currentRefreshToken = refreshToken;
		persistAuthState(null, null, null);

		if (!currentToken || !currentRefreshToken) return;

		try {
			await fetch("/auth/logout", {
				method: "POST",
				headers: { Authorization: `Bearer ${currentToken}`, "Content-Type": "application/json" },
				body: JSON.stringify({ refreshToken: currentRefreshToken }),
			});
		} catch {
			// best-effort - the local session is already cleared either way
		}
	}

	// fetch wrapper for authenticated calls: attaches the bearer token, silently refreshes and
	// retries once on a 401, and force-logs-out if that retry also fails
	async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
		function withAuthHeaders(activeToken: string | null): Headers {
			const requestHeaders = new Headers(options.headers);
			if (!requestHeaders.has("Content-Type")) requestHeaders.set("Content-Type", "application/json");
			if (activeToken) requestHeaders.set("Authorization", `Bearer ${activeToken}`);
			return requestHeaders;
		}

		let response = await fetch(url, { ...options, headers: withAuthHeaders(token) });

		if (response.status === 401 && refreshToken) {
			const newToken = await performRefresh(refreshToken);

			if (newToken) {
				setToken(newToken);
				response = await fetch(url, { ...options, headers: withAuthHeaders(newToken) });
			}
		}

		if (response.status === 401) {
			await logout();
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
		<AuthContext.Provider
			value={{ token, login, logout, isAuthenticated, isInitializing, authFetch, user, updateProfile }}
		>
			{children}
		</AuthContext.Provider>
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
