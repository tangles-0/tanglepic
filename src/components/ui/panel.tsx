import type { ReactNode } from "react";

export default function Panel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded border border-neutral-200 p-4${className ? ` ${className}` : ""}`}>
      {children}
    </div>
  );
}

