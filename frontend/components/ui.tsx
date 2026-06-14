import { clsx } from "clsx";
import { forwardRef } from "react";
import type React from "react";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button
      className={clsx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-ink text-white hover:bg-neutral-800 dark:bg-white dark:text-ink dark:hover:bg-neutral-200",
        variant === "secondary" && "border border-line bg-white/70 hover:bg-white dark:bg-neutral-900 dark:hover:bg-neutral-800",
        variant === "ghost" && "hover:bg-black/5 dark:hover:bg-white/10",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        className
      )}
      {...props}
    />
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      className={clsx(
        "h-10 w-full rounded-md border border-line bg-white/80 px-3 text-sm outline-none transition placeholder:text-neutral-500 focus:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300",
        props.className
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(props, ref) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        "min-h-28 w-full resize-none rounded-md border border-line bg-white/80 px-3 py-2 text-sm outline-none transition placeholder:text-neutral-500 focus:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300",
        props.className
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  return (
    <select
      ref={ref}
      className={clsx(
        "h-10 w-full rounded-md border border-line bg-white/80 px-3 text-sm outline-none transition focus:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300",
        props.className
      )}
      {...props}
    />
  );
});

export function Panel({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx("rounded-lg border border-line bg-white/75 dark:bg-neutral-950/80", className)} {...props} />;
}
