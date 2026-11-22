import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
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

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-[#202B35]/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200 dark:bg-black/75"
      />

      {/* Modal Dialog Box */}
      <div
        className={`relative z-10 w-full rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] shadow-2xl transition-all animate-in zoom-in-95 duration-200 dark:border-[#232D3B] dark:bg-[#141A22] ${maxWidthClasses[maxWidth]}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#DDD9D0]/70 p-4 sm:p-5 dark:border-[#232D3B]/70">
          <div>
            <h3 className="text-base font-bold text-[#202B35] tracking-tight dark:text-[#FCFBF8]">
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-[#566573] dark:text-[#94A4B4]">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[#566573] hover:bg-[#ECE9E1] hover:text-[#202B35] cursor-pointer transition dark:text-[#94A4B4] dark:hover:bg-[#1B232D] dark:hover:text-[#FCFBF8]"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 max-h-[75vh] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-[#DDD9D0]/70 bg-[#F4F2EC]/40 p-4 sm:p-5 rounded-b-2xl dark:border-[#232D3B]/70 dark:bg-[#10161E]/40">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
