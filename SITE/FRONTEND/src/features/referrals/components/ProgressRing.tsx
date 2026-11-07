import React from 'react';
import { calculateProgressOffset } from '../constants';

export type ProgressRingProps = {
  current: number;
  target: number;
  size?: number;
  strokeWidth?: number;
  ariaLabel?: string;
  className?: string;
};

export const ProgressRing: React.FC<ProgressRingProps> = ({
  current,
  target,
  size = 120,
  strokeWidth = 12,
  ariaLabel,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const { circumference, offset } = calculateProgressOffset(current, target, radius);

  const fallbackLabel = `${current} من ${target} إحالة`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      role="img"
      aria-label={ariaLabel || fallbackLabel}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90 transform"
        aria-hidden="true"
      >
        {/* Background track circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#e2e8f0"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          className="dark:stroke-slate-800"
        />

        {/* Progress active circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#4f46e5"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>

      {/* Center text value */}
      <div className="absolute inset-0 flex items-center justify-center font-black text-sm sm:text-base text-slate-900 dark:text-white">
        <span>{current}</span>
        <span className="text-slate-400 dark:text-slate-500 font-normal mx-0.5">/</span>
        <span className="text-slate-500 dark:text-slate-400">{target}</span>
      </div>
    </div>
  );
};

export default ProgressRing;

