import { Estimate, Invoice, MaintenanceReminder, Vehicle } from '../types';

export function roundMoney(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Subtotal = Labor Cost + Service Cost + Spare Parts Cost */
export function calcSubtotal(laborCost: number, serviceCost: number, partsCost: number) {
  return roundMoney(laborCost + serviceCost + partsCost);
}

/** Grand Total = Subtotal − Discount + Tax */
export function calcGrandTotal(subtotal: number, discount: number, tax: number) {
  return roundMoney(subtotal - discount + tax);
}

/** Remaining Balance = Grand Total − Total Paid */
export function remainingBalance(grandTotal: number, totalPaid: number) {
  return roundMoney(Math.max(0, grandTotal - totalPaid));
}

export function invoiceRemaining(inv: Invoice) {
  return remainingBalance(inv.totalAmount, inv.amountPaid);
}

export function nextOilChangeMileage(currentMileage: number, intervalKm = 5000) {
  return currentMileage + intervalKm;
}

export function findDuplicateVehicle(
  vehicles: Vehicle[],
  plate: string,
  vin: string,
  excludeId?: string
) {
  const plateKey = plate.trim().toUpperCase().replace(/\s+/g, '');
  const vinKey = vin.trim().toUpperCase();
  return vehicles.find((v) => {
    if (excludeId && v.id === excludeId) return false;
    const existingPlate = (v.licensePlate || '').trim().toUpperCase().replace(/\s+/g, '');
    if (plateKey && existingPlate && existingPlate === plateKey) return true;
    const existingVin = (v.vin || '').trim().toUpperCase();
    if (vinKey && existingVin && existingVin === vinKey) return true;
    return false;
  });
}

export function validatePaymentAmount(amount: number, balanceDue: number) {
  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Payment amount must be greater than zero.';
  }
  if (amount > balanceDue + 0.009) {
    return `Amount exceeds remaining balance of $${balanceDue.toFixed(2)}.`;
  }
  return null;
}

export function estimateTotals(est: Pick<Estimate, 'laborCost' | 'serviceCost' | 'partsCost' | 'discount' | 'taxRatePercent'>) {
  const subtotal = calcSubtotal(est.laborCost, est.serviceCost, est.partsCost);
  const taxAmount = roundMoney(Math.max(0, subtotal - est.discount) * (est.taxRatePercent / 100));
  const estimatedTotal = calcGrandTotal(subtotal, est.discount, taxAmount);
  return { subtotal, taxAmount, estimatedTotal };
}

export function reminderStatus(currentMileage: number, dueMileage?: number, dueDate?: string): 'UPCOMING' | 'DUE' | 'OVERDUE' {
  if (dueMileage != null) {
    const gap = dueMileage - currentMileage;
    if (gap <= 0) return 'OVERDUE';
    if (gap <= 800) return 'DUE';
    return 'UPCOMING';
  }
  if (dueDate) {
    const due = new Date(dueDate).getTime();
    const now = Date.now();
    const days = (due - now) / (1000 * 60 * 60 * 24);
    if (days < 0) return 'OVERDUE';
    if (days <= 14) return 'DUE';
    return 'UPCOMING';
  }
  return 'UPCOMING';
}

export function remindersFromVehicles(vehicles: Vehicle[]): MaintenanceReminder[] {
  return vehicles.flatMap((v) => {
    const info = `${v.brand} ${v.model} (${v.licensePlate})`;
    const items: MaintenanceReminder[] = [];
    if (v.nextServiceMileage || v.nextServiceDate) {
      items.push({
        id: `rem-oil-${v.id}`,
        customerId: v.customerId,
        vehicleId: v.id,
        vehicleInfo: info,
        kind: 'OIL_CHANGE',
        title: 'Oil change / periodic service',
        dueDate: v.nextServiceDate,
        dueMileage: v.nextServiceMileage || nextOilChangeMileage(v.mileage),
        currentMileage: v.mileage,
        status: reminderStatus(v.mileage, v.nextServiceMileage, v.nextServiceDate)
      });
    }
    if (v.mileage > 0) {
      const brakeDue = Math.ceil(v.mileage / 10000) * 10000;
      items.push({
        id: `rem-brake-${v.id}`,
        customerId: v.customerId,
        vehicleId: v.id,
        vehicleInfo: info,
        kind: 'BRAKE_INSPECTION',
        title: 'Brake inspection',
        dueMileage: brakeDue,
        currentMileage: v.mileage,
        status: reminderStatus(v.mileage, brakeDue)
      });
    }
    return items;
  });
}
