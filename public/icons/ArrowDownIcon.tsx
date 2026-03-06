import type React from "react";
import ArrowDown from "./arrow-down.svg";

const ArrowDownIcon = (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
  /* biome-ignore lint/performance/noImgElement: local SVG imports are rendered as static icon assets here. */
  <img src={ArrowDown} alt="Arrow Down" {...props} />
);

export default ArrowDownIcon;
