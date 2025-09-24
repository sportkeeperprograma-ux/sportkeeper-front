import { InputHTMLAttributes } from "react";
import clsx from "clsx";

export default function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        "w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none",
        "focus:border-gray-900 focus:ring-2 focus:ring-black/10",
        props.className
      )}
    />
  );
}
