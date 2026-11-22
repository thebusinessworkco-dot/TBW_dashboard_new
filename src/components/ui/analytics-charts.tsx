'use client';

import React, { useState } from 'react';

export interface DataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  tooltip?: string;
}

export function SimpleBarChart({
  data,
  primaryLabel = 'Primary',
  secondaryLabel,
  height = 180,
  className = '',
}: {
  data: DataPoint[];
  primaryLabel?: string;
  secondaryLabel?: string;
  height?: number;
  className?: string;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxValue = Math.max(...data.map((d) => Math.max(d.value, d.secondaryValue || 0)), 1);

  return (
    <div className={`w-full flex flex-col justify-between ${className}`}>
      {/* Legend & Hover Info */}
      <div className="flex items-center justify-between text-xs mb-3 text-[#566573] dark:text-[#94A4B4]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#202B35] dark:bg-[#FCFBF8]" />
            <span className="font-semibold text-[#202B35] dark:text-[#FCFBF8]">{primaryLabel}</span>
          </div>
          {secondaryLabel && (
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#7D8F82] dark:bg-[#8FA395]" />
              <span className="font-semibold">{secondaryLabel}</span>
            </div>
          )}
        </div>

        {hoveredIdx !== null && data[hoveredIdx] && (
          <div className="font-mono text-[11px] font-bold text-[#202B35] bg-[#ECE9E1] px-2 py-0.5 rounded-md border border-[#DDD9D0] dark:bg-[#1E2734] dark:border-[#2B3848] dark:text-[#FCFBF8]">
            {data[hoveredIdx].label}: {data[hoveredIdx].value}
            {data[hoveredIdx].secondaryValue !== undefined ? ` / ${data[hoveredIdx].secondaryValue}` : ''}
          </div>
        )}
      </div>

      {/* Bars Canvas */}
      <div
        className="w-full flex items-end justify-between gap-1 sm:gap-2 pt-4 pb-2 border-b border-[#DDD9D0]/60 dark:border-[#232D3B]/60"
        style={{ height: `${height}px` }}
      >
        {data.map((item, idx) => {
          const primaryHeight = (item.value / maxValue) * 100;
          const secondaryHeight = item.secondaryValue !== undefined ? (item.secondaryValue / maxValue) * 100 : 0;
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="w-full flex items-end justify-center gap-1 h-full">
                {/* Primary Bar */}
                <div
                  className={`w-full max-w-[14px] rounded-t-sm transition-all duration-200 ${
                    isHovered
                      ? 'bg-[#202B35] scale-y-105 shadow-sm dark:bg-[#FCFBF8]'
                      : 'bg-[#202B35]/80 hover:bg-[#202B35] dark:bg-[#FCFBF8]/80 dark:hover:bg-[#FCFBF8]'
                  }`}
                  style={{ height: `${Math.max(primaryHeight, 4)}%` }}
                />

                {/* Secondary Bar */}
                {secondaryLabel && item.secondaryValue !== undefined && (
                  <div
                    className={`w-full max-w-[14px] rounded-t-sm transition-all duration-200 ${
                      isHovered
                        ? 'bg-[#7D8F82] scale-y-105 shadow-sm dark:bg-[#8FA395]'
                        : 'bg-[#7D8F82]/80 hover:bg-[#7D8F82] dark:bg-[#8FA395]/80 dark:hover:bg-[#8FA395]'
                    }`}
                    style={{ height: `${Math.max(secondaryHeight, 4)}%` }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* X-Axis Labels */}
      <div className="w-full flex justify-between gap-1 pt-1.5 text-[10px] text-[#566573] font-mono dark:text-[#94A4B4]">
        {data.map((item, idx) => (
          <span
            key={idx}
            className={`truncate text-center flex-1 ${
              hoveredIdx === idx
                ? 'font-bold text-[#202B35] dark:text-[#FCFBF8]'
                : ''
            }`}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SparklineAreaChart({
  data,
  height = 140,
  color = '#202B35',
  className = '',
}: {
  data: number[];
  height?: number;
  color?: string;
  className?: string;
}) {
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((val, idx) => {
    const x = (idx / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 85;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const areaD = `M 0,100 L ${points.join(' L ')} L 100,100 Z`;

  return (
    <div className={`w-full overflow-hidden ${className}`}>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: `${height}px` }}
      >
        <defs>
          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7D8F82" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7D8F82" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#areaGradient)" />
        <path
          d={pathD}
          fill="none"
          stroke="#7D8F82"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
