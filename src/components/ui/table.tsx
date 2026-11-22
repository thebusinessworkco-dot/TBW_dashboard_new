import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Table({ className = '', children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] shadow-2xs dark:border-[#232D3B] dark:bg-[#141A22]">
      <table className={`w-full text-left text-sm text-[#202B35] dark:text-[#FCFBF8] ${className}`} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`border-b border-[#DDD9D0] bg-[#ECE9E1]/40 text-xs font-semibold uppercase tracking-wider text-[#566573] dark:border-[#232D3B] dark:bg-[#1B232D]/70 dark:text-[#94A4B4] ${className}`} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y divide-[#DDD9D0]/60 dark:divide-[#232D3B]/60 ${className}`} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ className = '', hover = true, children, ...props }: React.HTMLAttributes<HTMLTableRowElement> & { hover?: boolean }) {
  return (
    <tr
      className={`transition-colors duration-100 ${
        hover ? 'hover:bg-[#F4F2EC]/60 dark:hover:bg-[#1B232D]/40' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TableHead({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`px-4 py-3 font-semibold ${className}`} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`px-4 py-3.5 align-middle ${className}`} {...props}>
      {children}
    </td>
  );
}

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  className = '',
}: TablePaginationProps) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 border-t border-[#DDD9D0]/70 bg-[#FCFBF8] text-xs text-[#566573] dark:border-[#232D3B]/70 dark:bg-[#141A22] dark:text-[#94A4B4] ${className}`}>
      <div>
        {totalItems !== undefined && (
          <span>
            Total: <strong className="text-[#202B35] dark:text-[#FCFBF8]">{totalItems}</strong> entries
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-2">
          Page {currentPage} of {Math.max(1, totalPages)}
        </span>
        <Button
          variant="secondary"
          size="xs"
          iconOnly
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous Page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="xs"
          iconOnly
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next Page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
