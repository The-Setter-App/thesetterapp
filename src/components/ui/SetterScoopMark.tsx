import styles from "./brandSurface.module.css";

// The logo mark with a face: the half circle and its three bars, drawn with
// the logo's own proportions so the scoop sits cleanly above the first bar.
// Used as the illustration for empty states.
interface SetterScoopMarkProps {
  // Size classes; defaults to the empty-state size.
  className?: string;
}

export default function SetterScoopMark({
  className = "h-auto w-28",
}: SetterScoopMarkProps) {
  return (
    <svg
      viewBox="18 14 84 90"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M32 48A28 28 0 0 1 88 48Z"
        fill="#8771FF"
        stroke="#8771FF"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <ellipse
        cx="45"
        cy="30"
        rx="6"
        ry="3"
        transform="rotate(-34 45 30)"
        fill="#ffffff"
        opacity="0.35"
      />
      <g className={styles.blink} fill="#101011">
        <circle cx="52.5" cy="38" r="2.6" />
        <circle cx="67.5" cy="38" r="2.6" />
      </g>
      <path
        d="M56 43Q60 46.5 64 43"
        fill="none"
        stroke="#101011"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect x="22" y="58" width="76" height="9" rx="4.5" fill="#8771FF" />
      <rect x="34" y="74" width="52" height="9" rx="4.5" fill="#A999FF" />
      <rect x="46" y="90" width="28" height="9" rx="4.5" fill="#C9BFFF" />
    </svg>
  );
}
