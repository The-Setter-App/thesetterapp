const LINK_CLASS =
  "underline underline-offset-2 transition-colors duration-150 active:text-[#101011] [@media(hover:hover)]:hover:text-[#101011]";

export default function LoginLegal() {
  return (
    <div className="mt-8 text-center text-[0.8125rem] leading-relaxed text-[#606266]">
      <p className="text-balance">
        By continuing, you agree to our{" "}
        <a
          href="https://thesetter.app/legal-pages/terms-and-conditions"
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          Terms of Service
        </a>{" "}
        and{" "}
        <a
          href="https://thesetter.app/legal-pages/privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          Privacy Policy
        </a>
        .
      </p>
      <p className="mt-1">
        Your trial starts after signup without any payment.
      </p>
    </div>
  );
}
