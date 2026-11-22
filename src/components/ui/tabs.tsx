import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number | string;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'pills' | 'underline';
  size?: 'sm' | 'md';
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  variant = 'pills',
  size = 'md',
  className = '',
}: TabsProps) {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-[#DDD9D0] dark:border-[#232D3B] ${className}`}>
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 border-b-2 py-2.5 px-4 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                isActive
                  ? 'border-[#202B35] text-[#202B35] dark:border-[#7D8F82] dark:text-[#FCFBF8]'
                  : 'border-transparent text-[#566573] hover:border-[#DDD9D0] hover:text-[#202B35] dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]'
              }`}
            >
              {tab.icon && <span className="shrink-0">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    isActive
                      ? 'bg-[#202B35] text-[#FCFBF8] dark:bg-[#7D8F82] dark:text-[#141A22]'
                      : 'bg-[#ECE9E1] text-[#566573] dark:bg-[#1E2734] dark:text-[#94A4B4]'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Pills variant
  return (
    <div className={`inline-flex items-center p-1 rounded-xl bg-[#ECE9E1]/80 border border-[#DDD9D0] dark:bg-[#151C24] dark:border-[#232D3B] ${className}`}>
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer select-none ${
              isActive
                ? 'bg-[#202B35] text-[#FCFBF8] shadow-xs dark:bg-[#FCFBF8] dark:text-[#202B35]'
                : 'text-[#566573] hover:text-[#202B35] hover:bg-[#F4F2EC]/60 dark:text-[#94A4B4] dark:hover:text-[#FCFBF8] dark:hover:bg-[#1B232D]'
            }`}
          >
            {tab.icon && <span className="shrink-0">{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`px-1.5 py-0.2 text-[10px] rounded-full font-mono font-bold ${
                  isActive
                    ? 'bg-[#FCFBF8]/20 text-[#FCFBF8] dark:bg-[#202B35]/20 dark:text-[#202B35]'
                    : 'bg-[#DDD9D0]/70 text-[#566573] dark:bg-[#232D3B] dark:text-[#94A4B4]'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
