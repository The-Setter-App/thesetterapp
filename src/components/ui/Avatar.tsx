interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function Avatar({ src, alt, fallback, size = 'md', className = '' }: AvatarProps) {
  const sizes = {
    xs: "w-6 h-6 text-[10px]",
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
    xl: "w-16 h-16 text-lg",
  };

  return (
    <div className={`relative inline-block rounded-full overflow-hidden bg-[#F4F5F8] ${sizes[size]} ${className}`}>
      <img 
        src={src || "/images/no_profile.jpg"} 
        alt={alt || fallback || "Avatar"} 
        className="w-full h-full object-cover"
      />
    </div>
  );
}

