import React from 'react';
import { Breadcrumbs, BreadcrumbItem } from './breadcrumbs';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  category?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  category,
  breadcrumbs,
  actions,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex flex-col gap-2.5 pb-5 border-b border-[#DDD9D0] dark:border-[#232D3B] ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumbs items={breadcrumbs} className="mb-0.5" />
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#202B35] tracking-tight dark:text-[#FCFBF8]">
              {title}
            </h1>
            {category && (
              <span className="inline-flex items-center rounded-md bg-[#ECE9E1] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#566573] border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#94A4B4]">
                {category}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs sm:text-sm text-[#566573] max-w-2xl dark:text-[#94A4B4]">
              {subtitle}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
