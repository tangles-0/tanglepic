import Link from "next/link";
import type { ReactNode } from "react";

type TextLinkVariant = "muted" | "default" | "loud";

const VARIANT_STYLES: Record<TextLinkVariant, string> = {
  muted: "text-neutral-500",
  default: "text-neutral-700",
  loud: "text-emerald-900",
};

export default function TextLink({
  href,
  children,
  className,
  variant = "muted",
}: {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: TextLinkVariant;
}) {
  return (
    <Link
      href={href}
      className={`underline ${VARIANT_STYLES[variant]}${className ? ` ${className}` : ""}`}
    >
      {children}
    </Link>
  );
}

