import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9A9CA2] pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white border rounded-xl text-base transition-all outline-none
            placeholder:text-[#9A9CA2]
            disabled:cursor-not-allowed disabled:opacity-50
            ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
              : 'border-[#F0F2F6] focus:border-[#8771FF] focus:ring-4 focus:ring-[#8771FF]/10 hover:border-[#F0F2F6]'
            }
            ${className}
          `}
          {...props}
        />
      </div>
    );
  }
);

Input.displayName = "Input";

