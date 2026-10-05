import styles from "@/components/ui/brandSurface.module.css";

// Setter AI's face in a conversation: the logo's scoop on a tinted disc.
export default function SetterAiAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F3F0FF]">
      <svg
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
        className="h-8 w-8"
      >
        <path d="M7 20A9 9 0 0 1 25 20Z" fill="#8771FF" />
        <rect
          x="5.5"
          y="21.5"
          width="21"
          height="2.6"
          rx="1.3"
          fill="#8771FF"
        />
        <g className={styles.blink} fill="#101011">
          <circle cx="13.2" cy="16.6" r="1.1" />
          <circle cx="18.8" cy="16.6" r="1.1" />
        </g>
      </svg>
    </span>
  );
}
