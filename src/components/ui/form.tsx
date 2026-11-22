import React from 'react';

export function FormField({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`flex flex-col gap-1.5 ${className}`}>{children}</div>;
}

export function Label({ className = '', required, children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={`text-xs font-semibold text-[#202B35] flex items-center gap-1 dark:text-[#FCFBF8] ${className}`} {...props}>
      {children}
      {required && <span className="text-rose-600 dark:text-rose-400">*</span>}
    </label>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`h-9 w-full rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] px-3 text-xs sm:text-sm text-[#202B35] placeholder:text-[#566573]/60 focus:border-[#202B35] focus:outline-none focus:ring-2 focus:ring-[#202B35]/15 transition-all shadow-2xs dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8] dark:placeholder:text-[#566573] dark:focus:border-[#7D8F82] dark:focus:ring-[#7D8F82]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = '', ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={`w-full rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] p-3 text-xs sm:text-sm text-[#202B35] placeholder:text-[#566573]/60 focus:border-[#202B35] focus:outline-none focus:ring-2 focus:ring-[#202B35]/15 transition-all shadow-2xs dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8] dark:placeholder:text-[#566573] dark:focus:border-[#7D8F82] dark:focus:ring-[#7D8F82]/20 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`h-9 w-full rounded-xl border border-[#DDD9D0] bg-[#FCFBF8] px-3 text-xs sm:text-sm text-[#202B35] focus:border-[#202B35] focus:outline-none focus:ring-2 focus:ring-[#202B35]/15 transition-all shadow-2xs dark:border-[#232D3B] dark:bg-[#141A22] dark:text-[#FCFBF8] dark:focus:border-[#7D8F82] dark:focus:ring-[#7D8F82]/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${className}`}
        {...props}
      >
        {children}
      </select>
    );
  }
);
Select.displayName = 'Select';

export function FormError({ className = '', children }: { className?: string; children: React.ReactNode }) {
  if (!children) return null;
  return <p className={`text-[11px] font-medium text-rose-700 dark:text-rose-400 ${className}`}>{children}</p>;
}

export function FormHelper({ className = '', children }: { className?: string; children: React.ReactNode }) {
  if (!children) return null;
  return <p className={`text-[11px] text-[#566573] dark:text-[#94A4B4] ${className}`}>{children}</p>;
}
