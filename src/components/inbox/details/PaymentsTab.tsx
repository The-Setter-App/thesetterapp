"use client";

import { useState, useRef, useEffect } from "react";

interface PaymentMethod {
  name: string;
  icon: string;
}

const paymentMethods: PaymentMethod[] = [
  { name: "Fanbasis", icon: "/icons/PaymentIcons/Fanbasis.svg" },
  { name: "Whop", icon: "/icons/PaymentIcons/Whop.svg" },
  { name: "Stripe", icon: "/icons/PaymentIcons/Stripe.svg" },
  { name: "PayPal", icon: "/icons/PaymentIcons/PayPal.svg" },
  { name: "Zelle", icon: "/icons/PaymentIcons/Zelle.svg" },
  { name: "Wire/Invoice", icon: "/icons/PaymentIcons/Wire.svg" },
  { name: "Venmo", icon: "/icons/PaymentIcons/Venmo.svg" },
  { name: "Cash App", icon: "/icons/PaymentIcons/CashApp.svg" },
  { name: "Crypto", icon: "/icons/PaymentIcons/Crypto.svg" },
  { name: "Other", icon: "/icons/PaymentIcons/Other.svg" },
];

function PaymentMethodDropdown({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedMethod = paymentMethods.find((m) => m.name === value) || paymentMethods[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm font-medium text-gray-900 flex items-center justify-between cursor-pointer"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] mr-2">
            <img src={selectedMethod.icon} alt={selectedMethod.name} className="w-4 h-4" />
          </span>
          {selectedMethod.name}
        </div>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white rounded-md shadow-lg max-h-60 overflow-auto border border-gray-200">
          {paymentMethods.map((method) => (
            <div
              key={method.name}
              className="flex items-center justify-between p-2.5 hover:bg-gray-100 cursor-pointer"
              onClick={() => { onChange(method.name); setIsOpen(false); }}
            >
              <div className="flex items-center">
                <span className="w-5 h-5 rounded flex items-center justify-center text-[10px] mr-2">
                  <img src={method.icon} alt={method.name} className="w-4 h-4" />
                </span>
                <span className="text-sm font-medium text-gray-900">{method.name}</span>
              </div>
              {value === method.name ? (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-blue-500">
                  <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                </svg>
              ) : (
                <div className="w-5 h-5 rounded-full border border-gray-200" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const ChevronDownSmall = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function PaymentsTab() {
  const [amount, setAmount] = useState("$4,000 USD");
  const [paymentMethod, setPaymentMethod] = useState("Fanbasis");
  const [setterPaid, setSetterPaid] = useState("Yes");
  const [closerPaid, setCloserPaid] = useState("No");
  const [paymentNotes, setPaymentNotes] = useState("Guy wants to work 1 on 1 on his fitness offer");

  return (
    <div className="p-6 overflow-y-auto pb-20">
      {/* Amount & Payment Method */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Amount</label>
          <input
            className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm font-medium text-gray-900 w-full outline-none"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Payment Method</label>
          <PaymentMethodDropdown value={paymentMethod} onChange={setPaymentMethod} />
        </div>
      </div>

      {/* Pay Option & Frequency */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Pay Option</label>
          <div className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-800 flex items-center justify-between">
            6 Installments
            <ChevronDownSmall />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Payment Frequency</label>
          <div className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-800 flex items-center justify-between">
            One Time
            <ChevronDownSmall />
          </div>
        </div>
      </div>

      {/* Commissions */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Setter Commission</label>
          <div className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-400">$200</div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Closer Commission</label>
          <div className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-400">$400</div>
        </div>
      </div>

      {/* Paid Status */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Setter Paid</label>
          <div className="relative">
            <select
              className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-800 w-full appearance-none outline-none"
              value={setterPaid}
              onChange={(e) => setSetterPaid(e.target.value)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 font-medium mb-1 block">Closer Paid</label>
          <div className="relative">
            <select
              className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-800 w-full appearance-none outline-none"
              value={closerPaid}
              onChange={(e) => setCloserPaid(e.target.value)}
            >
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
            <svg className="w-4 h-4 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Payment Notes */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 font-medium mb-1 block">Payment notes</label>
        <textarea
          className="border border-gray-200 rounded-lg p-2.5 bg-white text-sm text-gray-800 h-32 w-full resize-none outline-none"
          value={paymentNotes}
          onChange={(e) => setPaymentNotes(e.target.value)}
        />
      </div>
    </div>
  );
}