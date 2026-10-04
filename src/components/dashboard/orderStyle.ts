import type { CSSProperties } from "react";

type OrderStyle = CSSProperties & { "--order": number };

// Position in a staggered entrance. The animation classes read `--order` to
// delay each element a little more than the one before it.
export function orderStyle(order: number): OrderStyle {
  return { "--order": order };
}
