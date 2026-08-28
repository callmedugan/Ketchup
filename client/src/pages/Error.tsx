export function ErrorPage() {
	return (
		<main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
			<div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
				<div className="text-center mb-8">
					<h1 className="text-4xl font-bold text-red-500">Ketchup</h1>
					<p className="text-gray-500 mt-2">Catch up with your friends</p>
				</div>

				<p className="text-center text-sm text-gray-500 mt-6">Invalid link</p>
			</div>
		</main>
	);
}
