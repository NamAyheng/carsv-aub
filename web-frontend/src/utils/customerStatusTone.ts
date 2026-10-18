/** Soft status chips like Tracking: light fill + dark text + matching border. */

export type SoftTone = 'green' | 'orange' | 'red' | 'blue' | 'amber' | 'slate';

const TONE: Record<SoftTone, string> = {
  green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  orange: 'bg-orange-50 text-orange-800 border-orange-200',
  red: 'bg-red-50 text-red-800 border-red-200',
  blue: 'bg-blue-50 text-blue-800 border-blue-200',
  amber: 'bg-amber-50 text-amber-800 border-amber-200',
  slate: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function softStatusBadge(tone: SoftTone): string {
  return `px-2.5 py-1 rounded-lg text-xs font-bold border ${TONE[tone]}`;
}

export function softStatusButton(tone: SoftTone): string {
  return `text-xs font-bold py-1.5 px-3 rounded-lg border transition-all ${TONE[tone]} hover:opacity-90`;
}

/** Appointment / visit status → soft tone (matches Tracking: Waiting = orange). */
export function appointmentStatusTone(
  status: string,
  label?: string
): SoftTone {
  const text = `${status} ${label || ''}`.toLowerCase();
  if (status === 'CANCELLED' || text.includes('cancel')) return 'red';
  if (status === 'COMPLETED' || text.includes('completed') || text.includes('ready')) return 'green';
  if (status === 'CONFIRMED' || text.includes('confirmed')) return 'green';
  // Same as Tracking: Waiting / PENDING is orange focus — not blue.
  if (
    status === 'PENDING' ||
    status === 'SCHEDULED' ||
    text.includes('waiting for approval') ||
    text.includes('waiting for parts') ||
    /\bwaiting\b/.test(text)
  ) {
    if (text.includes('approval') || text.includes('parts')) return 'amber';
    return 'orange';
  }
  if (
    status === 'IN_PROGRESS' ||
    text.includes('in progress') ||
    text.includes('in service') ||
    text.includes('repair') ||
    text.includes('checked')
  ) {
    return 'blue';
  }
  return 'orange';
}

/** Invoice pay state soft badge. */
export function invoicePaySoftTone(state: 'PAID' | 'PENDING' | 'UNPAID'): SoftTone {
  if (state === 'PAID') return 'green';
  if (state === 'PENDING') return 'orange';
  return 'red';
}
