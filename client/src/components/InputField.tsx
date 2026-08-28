import type { ComponentProps } from "react";

type Variant = "firstName" | "lastName" | "email" | "password";

type InputFieldProps = {
	variant: Variant;
} & ComponentProps<"input">;

export function InputField({ ...props }: InputFieldProps) {
	/* ========================================================================= */
	//                        email
	/* ========================================================================= */

	if (props.variant === "email") {
		return (
			<div>
				<label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
					Email
				</label>

				<input
					//cannot use {...props} because input tags cannot have children
					ref={props.ref}
					onChange={props.onChange}
					autoComplete="email"
					required
					id="email"
					type="email"
					className="w-full rounded-xl border border-stone-300 bg-[#fffdf8] px-4 py-3 text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-[#d94b3d] focus:ring-2 focus:ring-[#d94b3d]/15"
					// className="w-full rounded-lg border border-gray-300 px-3 py-2
					//      focus:outline-none focus:ring-2 focus:ring-red-400
					//      focus:border-transparent"
					placeholder={props.placeholder ?? "you@example.com"}
				/>
			</div>
		);
	}
	/* ========================================================================= */
	//                        password
	/* ========================================================================= */

	if (props.variant === "password") {
		return (
			<div>
				<label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
					Password
				</label>

				<input
					//cannot use {...props} because input tags cannot have children
					ref={props.ref}
					onChange={props.onChange}
					required
					autoComplete={props.autoComplete ?? "new-password"}
					id="password"
					type="password"
					className="w-full rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-red-400
                         focus:border-transparent"
					placeholder={props.placeholder ?? "••••••••"}
				/>
			</div>
		);
	}
	/* ========================================================================= */
	//                        default
	/* ========================================================================= */
	return (
		<div>
			<label htmlFor={props.variant} className="block text-sm font-medium text-gray-700 mb-1">
				{props.children}
			</label>

			<input
				//cannot use {...props} because input tags cannot have children
				ref={props.ref}
				onChange={props.onChange}
				required
				// uses the variant as the unique id
				id={props.variant}
				type="text"
				className="w-full rounded-lg border border-gray-300 px-3 py-2
                         focus:outline-none focus:ring-2 focus:ring-red-400
                         focus:border-transparent"
			/>
		</div>
	);
}
