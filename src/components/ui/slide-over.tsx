import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface SlideOverProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md' | 'lg' | 'xl';
}

export function SlideOver({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 'md',
}: SlideOverProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#202B35]/50 backdrop-blur-xs transition-opacity duration-300 dark:bg-black/70"
      />

      <div className="fixed inset-y-0 right-0 flex pl-10 max-w-full">
        <div
          className={`w-screen ${widthClasses[width]} border-l border-[#DDD9D0] bg-[#FCFBF8] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out dark:border-[#232D3B] dark:bg-[#141A22]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#DDD9D0]/70 p-4 sm:p-5 dark:border-[#232D3B]/70">
            <div>
              <h3 className="text-base font-bold text-[#202B35] tracking-tight dark:text-[#FCFBF8]">
                {title}
              </h3>
              {subtitle && (
                <p className="mt-0.5 text-xs text-[#566573] dark:text-[#94A4B4]">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[#566573] hover:bg-[#ECE9E1] hover:text-[#202B35] cursor-pointer transition dark:text-[#94A4B4] dark:hover:bg-[#1B232D] dark:hover:text-[#FCFBF8]"
              aria-label="Close panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 p-4 sm:p-5 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-2 border-t border-[#DDD9D0]/70 bg-[#F4F2EC]/40 p-4 sm:p-5 dark:border-[#232D3B]/70 dark:bg-[#10161E]/40">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
