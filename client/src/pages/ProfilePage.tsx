import { useState } from "react";
import { LoadingIndicator } from "../components/LoadingIndicator";
import Profile from "../components/profile/Profile";
import PageContainer from "./PageContainer";

export function ProfilePage() {
	const [loading] = useState(false);
	const [error] = useState<string | null>(null);

	return (
		<PageContainer title="Your profile" description="Tell your friends a little bit about yourself.">
			{getContent()}
		</PageContainer>
	);

	function getContent() {
		if (error) {
			return (
				<div className="flex min-h-96 flex-1 items-center justify-center">
					<div className="text-center">
						<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 font-bold text-red-600">!</div>

						<h2 className="mt-4 text-lg font-bold text-brand-text">Something went wrong</h2>

						<p role="alert" className="mt-2 text-sm font-medium text-red-600">
							{error}
						</p>
					</div>
				</div>
			);
		}

		if (loading) {
			return (
				<div className="flex min-h-96 flex-1 items-center justify-center">
					<LoadingIndicator variant="Loading" />
				</div>
			);
		}

		return <Profile />;
	}
}
