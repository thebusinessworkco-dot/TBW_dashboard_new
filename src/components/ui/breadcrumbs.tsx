import React from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-[#566573] dark:text-[#94A4B4] ${className}`}>
      <ol className="flex items-center space-x-1 sm:space-x-1.5 flex-wrap">
        <li>
          <Link
            href="/"
            className="flex items-center text-[#566573] hover:text-[#202B35] transition dark:text-[#94A4B4] dark:hover:text-[#FCFBF8]"
          >
            <Home className="h-3.5 w-3.5" />
          </Link>
        </li>

        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          return (
            <li key={idx} className="flex items-center space-x-1 sm:space-x-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-[#DDD9D0] dark:text-[#2F3D4E] shrink-0" />
              {isLast || !item.href ? (
                <span className="font-semibold text-[#202B35] truncate max-w-[140px] sm:max-w-xs dark:text-[#FCFBF8]">
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="hover:text-[#202B35] transition truncate max-w-[120px] sm:max-w-none dark:hover:text-[#FCFBF8]"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
