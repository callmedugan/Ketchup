import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
	children: ReactNode;
};

type State = {
	hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
	state: State = {
		hasError: false,
	};

	static getDerivedStateFromError(): State {
		return {
			hasError: true,
		};
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("Uncaught React error:", error, info);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="flex min-h-screen items-center justify-center bg-canvas p-6">
					<div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
						<h1 className="text-2xl font-bold text-ink">Something went wrong</h1>

						<p className="mt-2 text-ink-muted">An unexpected error occurred.</p>

						<button onClick={() => window.location.reload()} className="mt-5 rounded-lg bg-accent px-4 py-2 font-bold text-white hover:bg-accent-dark">
							Reload page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
