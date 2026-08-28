type Variant = "Loading" | "Register" | "Login";

type LoadingIndicatorProps = {
	variant: Variant;
};

export function LoadingIndicator(props: LoadingIndicatorProps) {
	let displayText = <>Loading...</>;
	if (props.variant === "Register") {
		displayText = (
			<>
				Account creation successful!
				<br />
				Now redirecting to login page...
			</>
		);
	} else if (props.variant === "Login") {
		displayText = (
			<>
				Login successful!
				<br />
				Now redirecting to home page...
			</>
		);
	}

	return (
		<>
			<p className="block text-center text-sm font-medium text-gray-700 mb-1">{displayText}</p>
			<div className="flex items-center justify-center p-8">
				<div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div>
			</div>
		</>
	);
}
