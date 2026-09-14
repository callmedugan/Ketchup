import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
	variant?: ButtonVariant;
	size?: ButtonSize;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles: Record<ButtonVariant, string> = {
	primary: "bg-brand-red text-white shadow-sm hover:bg-brand-red-dark active:brightness-95",
	secondary: "border border-border bg-surface text-ink hover:bg-surface-sunken",
	danger: "border border-danger text-danger hover:bg-danger-tint",
	ghost: "text-ink-muted hover:bg-surface-sunken hover:text-ink",
};

const sizeStyles: Record<ButtonSize, string> = {
	sm: "px-3 py-1.5 text-xs",
	md: "px-4 py-2.5 text-sm",
	lg: "px-5 py-3 text-base",
};

export default function Button({ variant = "primary", size = "md", type = "button", className = "", ...props }: ButtonProps) {
	return (
		<button
			type={type}
			className={`inline-flex shrink-0 items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
			{...props}
		/>
	);
}
