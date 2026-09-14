import { Link, useNavigate } from "react-router-dom";
import { presetAvatarStrings, type PresetAvatarType } from "@ketchup/shared";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import Logo from "../components/Logo";
import { Input } from "../components/ui/Input";
import Button from "../components/ui/Button";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import AvatarPicker from "../components/ui/AvatarPicker";

export function RegisterPage() {
	const navigate = useNavigate();

	const firstNameRef = useRef<HTMLInputElement>(null);
	const lastNameRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	const [avatarUrl, setAvatarUrl] = useState<PresetAvatarType>(() => presetAvatarStrings[Math.floor(Math.random() * presetAvatarStrings.length)]!);

	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [wasSuccessful, setWasSuccessful] = useState(false);

	useEffect(() => {
		if (!wasSuccessful) return;

		const timer = setTimeout(() => {
			navigate("/login");
		}, 5000);

		return () => clearTimeout(timer);
	}, [wasSuccessful, navigate]);

	/* ========================================================================= */
	//                        submit handler
	/* ========================================================================= */

	async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setIsLoading(true);

		//used to save to user and convert all times to local
		const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

		try {
			const response = await fetch(`/api/users`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: `${firstNameRef.current?.value} ${lastNameRef.current?.value}`,
					email: emailRef.current?.value,
					password: passwordRef.current?.value,
					timezone,
					avatarUrl,
				}),
			});

			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? "Unable to create new user.");
				return;
			}

			setWasSuccessful(true);
		} catch {
			setError("Could not connect to the server.");
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-8">
			<div className="w-full max-w-md">
				<div className="rounded-3xl border border-border bg-surface p-7 shadow-xl sm:p-9">
					<div className="mb-8">
						<Logo showTagLine={true} />
					</div>

					{wasSuccessful ? (
						<div className="py-8">
							<LoadingSpinner label={"Account created! Redirecting to login..."} />
						</div>
					) : (
						<>
							<h1 className="mb-6 text-center text-2xl font-bold tracking-tight text-ink">Create your account</h1>

							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="grid grid-cols-2 gap-3">
									<Input label="First name" id="firstName" required ref={firstNameRef} autoComplete="given-name" />
									<Input label="Last name" id="lastName" required ref={lastNameRef} autoComplete="family-name" />
								</div>

								<Input label="Email" id="email" type="email" required ref={emailRef} autoComplete="email" placeholder="you@example.com" />
								<Input label="Password" id="password" type="password" required ref={passwordRef} autoComplete="new-password" placeholder="••••••••" />

								<div>
									<p className="mb-1.5 block text-xs font-semibold text-ink-muted">Choose an avatar</p>
									<AvatarPicker value={avatarUrl} onChange={setAvatarUrl} />
								</div>

								{error && (
									<div role="alert" className="rounded-xl border border-danger/20 bg-danger-tint px-4 py-3 text-center text-sm text-danger">
										{error}
									</div>
								)}

								<Button type="submit" disabled={isLoading} className="w-full" size="lg">
									{isLoading ? "Creating account..." : "Create account"}
								</Button>
							</form>

							<div className="my-6 flex items-center gap-3">
								<div className="h-px flex-1 bg-border" />
								<span className="text-xs text-ink-faint">OR</span>
								<div className="h-px flex-1 bg-border" />
							</div>

							<p className="text-center text-sm text-ink-muted">
								Already have an account?{" "}
								<Link to="/login" className="font-bold text-accent transition hover:text-accent-dark">
									Log in
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
