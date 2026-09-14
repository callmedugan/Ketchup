import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

type InputProps = {
	label?: string;
	error?: string;
} & InputHTMLAttributes<HTMLInputElement>;

const fieldStyles = (hasError: boolean) =>
	`w-full rounded-xl border bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:ring-2 ${
		hasError ? "border-danger focus:border-danger focus:ring-danger/15" : "border-border focus:border-brand-red focus:ring-brand-red/15"
	}`;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, id, className = "", ...props }, ref) {
	return (
		<div>
			{label && (
				<label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink-muted">
					{label}
				</label>
			)}

			<input ref={ref} id={id} className={`${fieldStyles(!!error)} ${className}`} {...props} />

			{error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
		</div>
	);
});

type TextareaProps = {
	label?: string;
	error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ label, error, id, className = "", ...props }, ref) {
	return (
		<div>
			{label && (
				<label htmlFor={id} className="mb-1.5 block text-xs font-semibold text-ink-muted">
					{label}
				</label>
			)}

			<textarea ref={ref} id={id} className={`resize-none ${fieldStyles(!!error)} ${className}`} {...props} />

			{error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
		</div>
	);
});
