import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-[#238636]/20 text-[#3fb950] border-[#238636]/40',
        secondary:
          'border-transparent bg-[#21262d] text-[#c9d1d9] border-[#30363d]',
        destructive:
          'border-transparent bg-[#f85149]/20 text-[#ff7b72] border-[#f85149]/40',
        outline: 'text-[#8b949e] border-[#30363d]',
        info: 'border-transparent bg-[#58a6ff]/20 text-[#58a6ff] border-[#58a6ff]/40',
        warning: 'border-transparent bg-[#d29922]/20 text-[#d29922] border-[#d29922]/40',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
