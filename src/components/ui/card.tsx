import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({ className = '', hoverEffect = false, children, ...props }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-[#DDD9D0] bg-[#FCFBF8] shadow-2xs transition-all duration-200 dark:border-[#232D3B] dark:bg-[#141A22] ${
        hoverEffect ? 'hover:border-[#C7C1B5] hover:shadow-xs dark:hover:border-[#2F3D4E]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 flex flex-col gap-1 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/70 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-base font-bold text-[#202B35] tracking-tight dark:text-[#FCFBF8] ${className}`} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-[#566573] dark:text-[#94A4B4] ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-4 sm:p-5 border-t border-[#DDD9D0]/60 flex items-center justify-between dark:border-[#232D3B]/70 ${className}`} {...props}>
      {children}
    </div>
  );
}
