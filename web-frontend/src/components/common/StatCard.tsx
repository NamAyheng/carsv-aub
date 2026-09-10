import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
    isNeutral?: boolean;
    label?: string;
  };
  onClick?: () => void;
  className?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-blue-600',
  iconBg = 'bg-blue-50',
  trend,
  onClick,
  className = '',
  badge
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider truncate">{title}</span>
            {badge && (
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-red-100 text-red-700 uppercase">
                {badge}
              </span>
            )}
          </div>
          <div className="mt-2 text-2xl font-bold text-gray-800 tracking-tight">{value}</div>
        </div>
        <div className={`p-2.5 rounded-lg ${iconBg} ${iconColor} shrink-0 ml-2 shadow-2xs`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {(trend || subtitle) && (
        <div className="mt-3 pt-2.5 border-t border-gray-50 flex items-center justify-between text-xs">
          {trend && (
            <div className="flex items-center space-x-1">
              {trend.isNeutral ? (
                <Minus className="w-3.5 h-3.5 text-gray-400" />
              ) : trend.isPositive ? (
                <TrendingUp className="w-3.5 h-3.5 text-green-600" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-red-600" />
              )}
              <span
                className={`font-bold ${
                  trend.isNeutral
                    ? 'text-gray-600'
                    : trend.isPositive
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {trend.value}
              </span>
              {trend.label && <span className="text-gray-400 ml-1 font-medium">{trend.label}</span>}
            </div>
          )}
          {subtitle && <span className="text-gray-400 font-medium">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};
