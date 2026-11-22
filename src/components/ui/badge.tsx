import React from 'react';

export type BadgeVariant = 'sage' | 'navy' | 'warning' | 'destructive' | 'neutral' | 'info';
export type BadgeSize = 'sm' | 'md';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  showDot?: boolean;
}

const variantStyles: Record<BadgeVariant, { container: string; dot: string }> = {
  sage: {
    container: 'bg-[#7D8F82]/15 text-[#4A5D4F] border border-[#7D8F82]/35 dark:bg-[#7D8F82]/25 dark:text-[#A8BBAE] dark:border-[#7D8F82]/40',
    dot: 'bg-[#5B6F60] dark:bg-[#A8BBAE]',
  },
  navy: {
    container: 'bg-[#202B35]/10 text-[#202B35] border border-[#202B35]/25 dark:bg-[#FCFBF8]/15 dark:text-[#FCFBF8] dark:border-[#FCFBF8]/30',
    dot: 'bg-[#202B35] dark:bg-[#FCFBF8]',
  },
  warning: {
    container: 'bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60',
    dot: 'bg-amber-500',
  },
  destructive: {
    container: 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60',
    dot: 'bg-rose-500',
  },
  neutral: {
    container: 'bg-[#ECE9E1] text-[#566573] border border-[#DDD9D0] dark:bg-[#1E2734] dark:text-[#94A4B4] dark:border-[#2B3848]',
    dot: 'bg-[#7D8F82]',
  },
  info: {
    container: 'bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/60',
    dot: 'bg-sky-500',
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] rounded-md gap-1 font-semibold tracking-tight',
  md: 'px-2.5 py-1 text-xs rounded-lg gap-1.5 font-semibold',
};

export function Badge({
  className = '',
  variant = 'neutral',
  size = 'sm',
  showDot = false,
  children,
  ...props
}: BadgeProps) {
  const styles = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center select-none ${styles.container} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {showDot && (
        <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${styles.dot}`} />
      )}
      {children}
    </span>
  );
}
