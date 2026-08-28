import type { ComponentProps } from "react";

type ButtonProps = {} & ComponentProps<"button">;

export default function Button({ ...props }: ButtonProps) {
	return (
		<button
			{...props}
			type="submit"
			className="w-full rounded-xl bg-[#d94b3d] px-4 py-3 font-bold text-white shadow-sm transition hover:bg-[#c94034] hover:shadow-md active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
			// className="w-full rounded-lg bg-red-500 py-2.5
			//            font-semibold text-white
			//            hover:bg-red-600
			//            transition-colors
			//            disabled:opacity-30
			//            disabled:cursor-not-allowed"
		></button>
	);
}
