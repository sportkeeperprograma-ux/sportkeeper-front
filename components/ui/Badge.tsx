import clsx from "clsx";

export default function Badge({ children, color="gray" }:{children:React.ReactNode;color?: "gray"|"green"|"red"|"blue"}) {
  const map = {
    gray: "bg-gray-100 text-gray-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    blue: "bg-blue-100 text-blue-700",
  }[color];
  return <span className={clsx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map)}>{children}</span>;
}
