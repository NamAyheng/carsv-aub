import { Invoice, InvoiceItem, InvoiceKind } from '../types';

export function invoiceKind(inv: Invoice): InvoiceKind {
  if (inv.kind) return inv.kind;
  const hasJob = Boolean(inv.workOrderId || inv.workOrderNumber);
  const hasLabor = (inv.items || []).some((i) => i.type === 'LABOR' || i.type === 'SERVICE');
  return hasJob || hasLabor ? 'SERVICE_REPAIR' : 'PARTS_SALE';
}

export function isPartsSaleInvoice(inv: Invoice) {
  return invoiceKind(inv) === 'PARTS_SALE';
}

export function itemAmount(item: InvoiceItem) {
  return item.totalPrice ?? item.quantity * item.unitPrice;
}

export function laborSubtotal(inv: Invoice) {
  return (inv.items || [])
    .filter((i) => i.type === 'LABOR' || i.type === 'SERVICE')
    .reduce((sum, i) => sum + itemAmount(i), 0);
}

export function partsSubtotal(inv: Invoice) {
  return (inv.items || []).filter((i) => i.type === 'PART').reduce((sum, i) => sum + itemAmount(i), 0);
}

export function extraPartsOnJob(inv: Invoice) {
  return (inv.items || []).filter((i) => i.type === 'PART' && i.addedAfterBooking);
}

export function fulfillmentLabel(inv: Invoice) {
  switch (inv.fulfillment) {
    case 'DELIVERY':
      return 'Express delivery';
    case 'WORKSHOP_INSTALL':
      return 'Fitting at parts counter';
    default:
      return 'Counter pickup';
  }
}
