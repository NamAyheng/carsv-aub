import React from 'react';
import { PriorityLevel, WorkOrderStatus, UserRole } from '../../types';

interface StatusBadgeProps {
  status?: string;
  priority?: PriorityLevel;
  role?: UserRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  priority,
  role,
  size = 'md',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
    lg: 'text-sm px-3 py-1.5 font-semibold'
  }[size];

  // Priority styling
  if (priority) {
    const priorityConfig: Record<PriorityLevel, { bg: string; text: string; border: string; dot: string }> = {
      LOW: { bg: 'bg-slate-100 text-slate-700', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-500' },
      MEDIUM: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
      HIGH: { bg: 'bg-amber-50 text-amber-800', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
      URGENT: { bg: 'bg-rose-50 text-rose-700', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-600' }
    };
    const c = priorityConfig[priority] || priorityConfig.MEDIUM;
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full border ${c.bg} ${c.border} ${sizeClasses} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {priority}
      </span>
    );
  }

  // Role styling
  if (role) {
    const roleConfig: Record<UserRole, { bg: string; text: string; border: string }> = {
      ADMIN: { bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700', border: 'border-purple-200' },
      MANAGER: { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700', border: 'border-indigo-200' },
      STAFF: { bg: 'bg-sky-50 text-sky-700 border-sky-200', text: 'text-sky-700', border: 'border-sky-200' },
      TECHNICIAN: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700', border: 'border-emerald-200' },
      CUSTOMER: { bg: 'bg-amber-50 text-amber-800 border-amber-200', text: 'text-amber-800', border: 'border-amber-200' }
    };
    const c = roleConfig[role] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', text: '', border: '' };
    return (
      <span className={`inline-flex items-center rounded-md border ${c.bg} ${sizeClasses} uppercase tracking-wider ${className}`}>
        {role}
      </span>
    );
  }

  // General statuses
  const normalized = (status || '').toUpperCase().replace(/\s+/g, '_');

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  if (['ACTIVE', 'READY', 'COMPLETED', 'PAID', 'ONLINE', 'PUBLISHED', 'PASS', 'RECEIVED', 'IN_STOCK'].includes(normalized)) {
    colorClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200';
    dotColor = 'bg-emerald-500';
  } else if (['IN_PROGRESS', 'ACTIVE_REPAIR', 'CONFIRMED', 'ORDERED'].includes(normalized)) {
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
    dotColor = 'bg-blue-500 animate-pulse';
  } else if (['PENDING', 'ASSIGNED', 'SCHEDULED', 'INSPECTION', 'WAITING_PARTS', 'LOW_STOCK', 'ATTENTION', 'PARTIAL', 'WAITING_APPROVAL'].includes(normalized)) {
    colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    dotColor = 'bg-amber-500';
  } else if (['CANCELLED', 'OVERDUE', 'OUT_OF_STOCK', 'FAIL', 'INACTIVE', 'SUSPENDED', 'FLAGGED', 'NO_SHOW', 'FAILED', 'REJECTED'].includes(normalized)) {
    colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
    dotColor = 'bg-rose-500';
  } else if (['QUALITY_CHECK', 'VIP', 'READY_FOR_PICKUP', 'APPROVED'].includes(normalized)) {
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
    dotColor = 'bg-purple-500';
  }

  const label = (status || '').replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${colorClasses} ${sizeClasses} capitalize ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};
