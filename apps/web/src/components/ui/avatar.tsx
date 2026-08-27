import * as React from 'react';
import { cn } from '../../lib/utils';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  fallback?: string;
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback = 'U', ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full border border-[#30363d] bg-[#21262d] text-xs font-semibold text-white items-center justify-center shadow-sm select-none',
          className
        )}
        {...props}
      >
        {src && !hasError ? (
          <img
            src={src}
            alt={alt || 'avatar'}
            onError={() => setHasError(true)}
            className="aspect-square h-full w-full object-cover"
          />
        ) : (
          <span>{fallback}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
