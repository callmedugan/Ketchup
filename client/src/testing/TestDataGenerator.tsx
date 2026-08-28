import { useState } from "react";
import { addDays, set } from "date-fns";
import { useAuth } from "../contexts/AuthContext";

const USER_COUNT = 10; // dont change

const testUsers = ["ketchup", "mustard", "mayo", "sriracha", "ranch", "bbq", "honey", "soy", "relish", "hot-sauce"] as const;

const titles = ["Grab dinner", "Coffee", "Movie night", "Hang out", "Lunch", "Shopping", "Game night", "Meet up", "Dinner", "Catch up"];

export default function TestDataGenerator() {
	const { user, authFetch } = useAuth();

	const [isGenerating, setIsGenerating] = useState(false);
	const [message, setMessage] = useState("");

	const API_URL = import.meta.env.VITE_API_URL;

	function dateAt(dayOffset: number, hour: number, minute = 0) {
		return set(addDays(new Date(), dayOffset), {
			hours: hour,
			minutes: minute,
			seconds: 0,
			milliseconds: 0,
		});
	}

	async function getResponseData(response: Response) {
		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.error ?? `Request failed with status ${response.status}`);
		}

		return data;
	}

	async function loginAndSetup() {
		if (!user) {
			throw new Error("You must be logged in before generating test data.");
		}

		for (let i = 0; i < USER_COUNT; i++) {
			const password = "111111";
			const testName = testUsers[i].charAt(0).toUpperCase() + testUsers[i].slice(1);

			setMessage(`Creating ${testName} (${i + 1}/${USER_COUNT})...`);

			/* ================================================================ */
			// Create test user
			/* ================================================================ */

			const createResponse = await fetch(`${API_URL}/api/users`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: testName,
					email: `${testName}@ketchup.test`,
					password,
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
					avatarUrl: testUsers[i],
				}),
			});

			const createdUser = await getResponseData(createResponse);

			/* ================================================================ */
			// Login as test user
			/* ================================================================ */

			const loginResponse = await fetch(`${API_URL}/auth/login`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: createdUser.email,
					password,
				}),
			});

			const loginData = await getResponseData(loginResponse);

			/* ================================================================ */
			// Test user sends friend request to main user
			/* ================================================================ */

			const friendRequestResponse = await fetch(`${API_URL}/api/friends`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${loginData.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					friendId: user.id,
				}),
			});

			await getResponseData(friendRequestResponse);

			/* ================================================================ */
			// Main user sends reciprocal request
			// This should cause your backend to accept the friendship
			/* ================================================================ */

			const acceptFriendResponse = await authFetch(`${API_URL}/api/friends`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					friendId: createdUser.id,
				}),
			});

			await getResponseData(acceptFriendResponse);

			/* ================================================================ */
			// Create schedule as test user
			/* ================================================================ */

			const scheduleResponse = await fetch(`${API_URL}/api/schedules`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${loginData.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					userId: createdUser.id,
					startTime: dateAt(i % 5, 17 + (i % 3)).toISOString(),
					endTime: dateAt(i % 5, 20 + (i % 3)).toISOString(),
					repeatType: i % 3 === 0 ? "daily" : i % 2 === 0 ? "weekly" : "once",
				}),
			});

			await getResponseData(scheduleResponse);

			/* ================================================================ */
			// Create plan from test user -> main user
			/* ================================================================ */

			const planResponse = await fetch(`${API_URL}/api/plans`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${loginData.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					friendId: user.id,
					title: titles[i],
					comments: "Generated test plan.",
					location: i % 2 === 0 ? "Downtown" : "",
					meetTime: dateAt(i - 2, 18 + (i % 3)).toISOString(),
				}),
			});

			await getResponseData(planResponse);
		}
	}

	async function handleGenerate() {
		if (!user) {
			setMessage("You must be logged in to generate test data.");
			return;
		}

		setIsGenerating(true);
		setMessage("");

		try {
			await loginAndSetup();

			setMessage("Test data created successfully. Refresh the page to load it.");
		} catch (error) {
			setMessage(error instanceof Error ? error.message : "Test data generation failed.");
		} finally {
			setIsGenerating(false);
		}
	}

	return (
		<div>
			<button type="button" onClick={handleGenerate} disabled={isGenerating || !user}>
				{isGenerating ? "Generating..." : "Generate test data"}
			</button>

			{message && <p>{message}</p>}
		</div>
	);
}
