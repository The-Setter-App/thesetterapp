import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export function Card({ className = '', noPadding = false, children, ...props }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl border border-[#F0F2F6] shadow-sm overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}
