import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'default' | 'outline';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  iconOnly?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-[#202B35] text-[#FCFBF8] hover:bg-[#161E26] active:bg-[#0D1217] border border-[#202B35] shadow-xs focus-visible:ring-2 focus-visible:ring-[#202B35]/20 dark:bg-[#FCFBF8] dark:text-[#202B35] dark:hover:bg-[#EDEAE1] dark:border-[#FCFBF8]',
  default:
    'bg-[#202B35] text-[#FCFBF8] hover:bg-[#161E26] active:bg-[#0D1217] border border-[#202B35] shadow-xs focus-visible:ring-2 focus-visible:ring-[#202B35]/20 dark:bg-[#FCFBF8] dark:text-[#202B35] dark:hover:bg-[#EDEAE1] dark:border-[#FCFBF8]',
  secondary:
    'bg-[#FCFBF8] text-[#202B35] border border-[#DDD9D0] hover:bg-[#F4F2EC] hover:border-[#C7C1B5] active:bg-[#ECE9E1] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#7D8F82]/30 dark:bg-[#151C24] dark:text-[#FCFBF8] dark:border-[#263342] dark:hover:bg-[#1B232D]',
  outline:
    'bg-[#FCFBF8] text-[#202B35] border border-[#DDD9D0] hover:bg-[#F4F2EC] hover:border-[#C7C1B5] active:bg-[#ECE9E1] shadow-2xs focus-visible:ring-2 focus-visible:ring-[#7D8F82]/30 dark:bg-[#151C24] dark:text-[#FCFBF8] dark:border-[#263342] dark:hover:bg-[#1B232D]',
  tertiary:
    'bg-transparent text-[#202B35] hover:bg-[#ECE9E1]/60 active:bg-[#ECE9E1] focus-visible:ring-2 focus-visible:ring-[#7D8F82]/30 dark:text-[#FCFBF8] dark:hover:bg-[#1C2430]',
  destructive:
    'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 active:bg-rose-200 shadow-2xs focus-visible:ring-2 focus-visible:ring-rose-500/20 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60 dark:hover:bg-rose-900/40',
};

const sizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 px-2.5 text-xs rounded-lg gap-1.5 font-medium',
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5 font-semibold',
  md: 'h-9 px-3.5 text-sm rounded-xl gap-2 font-semibold',
  lg: 'h-10 px-4 text-sm rounded-xl gap-2.5 font-semibold',
};

const iconOnlySizeStyles: Record<ButtonSize, string> = {
  xs: 'h-7 w-7 p-0 rounded-lg justify-center',
  sm: 'h-8 w-8 p-0 rounded-lg justify-center',
  md: 'h-9 w-9 p-0 rounded-xl justify-center',
  lg: 'h-10 w-10 p-0 rounded-xl justify-center',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      iconOnly = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center transition-all duration-150 cursor-pointer select-none outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none active:scale-[0.98]';
    const variantClass = variantStyles[variant];
    const sizeClass = iconOnly ? iconOnlySizeStyles[size] : sizeStyles[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {!iconOnly && children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
