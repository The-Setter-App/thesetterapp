import { Check } from "lucide-react";
import styles from "@/components/ui/brandSurface.module.css";

interface WaitlistConfirmationProps {
  email: string;
}

export default function WaitlistConfirmation({
  email,
}: WaitlistConfirmationProps) {
  return (
    <div className={`${styles.confirm} flex flex-col items-center`}>
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F3F0FF] text-[#8771FF]">
        <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <p className="mt-4 text-xl font-semibold tracking-[-0.015em] text-[#101011]">
        You're on the list.
      </p>
      <p className="mt-1 text-base leading-relaxed text-[#606266]">
        We'll email{" "}
        <span className="break-all font-medium text-[#101011]">{email}</span>{" "}
        when your spot opens.
      </p>
    </div>
  );
}
