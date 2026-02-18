import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface AssistantMessageBubbleProps {
  text: string;
  isPending?: boolean;
}

export default function AssistantMessageBubble({ text, isPending = false }: AssistantMessageBubbleProps) {
  if (isPending) {
    return (
      <div className="flex items-start justify-start">
        <span className="thinking-shine text-sm font-medium">Thinking</span>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-start">
      <div className="max-w-[92%] px-4 text-sm leading-6 text-[#101011] md:max-w-[78%] md:text-[15px]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => <h1 className="mb-2 text-base font-semibold md:text-lg">{children}</h1>,
            h2: ({ children }) => <h2 className="mb-2 text-[15px] font-semibold md:text-base">{children}</h2>,
            h3: ({ children }) => <h3 className="mb-2 text-sm font-semibold md:text-[15px]">{children}</h3>,
            p: ({ children }) => <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>,
            ul: ({ children }) => <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>,
            ol: ({ children }) => <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>,
            li: ({ children }) => <li>{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="mb-2 border-l-2 border-[#CFC6FF] pl-3 text-[#4D4F55]">{children}</blockquote>
            ),
            a: ({ children, href }) => (
              <a href={href} target="_blank" rel="noreferrer" className="text-[#6d5ed6] underline underline-offset-2">
                {children}
              </a>
            ),
            code: ({ children, className }) => {
              const isBlock = Boolean(className);
              if (isBlock) {
                return (
                  <code className="block overflow-x-auto rounded-xl border border-[#E6E1FF] bg-white/80 p-3 font-mono text-xs text-[#101011] md:text-sm">
                    {children}
                  </code>
                );
              }
              return (
                <code className="rounded-md bg-white/70 px-1.5 py-0.5 font-mono text-[0.85em] text-[#101011]">
                  {children}
                </code>
              );
            },
            table: ({ children }) => (
              <div className="mb-2 overflow-x-auto rounded-xl border border-[#E6E1FF] bg-white/70 last:mb-0">
                <table className="w-full border-collapse text-left text-xs md:text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-[#F8F7FF] text-[#4D4F55]">{children}</thead>,
            th: ({ children }) => <th className="border-b border-[#E6E1FF] px-3 py-2 font-semibold">{children}</th>,
            td: ({ children }) => <td className="border-b border-[#EEE9FF] px-3 py-2 align-top">{children}</td>,
            hr: () => <hr className="my-3 border-[#DDD5FF]" />,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>
    </div>
  );
}
