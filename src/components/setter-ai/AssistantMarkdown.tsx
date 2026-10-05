import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AssistantMarkdownProps {
  text: string;
}

// Renders Setter AI's reply. The model answers in Markdown, so headings,
// lists, tables and code each get a style that fits the chat column.
export default function AssistantMarkdown({ text }: AssistantMarkdownProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="mb-2 mt-4 text-lg font-semibold tracking-[-0.015em] first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="mb-2 mt-4 text-base font-semibold tracking-[-0.01em] first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="mb-1.5 mt-3 text-[0.9375rem] font-semibold first:mt-0">
            {children}
          </h3>
        ),
        p: ({ children }) => (
          <p className="mb-3 whitespace-pre-wrap last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-[#8771FF] last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-[#8771FF] last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="mb-3 rounded-r-xl border-l-2 border-[#C9BFFF] bg-[#F8F7FF] py-2 pl-3.5 pr-3 text-[#101011] last:mb-0">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-[#8771FF] underline underline-offset-2"
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          if (className) {
            return (
              <code className="mb-3 block overflow-x-auto rounded-2xl bg-[#F4F5F8] p-3.5 font-mono text-[0.8125rem] leading-relaxed text-[#101011] last:mb-0">
                {children}
              </code>
            );
          }
          return (
            <code className="rounded-md bg-[#F4F5F8] px-1.5 py-0.5 font-mono text-[0.85em] text-[#101011]">
              {children}
            </code>
          );
        },
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto rounded-2xl border border-[#F0F2F6] last:mb-0">
            <table className="w-full border-collapse text-left text-[0.8125rem]">
              {children}
            </table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-[#F8F7FF] text-[#606266]">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="border-b border-[#F0F2F6] px-3 py-2 font-semibold">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="border-b border-[#F0F2F6] px-3 py-2 align-top">
            {children}
          </td>
        ),
        hr: () => <hr className="my-4 border-[#F0F2F6]" />,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}
