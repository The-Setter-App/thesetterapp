import type { ReactNode } from "react";
import styles from "./waitlist.module.css";

interface WaitlistHeroProps {
  // The signup form, passed in so the hero itself stays a static server
  // component and only the form ships client-side JavaScript.
  children: ReactNode;
}

export default function WaitlistHero({ children }: WaitlistHeroProps) {
  return (
    <section className="flex flex-1 items-center justify-center px-4 py-10 md:px-6 md:py-16 lg:px-8">
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <p
          className={`${styles.materialize} ${styles.order1} inline-flex h-8 items-center rounded-full bg-[#F3F0FF] px-3.5 text-xs font-semibold text-[#8771FF]`}
        >
          Early access
        </p>
        <h1
          className={`${styles.materialize} ${styles.order2} mt-6 text-balance text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-[#101011] md:text-6xl md:tracking-[-0.035em] lg:text-7xl`}
        >
          Turn followers into customers.
        </h1>
        <p
          className={`${styles.materialize} ${styles.order3} mt-5 max-w-xl text-pretty text-lg leading-relaxed text-[#606266] md:mt-6 md:text-xl`}
        >
          Setter is the Instagram inbox built for sales teams. Join the waitlist
          and we'll email you when your spot opens.
        </p>
        <div
          className={`${styles.materialize} ${styles.order4} mt-8 w-full max-w-md md:mt-10`}
        >
          {children}
        </div>
      </div>
    </section>
  );
}
