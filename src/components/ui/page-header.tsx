import type { ReactNode } from "react";
import TextLink from "@/components/ui/text-link";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  backLink?: {
    href: string;
    label: string;
  };
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
};

export default function PageHeader({
  title,
  subtitle,
  backLink,
  actions,
  children,
  className,
}: PageHeaderProps) {
  return (
    <header className={`flex flex-wrap items-start justify-between gap-4${className ? ` ${className}` : ""}`}>
      <div className="space-y-2">
        {backLink ? (
          <TextLink href={backLink.href} className="text-sm">
            {backLink.label}
          </TextLink>
        ) : null}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle ? <p className="text-neutral-600">{subtitle}</p> : null}
        {children}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3 sm:pt-8">{actions}</div> : null}
    </header>
  );
}

