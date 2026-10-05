interface UserMessageBubbleProps {
  text: string;
}

export default function UserMessageBubble({ text }: UserMessageBubbleProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] rounded-[1.25rem] rounded-br-md bg-[#8771FF] px-4 py-2.5 text-[0.9375rem] leading-[1.5] text-white md:max-w-[75%]">
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}
