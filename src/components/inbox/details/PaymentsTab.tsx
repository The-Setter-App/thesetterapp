"use client";

import type { PaymentDetails } from "@/types/inbox";
import FieldDropdown, { type DropdownOption } from "./FieldDropdown";

interface PaymentsTabProps {
  value: PaymentDetails;
  onChange: (next: PaymentDetails) => void;
}

const COMMISSION_RATE = 0.05;

const PAYMENT_METHOD_OPTIONS: DropdownOption[] = [
  {
    value: "Fanbasis",
    label: "Fanbasis",
    iconSrc: "/icons/PaymentIcons/Fanbasis.svg",
  },
  { value: "Whop", label: "Whop", iconSrc: "/icons/PaymentIcons/Whop.svg" },
  {
    value: "Stripe",
    label: "Stripe",
    iconSrc: "/icons/PaymentIcons/Stripe.svg",
  },
  {
    value: "PayPal",
    label: "PayPal",
    iconSrc: "/icons/PaymentIcons/PayPal.svg",
  },
  { value: "Zelle", label: "Zelle", iconSrc: "/icons/PaymentIcons/Zelle.svg" },
  {
    value: "Wire/Invoice",
    label: "Wire/Invoice",
    iconSrc: "/icons/PaymentIcons/Wire.svg",
  },
  { value: "Venmo", label: "Venmo", iconSrc: "/icons/PaymentIcons/Venmo.svg" },
  {
    value: "Cash App",
    label: "Cash App",
    iconSrc: "/icons/PaymentIcons/CashApp.svg",
  },
  {
    value: "Crypto",
    label: "Crypto",
    iconSrc: "/icons/PaymentIcons/Crypto.svg",
  },
  { value: "Other", label: "Other", iconSrc: "/icons/PaymentIcons/Other.svg" },
];

const PAY_OPTION_OPTIONS: DropdownOption[] = [
  { value: "One Time", label: "One Time" },
  { value: "2 Installments", label: "2 Installments" },
  { value: "3 Installments", label: "3 Installments" },
  { value: "4 Installments", label: "4 Installments" },
  { value: "6 Installments", label: "6 Installments" },
  { value: "12 Installments", label: "12 Installments" },
];

const PAYMENT_FREQUENCY_OPTIONS: DropdownOption[] = [
  { value: "One Time", label: "One Time" },
  { value: "Weekly", label: "Weekly" },
  { value: "Biweekly", label: "Biweekly" },
  { value: "Monthly", label: "Monthly" },
  { value: "Quarterly", label: "Quarterly" },
];

const PAID_OPTIONS: DropdownOption[] = [
  { value: "No", label: "No" },
  { value: "Yes", label: "Yes" },
];

function parseAmountToNumber(amount: string): number {
  const cleaned = amount.replace(/[^0-9.]/g, "");
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amount);
}

function Hint({ text }: { text: string }) {
  return <p className="mt-1 text-[11px] text-[#9A9CA2]">{text}</p>;
}

export default function PaymentsTab({ value, onChange }: PaymentsTabProps) {
  const parsedAmount = parseAmountToNumber(value.amount);
  const setterCommission = parsedAmount * COMMISSION_RATE;
  const closerCommission = parsedAmount * COMMISSION_RATE;
  const amountValue = value.amount.trim();
  const amountValid =
    !amountValue ||
    Number.isFinite(Number.parseFloat(amountValue.replace(/[^0-9.]/g, "")));

  return (
    <div className="overflow-y-auto p-5 pb-20">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label
            htmlFor="payment-amount"
            className="mb-1.5 block text-xs font-semibold text-[#101011]"
          >
            Amount
          </label>
          <input
            id="payment-amount"
            aria-invalid={!amountValid}
            className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-medium text-[#101011] outline-none transition-colors duration-150 placeholder:font-normal placeholder:text-[#9A9CA2] focus:ring-0 ${amountValid ? "border-[#F0F2F6] focus:border-[#8771FF]" : "border-red-300"}`}
            value={value.amount}
            placeholder="Ex: 4000 or $4,000"
            onChange={(e) => onChange({ ...value, amount: e.target.value })}
          />
          <Hint
            text={
              amountValid
                ? "Type total deal amount in USD."
                : "Amount must be numeric."
            }
          />
        </div>
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Payment Method
          </p>
          <FieldDropdown
            value={value.paymentMethod}
            options={PAYMENT_METHOD_OPTIONS}
            placeholder="Select payment method"
            onChange={(paymentMethod) => onChange({ ...value, paymentMethod })}
          />
          <Hint text="Choose where the client paid." />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Pay Option
          </p>
          <FieldDropdown
            value={value.payOption}
            options={PAY_OPTION_OPTIONS}
            placeholder="Select pay option"
            onChange={(payOption) => onChange({ ...value, payOption })}
          />
          <Hint text="Pick one-time or installment count." />
        </div>
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Payment Frequency
          </p>
          <FieldDropdown
            value={value.paymentFrequency}
            options={PAYMENT_FREQUENCY_OPTIONS}
            placeholder="Select payment frequency"
            onChange={(paymentFrequency) =>
              onChange({ ...value, paymentFrequency })
            }
          />
          <Hint text="How often installment payments happen." />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Setter Commission
          </p>
          <div className="flex h-11 items-center rounded-xl bg-[#F8F7FF] px-3 text-sm font-medium text-[#606266] tabular-nums">
            {formatCurrency(setterCommission)}
          </div>
          <Hint text="Auto-calculated at 5% of amount." />
        </div>
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Closer Commission
          </p>
          <div className="flex h-11 items-center rounded-xl bg-[#F8F7FF] px-3 text-sm font-medium text-[#606266] tabular-nums">
            {formatCurrency(closerCommission)}
          </div>
          <Hint text="Auto-calculated at 5% of amount." />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Setter Paid
          </p>
          <FieldDropdown
            value={value.setterPaid}
            options={PAID_OPTIONS}
            placeholder="Select status"
            onChange={(setterPaid) =>
              onChange({ ...value, setterPaid: setterPaid as "Yes" | "No" })
            }
          />
          <Hint text="Mark if setter commission was paid." />
        </div>
        <div>
          <p className="mb-1.5 block text-xs font-semibold text-[#101011]">
            Closer Paid
          </p>
          <FieldDropdown
            value={value.closerPaid}
            options={PAID_OPTIONS}
            placeholder="Select status"
            onChange={(closerPaid) =>
              onChange({ ...value, closerPaid: closerPaid as "Yes" | "No" })
            }
          />
          <Hint text="Mark if closer commission was paid." />
        </div>
      </div>

      <div className="mb-4">
        <label
          htmlFor="payment-notes"
          className="mb-1.5 block text-xs font-semibold text-[#101011]"
        >
          Payment Notes
        </label>
        <textarea
          id="payment-notes"
          className="h-28 w-full resize-none rounded-xl border border-[#F0F2F6] bg-white p-3 text-sm text-[#101011] outline-none transition-colors duration-150 placeholder:text-[#9A9CA2] focus:border-[#8771FF] focus:ring-0"
          value={value.paymentNotes}
          placeholder="Add transaction context, receipts, or follow-up notes"
          onChange={(e) => onChange({ ...value, paymentNotes: e.target.value })}
        />
        <Hint text="Internal notes about this payment." />
      </div>
    </div>
  );
}
