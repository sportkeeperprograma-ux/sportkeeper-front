"use client";
import { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  loading?: boolean;
};

export default function Button({ className, children, variant="primary", loading, disabled, ...rest }: Props) {
  const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition";
  const styles = {
    primary: "bg-black text-white hover:opacity-90",
    secondary: "bg-gray-200 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    ghost: "hover:bg-gray-100",
  }[variant];
  return (
    <button
      className={clsx(base, styles, disabled || loading ? "opacity-50 cursor-not-allowed" : "", className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="mr-2 inline-block size-4 animate-spin border-2 border-gray-300 border-r-transparent rounded-full" />}
      {children}
    </button>
  );
}
