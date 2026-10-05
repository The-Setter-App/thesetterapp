import { PROMPT_STARTERS } from "@/components/setter-ai/lib/promptStarters";
import surface from "@/components/ui/brandSurface.module.css";
import SetterScoopMark from "@/components/ui/SetterScoopMark";

interface SetterAiWelcomeProps {
  // Sends a starter as the first message of the chat.
  onPickPrompt: (prompt: string) => void;
  disabled: boolean;
}

// What a new chat shows before the first message: who you are talking to,
// and a few things worth asking.
export default function SetterAiWelcome({
  onPickPrompt,
  disabled,
}: SetterAiWelcomeProps) {
  return (
    <div
      className={`${surface.materialize} flex flex-col items-center text-center`}
    >
      <SetterScoopMark className="h-auto w-20 md:w-28" />
      <h2 className="mt-5 text-balance text-[1.5rem] font-semibold leading-[1.1] tracking-[-0.03em] text-[#101011] md:mt-6 md:text-[2.25rem]">
        What are we working on?
      </h2>
      <p className="mt-2.5 max-w-md text-pretty text-[0.9375rem] leading-[1.45] text-[#606266] md:mt-3 md:text-[1.0625rem]">
        Ask for a reply, a follow-up, or a way past an objection. Type{" "}
        <span className="rounded-md bg-[#F3F0FF] px-1.5 py-0.5 font-semibold text-[#8771FF]">
          @
        </span>{" "}
        to bring in a lead's conversation.
      </p>

      <ul className="mt-6 grid w-full grid-cols-1 gap-2 text-left sm:grid-cols-2 sm:gap-3 md:mt-8">
        {PROMPT_STARTERS.map(
          ({ id, title, description, prompt, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPickPrompt(prompt)}
                className="flex h-full w-full items-center gap-3 rounded-2xl border border-[#F0F2F6] bg-white p-3 text-left sm:items-start sm:p-4 shadow-sm outline-none transition-[transform,background-color,border-color] duration-100 ease-out active:scale-[0.98] disabled:opacity-60 [@media(hover:hover)]:enabled:hover:border-[#DCD5FF] [@media(hover:hover)]:enabled:hover:bg-[#FBFAFF]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[0.9375rem] font-semibold text-[#101011]">
                    {title}
                  </span>
                  <span className="mt-0.5 hidden text-[0.8125rem] leading-snug text-[#606266] sm:block">
                    {description}
                  </span>
                </span>
              </button>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}
