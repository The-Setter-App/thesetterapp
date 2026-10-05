import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface OpenConversationLinkProps {
  conversationId: string;
  leadName: string;
}

// A lead's id is its inbox conversation id, so this goes straight to the chat.
export default function OpenConversationLink({
  conversationId,
  leadName,
}: OpenConversationLinkProps) {
  return (
    <Link
      href={`/inbox/${conversationId}`}
      aria-label={`Open conversation with ${leadName}`}
      title="Open conversation"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#9A9CA2] outline-none transition-[transform,background-color,color] duration-100 ease-out active:scale-[0.94] [@media(hover:hover)]:hover:bg-[#F3F0FF] [@media(hover:hover)]:hover:text-[#8771FF]"
    >
      <ArrowUpRight size={16} aria-hidden="true" />
    </Link>
  );
}
