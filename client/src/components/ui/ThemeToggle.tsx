import { useTheme } from "../../contexts/ThemeContext";
import SegmentedControl from "./SegmentedControl";

const OPTIONS = [
	{ value: "light" as const, label: "Light" },
	{ value: "dark" as const, label: "Dark" },
	{ value: "system" as const, label: "System" },
];

export default function ThemeToggle() {
	const { preference, setPreference } = useTheme();

	return <SegmentedControl options={OPTIONS} value={preference} onChange={setPreference} />;
}
