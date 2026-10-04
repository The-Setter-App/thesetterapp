import { useId } from "react";

const PATTERN_WIDTH = 240;
const BAND_HEIGHT = 64;
// Taller than the band so the pattern never repeats vertically inside it;
// otherwise the next row's top edge shows as a hairline along the bottom.
const PATTERN_HEIGHT = 96;

// One repeat of the melted edge: a band along the top with drips of different
// lengths. It starts and ends at the same height so repeats join seamlessly.
const DRIP_PATH =
  "M0 0H240V14A17 7 0 0 1 206 14V40A7 7 0 0 1 192 40V14A20 8 0 0 1 152 14V26A6 6 0 0 1 140 26V14A15 6 0 0 1 110 14V52A8 8 0 0 1 94 52V14A22 8 0 0 1 50 14V32A6 6 0 0 1 38 32V14A19 7 0 0 1 0 14Z";

// Melting ice cream along the top edge of the brand tile. A pattern repeats
// the drips at a fixed size instead of stretching them with the tile.
export default function LoginTileDrips() {
  const patternId = useId();

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width="100%"
      height={BAND_HEIGHT}
      className="pointer-events-none absolute inset-x-0 top-0"
    >
      <defs>
        <pattern
          id={patternId}
          width={PATTERN_WIDTH}
          height={PATTERN_HEIGHT}
          patternUnits="userSpaceOnUse"
        >
          <path d={DRIP_PATH} fill="#C9BFFF" />
        </pattern>
      </defs>
      <rect width="100%" height={BAND_HEIGHT} fill={`url(#${patternId})`} />
    </svg>
  );
}
