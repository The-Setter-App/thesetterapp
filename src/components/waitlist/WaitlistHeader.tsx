import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import styles from "@/components/ui/brandSurface.module.css";

export default function WaitlistHeader() {
  return (
    <header
      className={`${styles.materialize} mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6 md:py-4 lg:px-8`}
    >
      <AppImage
        src="/images/setter-wordmark.png"
        alt="Setter"
        width={640}
        height={130}
        className="h-auto w-24 md:w-28"
        loadingMode="eager"
      />
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-[#606266] transition-colors duration-150 active:text-[#101011] [@media(hover:hover)]:hover:text-[#101011]"
      >
        Sign in
      </Link>
    </header>
  );
}
