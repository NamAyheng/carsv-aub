export type AlertTone = 'red' | 'orange' | 'green';

export interface CustomerAlert {
  tone: AlertTone;
  label: string;
}

const rank: Record<AlertTone, number> = { red: 3, orange: 2, green: 1 };

/** Red needs a decision or reports a problem. Orange is in progress or coming up. Green is a finished good result. */
export function customerAlert(type: string, title: string, message: string): CustomerAlert | null {
  const text = `${title} ${message}`.toLowerCase();

  if (type === 'INVOICE') {
    if (text.includes('draft') || text.includes('cancelled')) return null;
    if (text.includes('paid')) return { tone: 'green', label: 'Paid' };
    return { tone: 'red', label: 'Payment due' };
  }

  if (type === 'PAYMENT') return { tone: 'green', label: 'Paid' };

  if (type === 'QUOTE') {
    if (text.includes('approved')) return { tone: 'green', label: 'Approved' };
    if (text.includes('rejected') || text.includes('declined')) return { tone: 'orange', label: 'Declined' };
    return { tone: 'red', label: 'Needs approval' };
  }

  if (type === 'MAINTENANCE') return { tone: 'orange', label: 'Service due' };

  if (type === 'PICKUP') return { tone: 'green', label: 'Ready' };

  if (type === 'REPAIR') {
    if (text.includes('part')) return { tone: 'red', label: 'Waiting for parts' };
    if (text.includes('ready') || text.includes('completed')) return { tone: 'green', label: 'Ready' };
    return { tone: 'orange', label: 'In the shop' };
  }

  if (type === 'APPOINTMENT') {
    if (text.includes('cancel')) return { tone: 'red', label: 'Cancelled' };
    if (text.includes('completed')) return null;
    if (text.includes('part')) return { tone: 'red', label: 'Waiting for parts' };
    if (text.includes('ready')) return { tone: 'green', label: 'Ready' };
    if (text.includes('confirmed')) return { tone: 'green', label: 'Confirmed' };
    if (text.includes('in service') || text.includes('checked in')) return { tone: 'orange', label: 'In the shop' };
    return { tone: 'orange', label: 'Pending' };
  }

  return null;
}

export function strongestAlert(tones: AlertTone[]): AlertTone | null {
  if (tones.length === 0) return null;
  return tones.reduce((best, tone) => (rank[tone] > rank[best] ? tone : best));
}

/** Open workshop jobs only. A finished job is not an alert. */
export function workOrderAlert(status: string): AlertTone | null {
  if (status === 'WAITING_APPROVAL' || status === 'WAITING_PARTS') return 'red';
  if (status === 'READY_FOR_PICKUP') return 'green';
  if (status === 'COMPLETED' || status === 'DELIVERED' || !status) return null;
  return 'orange';
}

export function alertBadgeClass(tone: AlertTone): string {
  if (tone === 'red') return 'bg-red-500';
  if (tone === 'orange') return 'bg-orange-500';
  return 'bg-emerald-500';
}

export function alertChipClass(tone: AlertTone): string {
  if (tone === 'red') return 'bg-red-500 text-white';
  if (tone === 'orange') return 'bg-orange-500 text-white';
  return 'bg-emerald-600 text-white';
}
