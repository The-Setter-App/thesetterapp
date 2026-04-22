"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeExternalHref } from "@/lib/messages/messageText";

interface MessageMarkdownProps {
  text: string;
  fromMe: boolean;
}

export default function MessageMarkdown({
  text,
  fromMe,
}: MessageMarkdownProps) {
  const linkClassName = fromMe
    ? "text-white underline underline-offset-2"
    : "text-[#6d5ed6] underline underline-offset-2";
  const inlineCodeClassName = fromMe
    ? "rounded-md bg-white/15 px-1.5 py-0.5 font-mono text-[0.85em] text-white"
    : "rounded-md bg-[#F8F7FF] px-1.5 py-0.5 font-mono text-[0.85em] text-[#101011]";
  const blockCodeClassName = fromMe
    ? "mb-2 block overflow-x-auto rounded-xl bg-white/10 p-3 font-mono text-xs text-white last:mb-0"
    : "mb-2 block overflow-x-auto rounded-xl bg-[#F8F7FF] p-3 font-mono text-xs text-[#101011] last:mb-0";
  const blockquoteClassName = fromMe
    ? "mb-2 border-l-2 border-white/40 pl-3 text-white/90 last:mb-0"
    : "mb-2 border-l-2 border-[#CFC6FF] pl-3 text-[#4D4F55] last:mb-0";

  return (
    <div className="break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p className="mb-2 whitespace-pre-wrap last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="whitespace-pre-wrap">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className={blockquoteClassName}>{children}</blockquote>
          ),
          a: ({ children, href }) => {
            const normalizedHref = normalizeExternalHref(href);
            if (!normalizedHref) {
              return <span>{children}</span>;
            }

            return (
              <a
                href={normalizedHref}
                target="_blank"
                rel="noreferrer noopener"
                className={linkClassName}
              >
                {children}
              </a>
            );
          },
          code: ({ children, className }) => {
            if (className) {
              return <code className={blockCodeClassName}>{children}</code>;
            }
            return <code className={inlineCodeClassName}>{children}</code>;
          },
          hr: () => (
            <hr
              className={
                fromMe ? "my-3 border-white/25" : "my-3 border-[#DDD5FF]"
              }
            />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
