import type { ReactNode } from "react";
import styles from "@/components/ui/brandSurface.module.css";

interface WaitlistHeroProps {
  // The signup form, passed in so the hero itself stays a static server
  // component and only the form ships client-side JavaScript.
  children: ReactNode;
}

export default function WaitlistHero({ children }: WaitlistHeroProps) {
  return (
    // Extra bottom padding on phones lifts the block to the optical centre,
    // which sits a little above the geometric one. It scales with the screen
    // height so short phones keep the form above the fold.
    <section className="flex flex-1 items-center justify-center px-4 pb-[clamp(1.5rem,8svh,4rem)] pt-6 md:px-6 md:py-16 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <p
          className={`${styles.materialize} ${styles.order1} inline-flex h-8 items-center rounded-full bg-[#F3F0FF] px-3.5 text-xs font-semibold text-[#8771FF]`}
        >
          Early access
        </p>
        {/* The headline scales with the phone's width so it fills the screen
            on every size instead of sitting small on larger phones. */}
        <h1
          className={`${styles.materialize} ${styles.order2} mt-5 text-balance text-[length:clamp(2.5rem,13vw,3.5rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-[#101011] md:mt-6 md:text-6xl lg:text-7xl`}
        >
          Turn followers into customers.
        </h1>
        <p
          className={`${styles.materialize} ${styles.order3} mt-4 max-w-[21rem] text-balance text-[1.0625rem] leading-[1.45] text-[#606266] md:mt-6 md:max-w-xl md:text-xl md:leading-relaxed`}
        >
          Setter is the Instagram inbox built for sales teams. Join the waitlist
          and we'll email you when your spot opens.
        </p>
        <div
          className={`${styles.materialize} ${styles.order4} mt-7 w-full max-w-md md:mt-10`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
