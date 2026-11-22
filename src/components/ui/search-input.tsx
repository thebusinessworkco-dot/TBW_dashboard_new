import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string;
  onValueChange?: (val: string) => void;
  shortcutKey?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function SearchInput({
  value,
  onValueChange,
  onChange,
  placeholder = 'Search...',
  shortcutKey,
  size = 'md',
  className = '',
  ...props
}: SearchInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onValueChange?.(e.target.value);
  };

  const handleClear = () => {
    onValueChange?.('');
  };

  const sizeClasses = {
    sm: 'h-8 text-xs pl-8 pr-7 rounded-lg',
    md: 'h-9 text-xs sm:text-sm pl-9 pr-8 rounded-xl',
    lg: 'h-10 text-sm pl-10 pr-9 rounded-xl',
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5 left-2.5',
    md: 'h-4 w-4 left-3',
    lg: 'h-4.5 w-4.5 left-3.5',
  };

  return (
    <div className={`relative flex items-center w-full ${className}`}>
      <Search className={`absolute text-[#7D8F82] pointer-events-none ${iconSizes[size]}`} />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full bg-[#FCFBF8] border border-[#DDD9D0] text-[#202B35] placeholder:text-[#566573]/70 focus:border-[#202B35] focus:outline-none focus:ring-2 focus:ring-[#202B35]/15 transition-all shadow-2xs dark:bg-[#141A22] dark:border-[#232D3B] dark:text-[#FCFBF8] dark:placeholder:text-[#566573] dark:focus:border-[#7D8F82] dark:focus:ring-[#7D8F82]/20 ${sizeClasses[size]}`}
        {...props}
      />
      {value ? (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 text-[#566573] hover:text-[#202B35] p-0.5 rounded cursor-pointer transition dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : shortcutKey ? (
        <kbd className="absolute right-2.5 hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold text-[#566573] bg-[#ECE9E1]/80 border border-[#DDD9D0] rounded dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]">
          {shortcutKey}
        </kbd>
      ) : null}
    </div>
  );
}
