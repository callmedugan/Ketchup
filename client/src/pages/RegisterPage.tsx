import { Link, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { InputField } from "../components/InputField";
import Logo from "../components/Logo";
import { useEffect, useRef, useState, type SubmitEvent } from "react";
import { LoadingIndicator } from "../components/LoadingIndicator";
import { presetAvatarStrings } from "../utils/types";

export function RegisterPage() {
	// for routing
	const navigate = useNavigate();

	// states for various fields
	const firstNameRef = useRef<HTMLInputElement>(null);
	const lastNameRef = useRef<HTMLInputElement>(null);
	const emailRef = useRef<HTMLInputElement>(null);
	const passwordRef = useRef<HTMLInputElement>(null);

	// error and loading state for server await and response
	const [error, setError] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [wasSuccessful, setWasSuccessful] = useState(false);

	// useeffect for waiting after success before routing to login page
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

		//avatar
		const avatarUrl = presetAvatarStrings[Math.floor(Math.random() * presetAvatarStrings.length)];

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
		<main className="flex min-h-screen items-center justify-center bg-brand-cork bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0_1px,transparent_1px),radial-gradient(circle_at_80%_70%,rgba(80,40,20,0.12)_0_1px,transparent_1px)] bg-size[11px_11px,17px_17px] px-4 py-8">
			<div className="w-full max-w-md">
				{/* Paper card */}
				<div className="rounded-3xl border border-stone-300/70 bg-brand-page p-7 shadow-[0_12px_35px_rgba(60,30,15,0.22)] sm:p-9">
					{/* Logo */}
					<div className="mb-8">
						<Logo showTagLine={true} />
					</div>

					{wasSuccessful ? (
						<div className="py-8">
							<LoadingIndicator variant="Register" />
						</div>
					) : (
						<>
							{/* Heading */}
							<div className="mb-6">
								<h1 className="mt-1 text-2xl font-bold tracking-tight text-center text-stone-500">Create your account</h1>
							</div>

							<form onSubmit={handleSubmit} className="space-y-5">
								<div className="grid grid-cols-2 gap-4">
									<InputField variant="firstName" ref={firstNameRef}>
										First Name
									</InputField>

									<InputField variant="lastName" ref={lastNameRef}>
										Last Name
									</InputField>
								</div>

								<InputField variant="email" placeholder="" ref={emailRef} />

								<InputField variant="password" autoComplete="new-password" placeholder="" ref={passwordRef} />

								{error && (
									<div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
										{error}
									</div>
								)}

								<Button disabled={isLoading}>{isLoading ? "Creating account..." : "Create account"}</Button>
							</form>

							<div className="my-6 flex items-center gap-3">
								<div className="h-px flex-1 bg-stone-200" />
								<span className="text-xs text-stone-400">OR</span>
								<div className="h-px flex-1 bg-stone-200" />
							</div>

							<p className="text-center text-sm text-stone-500">
								Already have an account?{" "}
								<Link to="/login" className="font-bold text-[#d94b3d] transition hover:text-[#c94034]">
									Log in
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
