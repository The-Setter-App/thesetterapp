import styles from "./brandSurface.module.css";

interface SetterScoopProps {
  className?: string;
}

// The logo's half circle as a scoop of ice cream with a face. It is drawn so
// that y=50 is the surface it sits on: everything below that line is the
// melted edge and drips that hang over whatever it is placed on.
export default function SetterScoop({ className }: SetterScoopProps) {
  return (
    <svg
      viewBox="0 8 96 64"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path
        d="M12 50A36 34 0 0 1 84 50A6 6 0 0 1 72 50V62A6 6 0 0 1 60 62V50A8 6 0 0 1 44 50V56A5 5 0 0 1 34 56V50A11 6 0 0 1 12 50Z"
        fill="#8771FF"
        stroke="#8771FF"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse
        cx="31"
        cy="27"
        rx="7"
        ry="3.5"
        transform="rotate(-32 31 27)"
        fill="#ffffff"
        opacity="0.35"
      />
      <g className={styles.blink} fill="#101011">
        <circle cx="39" cy="37" r="3" />
        <circle cx="57" cy="37" r="3" />
      </g>
      <path
        d="M44 43.5Q48 47 52 43.5"
        fill="none"
        stroke="#101011"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
