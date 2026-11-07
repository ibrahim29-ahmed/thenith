import React from 'react';

export type EmptyStateProps = {
  message: string;
  icon?: React.ReactNode;
  className?: string;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  message,
  icon,
  className = '',
}) => {
  return (
    <div
      className={`w-full h-full min-h-[130px] rounded-[18px] border-2 border-dashed border-[#d5d9e6] p-6 text-center flex flex-col items-center justify-center ${className}`}
    >
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="text-xs text-[#5b6278] leading-relaxed whitespace-pre-line max-w-sm">
        {message}
      </p>
    </div>
  );
};

export default EmptyState;

