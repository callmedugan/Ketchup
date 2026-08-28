import { Link, useLocation, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { InputField } from "../components/InputField";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import Logo from "../components/Logo";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { useAuth } from "../contexts/AuthContext";
import { getUserFromParsedJson } from "../utils/types";

export function LoginPage() {
	// for routing
	const navigate = useNavigate();

	// email and password refs for submit button
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	// error and loading state for server await and response
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	// auth
	const { login, token, isAuthenticated, authFetch } = useAuth();

	// Retrieve original path or fallback to home
	const location = useLocation();
	const redirectPath = location.state?.from?.pathname || "/calendar";

	useEffect(() => {
		if (isAuthenticated) navigate(redirectPath, { replace: true });
	}, []);

	/* ========================================================================= */
	//                        submit handler
	/* ========================================================================= */

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setIsLoading(true);

		try {
			const response = await authFetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
				method: "POST",
				headers: {
					Authorization: `Bearer ${token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email: emailRef.current?.value,
					password: passwordRef.current?.value,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to log in.");
				return;
			}

			const newUser = getUserFromParsedJson(data);

			if (newUser == undefined) {
				setError("User data received from the server is not valid.");
				return;
			}

			const newToken = data.token;

			if (newToken != undefined) {
				login(newToken, newUser);
				navigate(redirectPath, { replace: true });
			}
		} catch {
			setError("Could not connect to the server.");
		} finally {
			setIsLoading(false);
		}
	}

	/* ========================================================================= */
	//                        return
	/* ========================================================================= */

	return (
		<main className="flex min-h-screen items-center justify-center bg-brand-cork bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0_1px,transparent_1px),radial-gradient(circle_at_80%_70%,rgba(80,40,20,0.12)_0_1px,transparent_1px)] bg-size[11px_11px,17px_17px] px-4 py-8">
			<div className="w-full max-w-md">
				{/* Paper card */}
				<div className="rounded-3xl border border-stone-300/70 bg-brand-page p-7 shadow-[0_12px_35px_rgba(60,30,15,0.22)] sm:p-9">
					{/* Logo */}
					<div className="mb-8">
						<Logo showTagLine={true} />
					</div>

					{isAuthenticated ? (
						<div className="py-8">
							<LoadingIndicator variant="Login" />
						</div>
					) : (
						<>
							{/* Heading */}
							<div className="mb-6">
								<h1 className="mt-1 text-2xl font-bold tracking-tight text-center text-stone-500">Log in</h1>
							</div>

							<form onSubmit={handleSubmit} className="space-y-5">
								<InputField variant="email" ref={emailRef} />
								<InputField variant="password" ref={passwordRef} />

								{error && (
									<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
										{error}
									</div>
								)}

								<Button disabled={isLoading}>{isLoading ? "Logging in..." : "Log in"}</Button>
							</form>

							<div className="my-6 flex items-center gap-3">
								<div className="h-px flex-1 bg-stone-200" />
								<span className="text-xs text-stone-400">OR</span>
								<div className="h-px flex-1 bg-stone-200" />
							</div>

							<p className="text-center text-sm text-stone-500">
								Don&apos;t have an account?{" "}
								<Link to="/register" className="font-bold text-[#d94b3d] transition hover:text-[#c94034]">
									Sign up
								</Link>
							</p>
						</>
					)}
				</div>

				{/* Small brand footer */}
				<p className="mt-5 text-center text-xs font-medium text-[#f7e9d7]/80">Powered by React · TypeScript · Node.js</p>
			</div>
		</main>
	);
}
