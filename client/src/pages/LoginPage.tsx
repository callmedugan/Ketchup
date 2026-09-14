import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import Logo from "../components/Logo";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { useAuth } from "../contexts/AuthContext";
import { getUserFromParsedJson } from "../utils/types";

export function LoginPage() {
	const navigate = useNavigate();

	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	const { login, isAuthenticated } = useAuth();

	// Retrieve original path or fallback to home
	const location = useLocation();
	const redirectPath = location.state?.from?.pathname || "/calendar";

	useEffect(() => {
		// re-checks whenever isAuthenticated resolves, including after a silent token refresh completes
		if (isAuthenticated) navigate(redirectPath, { replace: true });
	}, [isAuthenticated, navigate, redirectPath]);

	/* ========================================================================= */
	//                        submit handler
	/* ========================================================================= */

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setIsLoading(true);

		try {
			const response = await fetch(`/auth/login`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email: emailRef.current?.value, password: passwordRef.current?.value }),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to log in.");
				return;
			}

			const newUser = getUserFromParsedJson(data);

			if (newUser == undefined || typeof data.token !== "string" || typeof data.refreshToken !== "string") {
				setError("User data received from the server is not valid.");
				return;
			}

			login(data.token, data.refreshToken, newUser);
			navigate(redirectPath, { replace: true });
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
		<main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
			<div className="w-full max-w-md">
				<div className="rounded-3xl border border-border bg-surface p-7 shadow-xl sm:p-9">
					<div className="mb-8">
						<Logo showTagLine={true} />
					</div>

					{isAuthenticated ? (
						<div className="py-8">
							<LoadingSpinner label="Logged in, redirecting..." />
						</div>
					) : (
						<>
							<h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-ink">Log in</h1>

							<form onSubmit={handleSubmit} className="space-y-4">
								<Input label="Email" id="email" type="email" autoComplete="email" required ref={emailRef} placeholder="you@example.com" />
								<Input label="Password" id="password" type="password" autoComplete="current-password" required ref={passwordRef} placeholder="••••••••" />

								{error && (
									<div role="alert" className="rounded-xl border border-danger/20 bg-danger-tint px-4 py-3 text-center text-sm text-danger">
										{error}
									</div>
								)}

								<Button type="submit" disabled={isLoading} className="w-full" size="lg">
									{isLoading ? "Logging in..." : "Log in"}
								</Button>
							</form>

							<div className="my-6 flex items-center gap-3">
								<div className="h-px flex-1 bg-border" />
								<span className="text-xs text-ink-faint">OR</span>
								<div className="h-px flex-1 bg-border" />
							</div>

							<p className="text-center text-sm text-ink-muted">
								Don&apos;t have an account?{" "}
								<Link to="/register" className="font-bold text-accent transition hover:text-accent-dark">
									Sign up
								</Link>
							</p>
						</>
					)}
				</div>

				<p className="mt-5 text-center text-xs font-medium text-ink-faint">Powered by React · TypeScript · Node.js</p>
			</div>
		</main>
	);
}
