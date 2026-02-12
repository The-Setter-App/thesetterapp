import React from 'react';
import { Search } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  error?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', icon, error, ...props }, ref) => {
    return (
      <div className="relative">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`
            w-full bg-white border rounded-xl text-base transition-all outline-none
            placeholder:text-gray-400
            disabled:cursor-not-allowed disabled:opacity-50
            ${icon ? 'pl-11' : 'pl-4'} pr-4 py-3
            ${error 
              ? 'border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100' 
              : 'border-gray-200 focus:border-[#8771FF] focus:ring-4 focus:ring-[#8771FF]/10 hover:border-gray-300'
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