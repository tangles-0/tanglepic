"use client";

import Link from "next/link";
import ReactMarkdown, { type Components } from "react-markdown";

function normalizePatchNoteMarkdown(input: string): string {
  // Support custom link syntax: [https://some-link.com](link text)
  return input.replace(/\[([a-z][a-z0-9+.-]*:\/\/[^\]]+)\]\(([^)]+)\)/gi, "[$2]($1)");
}

const markdownComponents: Components = {
  h1: ({ children }) => <h1 className="mt-5 text-xl font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mt-4 text-lg font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-3 text-base font-semibold">{children}</h3>,
  p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="my-2 ml-6 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 ml-6 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  hr: () => <hr className="my-4 border-neutral-300" />,
  a: ({ href, children }) => {
    if (!href) return <>{children}</>;
    const external = /^https?:\/\//i.test(href);
    if (external) {
      return (
        <a href={href} target="_blank" rel="noreferrer noopener" className="underline">
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className="underline">
        {children}
      </Link>
    );
  },
  img: ({ src, alt }) =>
    src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt ?? ""}
        className="my-3 h-auto max-w-full rounded border border-neutral-200"
      />
    ) : null,
};

export default function PatchNoteMarkdown({ content }: { content: string }) {
  return <ReactMarkdown components={markdownComponents}>{normalizePatchNoteMarkdown(content)}</ReactMarkdown>;
}


