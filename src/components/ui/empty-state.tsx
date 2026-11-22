import React from 'react';
import { Button } from './button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center rounded-2xl border border-dashed border-[#DDD9D0] bg-[#FCFBF8]/60 dark:border-[#232D3B] dark:bg-[#141A22]/40 ${className}`}
    >
      {icon && (
        <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ECE9E1]/80 text-[#7D8F82] border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#A8BBAE]">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-bold text-[#202B35] tracking-tight dark:text-[#FCFBF8]">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-[#566573] leading-relaxed dark:text-[#94A4B4]">
        {description}
      </p>
      {actionLabel && onAction && (
        <div className="mt-4">
          <Button variant="primary" size="sm" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
