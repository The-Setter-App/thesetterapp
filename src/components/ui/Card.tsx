import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  noPadding?: boolean;
}

export function Card({ className = '', noPadding = false, children, ...props }: CardProps) {
  return (
    <div 
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${noPadding ? '' : 'p-6'} ${className}`} 
      {...props}
    >
      {children}
    </div>
  );
}