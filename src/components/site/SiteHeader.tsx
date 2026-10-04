import Link from "next/link";
import { AppImage } from "@/components/ui/AppImage";
import styles from "@/components/ui/brandSurface.module.css";

// Header for the public pages: the logo links home, with sign in beside it.
export default function SiteHeader() {
  return (
    <header
      className={`${styles.materialize} mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 md:px-6 md:py-4 lg:px-8`}
    >
      <Link href="/" className="inline-flex min-h-11 items-center">
        <AppImage
          src="/brand/setter-logo.svg"
          alt="Setter"
          width={302}
          height={76}
          className="h-7 w-auto md:h-8"
          loadingMode="eager"
        />
      </Link>
      <Link
        href="/login"
        className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-[#606266] transition-colors duration-150 active:text-[#101011] [@media(hover:hover)]:hover:text-[#101011]"
      >
        Sign in
      </Link>
    </header>
  );
}
