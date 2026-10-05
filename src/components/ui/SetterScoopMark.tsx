import SetterScoop from "./SetterScoop";

// The scoop character sitting on the logo's three bars. Used as the
// illustration for empty states.
export default function SetterScoopMark() {
  return (
    <div aria-hidden="true" className="flex w-28 flex-col items-center">
      <SetterScoop className="relative z-10 h-auto w-[5.25rem]" />
      {/* Pulled up so the first bar meets the scoop's base and its drips
          hang over the bar. */}
      <div className="-mt-[1.2rem] flex w-full flex-col items-center gap-1.5">
        <span className="h-2.5 w-full rounded-full bg-[#8771FF]" />
        <span className="h-2.5 w-[68%] rounded-full bg-[#A999FF]" />
        <span className="h-2.5 w-[37%] rounded-full bg-[#C9BFFF]" />
      </div>
    </div>
  );
}
