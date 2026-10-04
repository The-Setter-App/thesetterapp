import type { CSSProperties } from "react";
import { AppImage } from "@/components/ui/AppImage";
import styles from "./login.module.css";

interface Testimonial {
  src: string;
  // The quote is baked into the image, so it is repeated here for screen
  // readers.
  alt: string;
  position: string;
  rotate: number;
}

type DriftCardStyle = CSSProperties & { "--card-rotate": string };

const TESTIMONIALS: Testimonial[] = [
  {
    src: "/images/testimonial.png",
    alt: "Dylan Michael, @dylanautomates: ManyChat is a joke in comparison. Complete gamechanger.",
    position: "left-[4%] top-[24%]",
    rotate: -10,
  },
  {
    src: "/images/testimonial-2.png",
    alt: "Alex Gonzalez, @metrographies: Legendary.",
    position: "right-[6%] top-[25%]",
    rotate: 5,
  },
  {
    src: "/images/testimonial-3.png",
    alt: "Create YL, @createyl: Helps my sales process massively.",
    position: "left-[7%] bottom-[24%]",
    rotate: -6,
  },
  {
    src: "/images/testimonial-4.png",
    alt: "Kelvin Zinck, @kelvinzinck: No more guessing on if my setters are actually working.",
    position: "right-[4%] bottom-[22%]",
    rotate: 8,
  },
];

export default function LoginTestimonialCards() {
  return (
    <div className="pointer-events-none absolute inset-0">
      {TESTIMONIALS.map((testimonial) => {
        const style: DriftCardStyle = {
          "--card-rotate": `${testimonial.rotate}deg`,
        };

        return (
          <div
            key={testimonial.src}
            className={`${styles.driftCard} absolute hidden w-60 xl:block 2xl:w-80 ${testimonial.position}`}
            style={style}
          >
            <AppImage
              src={testimonial.src}
              alt={testimonial.alt}
              width={900}
              height={342}
              className="h-auto w-full rounded-2xl border border-[#F0F2F6] bg-white shadow-[0_10px_30px_rgba(16,16,17,0.06)]"
            />
          </div>
        );
      })}
    </div>
  );
}
