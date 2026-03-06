interface UserMessageBubbleProps {
  text: string;
}

export default function UserMessageBubble({ text }: UserMessageBubbleProps) {
  return (
    <div className="flex items-start justify-start">
      <div className="max-w-[92%] rounded-2xl border border-[#DADDE5] bg-white px-4 py-3 text-sm leading-6 text-[#101011] md:max-w-[78%] md:text-[15px]">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}
