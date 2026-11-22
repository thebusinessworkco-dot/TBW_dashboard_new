import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from './card';

export interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string | number;
  trend?: 'up' | 'down' | 'neutral';
  timeframe?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  className?: string;
}

export function KpiCard({
  title,
  value,
  change,
  trend = 'neutral',
  timeframe = 'vs last period',
  icon,
  badge,
  subtitle,
  onClick,
  className = '',
}: KpiCardProps) {
  const isInteractive = Boolean(onClick);

  return (
    <Card
      onClick={onClick}
      hoverEffect={isInteractive}
      className={`p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden ${
        isInteractive ? 'cursor-pointer active:scale-[0.99]' : ''
      } ${className}`}
    >
      {/* Top row: Title and Icon */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#566573] uppercase tracking-wider dark:text-[#94A4B4]">
          {title}
        </span>
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ECE9E1]/80 text-[#202B35] border border-[#DDD9D0]/70 dark:bg-[#1E2734] dark:text-[#FCFBF8] dark:border-[#2B3848]">
            {icon}
          </div>
        )}
      </div>

      {/* Main Metric Value */}
      <div className="mt-2.5 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-extrabold text-[#202B35] font-mono tracking-tight dark:text-[#FCFBF8]">
          {value}
        </span>
        {badge && <span className="ml-auto">{badge}</span>}
      </div>

      {/* Bottom context: trend pill & timeframe */}
      {(change !== undefined || subtitle) && (
        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-[#DDD9D0]/40 text-xs dark:border-[#232D3B]/50">
          {change !== undefined && (
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                trend === 'up'
                  ? 'text-[#4A5D4F] dark:text-[#A8BBAE]'
                  : trend === 'down'
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-[#566573] dark:text-[#94A4B4]'
              }`}
            >
              {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
              {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
              {trend === 'neutral' && <Minus className="h-3 w-3" />}
              <span>{change}</span>
            </span>
          )}
          <span className="text-[#566573]/80 truncate dark:text-[#94A4B4]/70">
            {subtitle || timeframe}
          </span>
        </div>
      )}
    </Card>
  );
}
