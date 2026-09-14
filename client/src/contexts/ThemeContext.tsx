import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type ThemePreference = "light" | "dark" | "system";

type ThemeContextValue = {
	preference: ThemePreference;
	resolvedTheme: "light" | "dark";
	setPreference: (preference: ThemePreference) => void;
};

const STORAGE_KEY = "ketchup-theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function readStoredPreference(): ThemePreference {
	const stored = localStorage.getItem(STORAGE_KEY);
	return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
}

function resolveTheme(preference: ThemePreference): "light" | "dark" {
	if (preference === "system") {
		return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
	}

	return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
	const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
	const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => resolveTheme(preference));

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", resolvedTheme);
	}, [resolvedTheme]);

	useEffect(() => {
		setResolvedTheme(resolveTheme(preference));

		if (preference !== "system") return;

		const media = window.matchMedia("(prefers-color-scheme: light)");

		function handleChange() {
			setResolvedTheme(resolveTheme("system"));
		}

		media.addEventListener("change", handleChange);
		return () => media.removeEventListener("change", handleChange);
	}, [preference]);

	function setPreference(next: ThemePreference) {
		localStorage.setItem(STORAGE_KEY, next);
		setPreferenceState(next);
	}

	return <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) throw new Error("useTheme must be used within a ThemeProvider");
	return context;
}
