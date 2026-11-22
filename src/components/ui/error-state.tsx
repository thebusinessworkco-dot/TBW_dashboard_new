import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'An unexpected error occurred',
  message,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-rose-200 bg-rose-50/70 dark:border-rose-900/50 dark:bg-rose-950/20 ${className}`}
    >
      <div className="mb-2.5 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
        <AlertCircle className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">{title}</h4>
      <p className="mt-1 max-w-md text-xs text-rose-700 dark:text-rose-400">{message}</p>
      {onRetry && (
        <div className="mt-3.5">
          <Button
            variant="secondary"
            size="xs"
            onClick={onRetry}
            leftIcon={<RefreshCw className="h-3 w-3" />}
          >
            Retry Action
          </Button>
        </div>
      )}
    </div>
  );
}
