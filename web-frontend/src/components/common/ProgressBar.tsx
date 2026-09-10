import React from 'react';

interface ProgressBarProps {
  progress: number; // 0 - 100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'auto';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  showLabel = false,
  size = 'md',
  color = 'auto',
  className = ''
}) => {
  const clamped = Math.min(100, Math.max(0, progress));

  const heightClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }[size];

  let barColor = 'bg-blue-600';
  if (color === 'emerald') barColor = 'bg-emerald-500';
  else if (color === 'amber') barColor = 'bg-amber-500';
  else if (color === 'purple') barColor = 'bg-purple-600';
  else if (color === 'rose') barColor = 'bg-rose-500';
  else if (color === 'auto') {
    if (clamped >= 100) barColor = 'bg-emerald-500';
    else if (clamped >= 60) barColor = 'bg-blue-600';
    else if (clamped >= 25) barColor = 'bg-amber-500';
    else barColor = 'bg-slate-400';
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-1">
          <span>Progress</span>
          <span className="font-mono">{clamped}%</span>
        </div>
      )}
      <div className={`w-full bg-slate-200 rounded-full overflow-hidden ${heightClasses}`}>
        <div
          className={`h-full ${barColor} transition-all duration-300 ease-out rounded-full`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};
