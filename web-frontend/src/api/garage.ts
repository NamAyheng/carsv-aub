import { apiErrorMessage, apiRequest } from './client';
import {
  Appointment,
  AppointmentStatus,
  Estimate,
  InspectionReport,
  InventoryPart,
  Invoice,
  NotificationItem,
  PaymentReceipt,
  PaymentRecord,
  RepairTask,
  ServiceHistoryRecord,
  ServiceItem,
  User,
  Vehicle,
  WorkOrder,
  WorkOrderStatus,
} from '../types';

/** Normalize media URLs for Vite proxy (local) or absolute API host (Render Static Site). */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  let trimmed = String(url).trim();
  if (!trimmed) return '';
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.toLowerCase();
      if (host === 'api' || host === 'carsv-api' || host.endsWith('.internal')) {
        trimmed = `${parsed.pathname}${parsed.search}`;
      } else {
        return trimmed;
      }
    }
  } catch {
    /* keep original */
  }
  const apiBase = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
  if (apiBase && trimmed.startsWith('/media/')) {
    return `${apiBase}${trimmed}`;
  }
  return trimmed;
}

export type CustomerProfile = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  phone: string;
  role: string;
  address: string;
  photo_url?: string;
  telegram_bot_configured?: boolean;
  telegram_linked?: boolean;
  telegram_username?: string;
  telegram_alerts?: boolean;
};

type ApiVehicle = {
  id: number;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  vehicle_type: string;
  vin: string | null;
  engine_number: string;
  mileage: number;
  status: string;
  next_service_date: string | null;
  next_service_mileage: number | null;
  notes: string;
  image_url?: string;
};

type ApiService = {
  id: number;
  name: string;
  description: string;
  price: string;
  duration_minutes: number;
  category_name: string;
  image_url?: string;
};

type ApiBooking = {
  id: number;
  vehicle: number;
  service: number;
  booking_date: string;
  booking_time: string | null;
  problem: string;
  note: string;
  status: string;
  cancel_reason: string;
  services?: { id?: number | null; name: string; price: string; primary: boolean }[];
  work_order_number?: string;
  work_order_status?: string;
  mechanic_name?: string;
  status_label?: string;
};

type ApiInspection = {
  id: number;
  repair_job: number;
  status?: string;
  status_label?: string;
  mileage: number;
  fuel_level: string;
  front_brake_mm?: string | number | null;
  rear_brake_mm?: string | number | null;
  tire_tread_mm?: string | number | null;
  condition: string;
  damage: string;
  note?: string;
  complaint: string;
  photos?: string[];
  checked_in_at: string;
  staff_name: string;
  staff_photo: string;
};

type ApiRepair = {
  id: number;
  booking: number;
  vehicle: number;
  vehicle_plate: string;
  status: string;
  status_label: string;
  progress: number;
  problem: string;
  diagnosis?: string;
  start_date: string | null;
  estimated_end: string | null;
  mechanic_name: string;
  mechanic_photo: string;
  parts_used: { id: number; part_name: string; part_number: string; quantity: number; unit_price: string; total: string }[];
  services?: { id?: number | null; name: string; price: string | number; primary: boolean }[];
  invoice_number?: string;
  labor_cost?: string | number;
  service_cost?: string | number;
  parts_cost?: string | number;
  discount?: string | number;
  tax?: string | number;
  invoice_total?: string | number;
};

type ApiInvoicePart = {
  id: number | string;
  part_name: string;
  part_number: string;
  quantity: number;
  unit_price: string;
  total: string;
  used_at?: string | null;
  added_after_booking?: boolean;
  requested?: boolean;
};

type ApiInvoice = {
  id: number;
  number: string;
  vehicle: number;
  vehicle_plate: string;
  vehicle_title?: string;
  repair_job: number;
  service_name: string;
  mechanic_name?: string;
  booking_date?: string | null;
  due_date?: string | null;
  note?: string;
  labor_cost: string;
  service_cost: string;
  parts_cost: string;
  parts: ApiInvoicePart[];
  discount: string;
  tax: string;
  subtotal: string;
  grand_total: string;
  invoice_date: string;
  status: string;
  payment_state?: string;
  amount_paid: string;
  amount_pending?: string;
};

type ApiPayment = {
  id: number;
  number: string;
  invoice: number;
  invoice_number: string;
  amount: string;
  method: string;
  paid_at: string;
  reference: string;
  proof_url?: string;
  status: string;
  receipt_number: string;
  verified_at?: string | null;
};

type ApiPart = {
  id: number;
  part_number: string;
  name: string;
  brand: string;
  unit_price: string;
  quantity: number;
  category_name: string;
  image_url: string;
};

type ApiHistory = {
  id: number;
  vehicle: number;
  vehicle_plate: string;
  problem: string;
  diagnosis?: string;
  status: string;
  start_date: string | null;
  mechanic_name: string;
  mechanic_photo: string;
  inspector_name: string;
  inspector_photo: string;
  mileage: number;
  parts_used: string;
  total_cost: string | null;
};

type ApiEstimatePart = {
  id: number;
  part_name: string;
  part_number: string;
  quantity: number;
  unit_price: string;
  total: string;
};

type ApiEstimate = {
  id: number;
  number: string;
  vehicle: number;
  vehicle_plate: string;
  vehicle_info: string;
  repair_job: number | null;
  description: string;
  service_name: string;
  labor_cost: string;
  service_cost: string;
  parts_cost: string;
  parts: ApiEstimatePart[];
  discount: string;
  tax: string;
  status: string;
  decision_note: string;
  decided_at: string | null;
  created_at: string;
};

type ApiNotification = {
  id: number;
  kind: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

const SERVICE_CATEGORIES: ServiceItem['category'][] = [
  'Maintenance',
  'Engine',
  'Brakes',
  'Electrical',
  'Transmission',
  'Tires',
  'AC & Heating',
  'Body',
];

function customerKey(profile: CustomerProfile): string {
  return `api-${profile.id}`;
}

async function readList<T>(path: string): Promise<T[]> {
  const response = await apiRequest(path);
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  const data = await response.json();
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.results)) return data.results as T[];
  return [];
}

function vehicleStatus(status: string): Vehicle['status'] {
  if (status === 'IN_SHOP') return 'IN_REPAIR';
  if (status === 'INACTIVE') return 'COMPLETED';
  return 'READY';
}

function bookingStatus(status: string): AppointmentStatus {
  if (status === 'CONFIRMED') return 'CONFIRMED';
  // Waiting = work order open at 0% (car not finished check-in yet). Still trackable.
  if (status === 'WAITING') return 'IN_PROGRESS';
  if (status === 'COMPLETED') return 'COMPLETED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'PENDING') return 'SCHEDULED';
  return 'IN_PROGRESS';
}

function progressForStatus(status: string): number {
  switch (status) {
    case 'WAITING':
      return 0;
    case 'DIAGNOSING':
      return 20;
    case 'WAITING_APPROVAL':
      return 40;
    case 'REPAIRING':
    case 'WAITING_PARTS':
      return 60;
    case 'QUALITY_CHECK':
      return 80;
    case 'READY_FOR_PICKUP':
      return 90;
    case 'COMPLETED':
      return 100;
    default:
      return 0;
  }
}

function repairStatus(status: string): WorkOrderStatus {
  switch (status) {
    case 'WAITING':
      // Confirmed visit / open work order at 0% — must still show on Tracking.
      return 'PENDING';
    case 'DIAGNOSING':
      return 'ASSIGNED';
    case 'WAITING_APPROVAL':
      return 'WAITING_APPROVAL';
    case 'REPAIRING':
      return 'IN_PROGRESS';
    case 'WAITING_PARTS':
      return 'WAITING_PARTS';
    case 'QUALITY_CHECK':
      return 'QUALITY_CHECK';
    case 'READY_FOR_PICKUP':
      return 'READY_FOR_PICKUP';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'CANCELLED':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

function serviceCategory(name: string): ServiceItem['category'] {
  return SERVICE_CATEGORIES.find((item) => item.toLowerCase() === name.toLowerCase()) || 'Maintenance';
}

export function userFromProfile(profile: CustomerProfile): User {
  return {
    id: customerKey(profile),
    name: profile.name || profile.username,
    email: profile.email,
    phone: profile.phone || '',
    role: 'CUSTOMER',
    avatar: mediaUrl(profile.photo_url),
    status: 'ACTIVE',
    lastLogin: '',
    createdAt: '',
    address: profile.address || '',
    telegramBotConfigured: Boolean(profile.telegram_bot_configured),
    telegramLinked: Boolean(profile.telegram_linked),
    telegramUsername: (profile.telegram_username || '').replace(/^@/, ''),
    telegramAlerts: profile.telegram_alerts !== false,
  };
}

export async function fetchTelegramConnectLink(): Promise<{
  url: string;
  bot_username: string;
  linked: boolean;
  telegram_alerts: boolean;
}> {
  const response = await apiRequest('/api/auth/telegram/connect/');
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  const data = (await response.json()) as {
    ok?: boolean;
    url?: string;
    bot_username?: string;
    linked?: boolean;
    telegram_alerts?: boolean;
    error?: string;
  };
  if (!data.url) throw new Error(data.error || 'Telegram connect is unavailable.');
  return {
    url: data.url,
    bot_username: data.bot_username || '',
    linked: Boolean(data.linked),
    telegram_alerts: data.telegram_alerts !== false,
  };
}

export async function disconnectTelegram(): Promise<void> {
  const response = await apiRequest('/api/auth/telegram/connect/', { method: 'DELETE' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function setTelegramAlerts(enabled: boolean): Promise<void> {
  const response = await apiRequest('/api/auth/telegram/connect/', {
    method: 'PATCH',
    body: JSON.stringify({ telegram_alerts: enabled }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

function mapVehicle(row: ApiVehicle, profile: CustomerProfile): Vehicle {
  return {
    id: String(row.id),
    customerId: customerKey(profile),
    customerName: profile.name,
    customerEmail: profile.email,
    brand: row.brand,
    model: row.model,
    year: row.year,
    licensePlate: row.plate,
    vin: row.vin || '',
    mileage: row.mileage || 0,
    color: row.color || '',
    fuelType: 'Gasoline',
    transmission: 'Automatic',
    status: vehicleStatus(row.status),
    lastServiceDate: '',
    image: mediaUrl(row.image_url),
    imageUrl: mediaUrl(row.image_url),
    notes: row.notes || '',
    vehicleType: row.vehicle_type || '',
    engineNumber: row.engine_number || '',
    nextServiceDate: row.next_service_date || '',
    nextServiceMileage: row.next_service_mileage || undefined,
  };
}

function mapService(row: ApiService): ServiceItem {
  return {
    id: String(row.id),
    name: row.name,
    category: serviceCategory(row.category_name || ''),
    description: row.description || '',
    basePrice: Number(row.price) || 0,
    estimatedDurationHours: Math.max((row.duration_minutes || 60) / 60, 0.5),
    requiredParts: [],
    status: 'ACTIVE',
    timesPerformed: 0,
    imageUrl: mediaUrl(row.image_url),
  };
}

function mapBooking(
  row: ApiBooking,
  profile: CustomerProfile,
  vehicles: Vehicle[],
  services: ServiceItem[]
): Appointment {
  const vehicle = vehicles.find((item) => item.id === String(row.vehicle));
  const service = services.find((item) => item.id === String(row.service));
  return {
    id: String(row.id),
    customerId: customerKey(profile),
    customerName: profile.name,
    customerEmail: profile.email,
    customerPhone: profile.phone || '',
    vehicleId: String(row.vehicle),
    vehicleInfo: vehicle
      ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})`
      : `Vehicle ${row.vehicle}`,
    serviceName: (row.services || []).map((item) => item.name).join(', ') || service?.name || `Service ${row.service}`,
    serviceId: String(row.service),
    services: (row.services || []).map((item) => ({
      id: item.id == null ? null : Number(item.id),
      name: item.name,
      price: Number(item.price) || 0,
      primary: Boolean(item.primary),
    })),
    workOrderNumber: row.work_order_number || '',
    workOrderStatus: row.work_order_status || '',
    statusLabel: row.status_label || '',
    date: row.booking_date,
    time: row.booking_time ? row.booking_time.slice(0, 5) : '',
    problemDescription: row.problem || '',
    priority: 'MEDIUM',
    status: bookingStatus(row.status),
    assignedStaffName: row.mechanic_name || '',
    estimatedDurationHours: service?.estimatedDurationHours || 1,
    notes: row.note || '',
    cancellationReason: row.cancel_reason || '',
  };
}

function mapInspection(row: ApiInspection, workOrderId: string): InspectionReport {
  const fuel = Number.parseInt(String(row.fuel_level || '').replace(/[^\d]/g, ''), 10);
  return {
    id: String(row.id),
    workOrderId,
    type: 'BEFORE_REPAIR',
    inspectorName: row.staff_name || '',
    inspectorPhoto: mediaUrl(row.staff_photo),
    fuelLabel: row.fuel_level || '',
    conditionSummary: row.condition || '',
    damageSummary: row.damage || '',
    complaint: row.complaint || '',
    inspectionDate: row.checked_in_at ? row.checked_in_at.slice(0, 10) : '',
    mileage: row.mileage || 0,
    fuelLevelPercent: Number.isFinite(fuel) ? fuel : 0,
    exteriorCondition: 'GOOD',
    interiorCondition: 'FAIR',
    engineCondition: 'NORMAL',
    existingDamages: row.damage ? row.damage.split('\n').filter(Boolean) : [],
    checkItems: [],
    photos: (row.photos || []).map((photo) => mediaUrl(photo)).filter(Boolean),
    notes: row.note || '',
    inspectionStatus: row.status_label || row.status || '',
    frontBrakeMm: row.front_brake_mm == null || row.front_brake_mm === '' ? '' : String(row.front_brake_mm),
    rearBrakeMm: row.rear_brake_mm == null || row.rear_brake_mm === '' ? '' : String(row.rear_brake_mm),
    treadMm: row.tire_tread_mm == null || row.tire_tread_mm === '' ? '' : String(row.tire_tread_mm),
    inspectorNote: row.note || '',
  };
}

function mapRepair(row: ApiRepair, profile: CustomerProfile, vehicles: Vehicle[], inspections: ApiInspection[]): WorkOrder {
  const vehicle = vehicles.find((item) => item.id === String(row.vehicle));
  const taskStatus: RepairTask['status'] =
    row.status === 'COMPLETED' ? 'COMPLETED' : row.status === 'WAITING' ? 'PENDING' : 'IN_PROGRESS';
  const task: RepairTask = {
    id: `${row.id}-status`,
    workOrderId: String(row.id),
    title: row.status_label || row.status,
    description: row.diagnosis || row.problem || 'Repair in progress.',
    vehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model}` : row.vehicle_plate,
    technicianId: '',
    technicianName: row.mechanic_name || 'Unassigned',
    priority: 'MEDIUM',
    dueDate: row.estimated_end || '',
    estimatedHours: 0,
    progress: Number.isFinite(Number(row.progress)) ? Number(row.progress) : progressForStatus(row.status),
    status: taskStatus,
  };
  const inspection = inspections.find((item) => item.repair_job === row.id);
  const invoiceTotal = money(row.invoice_total);
  return {
    id: String(row.id),
    workOrderNumber: `WO-${String(row.id).padStart(4, '0')}`,
    customerId: customerKey(profile),
    customerName: profile.name,
    customerPhone: profile.phone || '',
    customerEmail: profile.email,
    vehicleId: String(row.vehicle),
    vehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model}` : row.vehicle_plate,
    vehiclePlate: row.vehicle_plate || vehicle?.licensePlate || '',
    vehicleMileage: vehicle?.mileage || 0,
    reportedProblem: row.problem || '',
    priority: 'MEDIUM',
    status: repairStatus(row.status),
    statusLabel: row.status_label || '',
    assignedTechnicianId: '',
    assignedTechnicianName: row.mechanic_name || 'Unassigned',
    assignedTechnicianPhoto: mediaUrl(row.mechanic_photo),
    estimatedCost: invoiceTotal,
    laborRatePerHour: 0,
    laborHoursEstimated: 0,
    laborHoursActual: 0,
    services: (row.services || []).map((item) => item.name),
    visitServices: (row.services || []).map((item) => ({
      id: item.id == null ? null : Number(item.id),
      name: item.name,
      price: money(item.price),
      primary: Boolean(item.primary),
    })),
    tasks: [task],
    partsUsed: (row.parts_used || []).map((part) => ({
      partId: String(part.id),
      partName: part.part_name,
      partNumber: part.part_number,
      quantity: part.quantity,
      unitPrice: Number(part.unit_price) || 0,
      totalPrice: Number(part.total) || 0,
    })),
    beforePhotos: [],
    afterPhotos: [],
    beforeInspection: inspection ? mapInspection(inspection, String(row.id)) : undefined,
    invoiceNumber: row.invoice_number || '',
    laborCost: money(row.labor_cost),
    serviceCost: money(row.service_cost),
    partsCost: money(row.parts_cost),
    discountAmount: money(row.discount),
    taxAmount: money(row.tax),
    invoiceTotal,
    isPaid: false,
    createdAt: row.start_date || '',
    notes: '',
    diagnosis: row.diagnosis || '',
    bookingId: row.booking ? String(row.booking) : '',
  };
}

export type CustomerPortalData = {
  vehicles: Vehicle[];
  services: ServiceItem[];
  appointments: Appointment[];
  workOrders: WorkOrder[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  receipts: PaymentReceipt[];
  estimates: Estimate[];
  history: ServiceHistoryRecord[];
  notifications: NotificationItem[];
  parts: InventoryPart[];
};

function money(value: string | number | null | undefined): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function mapInvoice(row: ApiInvoice, profile: CustomerProfile, vehicles: Vehicle[]): Invoice {
  const vehicle = vehicles.find((item) => item.id === String(row.vehicle));
  const paid = money(row.amount_paid);
  const total = money(row.grand_total);
  const items: Invoice['items'] = [];
  if (money(row.labor_cost) > 0) {
    items.push({
      id: `${row.id}-labor`,
      description: 'Mechanic labor',
      type: 'LABOR',
      quantity: 1,
      unitPrice: money(row.labor_cost),
      totalPrice: money(row.labor_cost),
    });
  }
  if (money(row.service_cost) > 0) {
    items.push({
      id: `${row.id}-service`,
      description: row.service_name || 'Booked service',
      type: 'SERVICE',
      quantity: 1,
      unitPrice: money(row.service_cost),
      totalPrice: money(row.service_cost),
    });
  }
  const usedParts = row.parts || [];
  if (usedParts.length > 0) {
    usedParts.forEach((part) => {
      items.push({
        id: String(part.id),
        description: part.part_name,
        sku: part.part_number,
        type: 'PART',
        quantity: part.quantity,
        unitPrice: money(part.unit_price),
        totalPrice: money(part.total),
        addedAfterBooking: Boolean(part.added_after_booking),
        requested: Boolean(part.requested),
      });
    });
  } else if (money(row.parts_cost) > 0) {
    items.push({
      id: `${row.id}-parts`,
      description: 'Parts',
      type: 'PART',
      quantity: 1,
      unitPrice: money(row.parts_cost),
      totalPrice: money(row.parts_cost),
    });
  }
  const paymentState =
    row.payment_state === 'PAID' || row.status === 'PAID'
      ? 'PAID'
      : row.payment_state === 'PENDING'
        ? 'PENDING'
        : 'UNPAID';
  const status =
    row.status === 'PAID'
      ? 'PAID'
      : row.status === 'PARTIAL'
        ? 'PARTIAL'
        : row.status === 'CANCELLED'
          ? 'CANCELLED'
          : row.status === 'DRAFT'
            ? 'DRAFT'
            : paymentState === 'PENDING'
              ? 'PENDING'
              : 'UNPAID';
  const jobId = row.repair_job ? String(row.repair_job).padStart(4, '0') : '';
  return {
    id: String(row.id),
    invoiceNumber: row.number,
    kind: 'SERVICE_REPAIR',
    workOrderId: String(row.repair_job),
    workOrderNumber: jobId ? `WO-${jobId}` : '',
    technicianName: row.mechanic_name || '',
    customerId: customerKey(profile),
    customerName: profile.name,
    customerEmail: profile.email,
    customerPhone: profile.phone || '',
    customerAddress: profile.address || '',
    vehicleId: String(row.vehicle),
    vehicleInfo: row.vehicle_title || (vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : row.vehicle_plate),
    vehiclePlate: row.vehicle_plate,
    items,
    subtotal: money(row.subtotal),
    taxRatePercent: 0,
    taxAmount: money(row.tax),
    discountPercent: 0,
    discountAmount: money(row.discount),
    totalAmount: total,
    amountPaid: paid,
    balanceDue: Math.max(total - paid, 0),
    issueDate: row.invoice_date,
    dueDate: row.due_date || row.invoice_date,
    status,
    paymentState,
    amountPending: money(row.amount_pending || 0),
    notes: row.note || '',
  };
}

function paymentMethod(method: string): PaymentRecord['paymentMethod'] {
  if (method === 'CASH') return 'Cash';
  if (method === 'BANK') return 'Bank Transfer';
  if (method === 'CARD') return 'Credit Card';
  return 'ABA PayWay';
}

function mapPayment(row: ApiPayment, profile: CustomerProfile): PaymentRecord {
  const status = row.status === 'PAID' ? 'COMPLETED' : row.status === 'REFUNDED' ? 'REFUNDED' : row.status === 'FAILED' ? 'FAILED' : 'PENDING';
  return {
    id: String(row.id),
    paymentIdNumber: row.number,
    invoiceId: String(row.invoice),
    invoiceNumber: row.invoice_number,
    customerId: customerKey(profile),
    customerName: profile.name,
    amount: money(row.amount),
    paymentMethod: paymentMethod(row.method),
    paymentDate: row.paid_at,
    transactionRef: row.reference || '',
    status,
    receivedBy: '',
    receiptNumber: row.receipt_number || undefined,
    proofUrl: row.proof_url || '',
  };
}

export type CustomerPaymentClaimInput = {
  invoiceId: string;
  amount: number;
  method: 'CASH' | 'BANK' | 'CARD' | 'QR';
  reference?: string;
  proofFile?: File | null;
};

export async function claimCustomerPayment(
  profile: CustomerProfile,
  input: CustomerPaymentClaimInput
): Promise<PaymentRecord> {
  const body = new FormData();
  body.append('invoice', input.invoiceId);
  body.append('amount', String(input.amount));
  body.append('method', input.method);
  if (input.reference) body.append('reference', input.reference);
  if (input.proofFile) body.append('proof', input.proofFile);
  const response = await apiRequest('/api/customer/payments/', { method: 'POST', body });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return mapPayment((await response.json()) as ApiPayment, profile);
}

export async function withdrawCustomerPayment(paymentId: string): Promise<{ ok: boolean; payment_state?: string }> {
  const response = await apiRequest(`/api/customer/payments/${paymentId}/withdraw/`, { method: 'POST', body: '{}' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return (await response.json()) as { ok: boolean; payment_state?: string };
}

function mapEstimate(row: ApiEstimate, profile: CustomerProfile): Estimate {
  const items: Estimate['items'] = [];
  if (money(row.labor_cost) > 0) {
    items.push({
      id: `${row.id}-labor`,
      description: 'Mechanic labor',
      type: 'LABOR',
      quantity: 1,
      unitPrice: money(row.labor_cost),
      totalPrice: money(row.labor_cost),
    });
  }
  if (money(row.service_cost) > 0) {
    items.push({
      id: `${row.id}-service`,
      description: row.service_name || 'Booked service',
      type: 'SERVICE',
      quantity: 1,
      unitPrice: money(row.service_cost),
      totalPrice: money(row.service_cost),
    });
  }
  const usedParts = row.parts || [];
  if (usedParts.length > 0) {
    usedParts.forEach((part) => {
      items.push({
        id: String(part.id),
        description: part.part_number ? `${part.part_name} (${part.part_number})` : part.part_name,
        type: 'PART',
        quantity: part.quantity,
        unitPrice: money(part.unit_price),
        totalPrice: money(part.total),
      });
    });
  } else if (money(row.parts_cost) > 0) {
    items.push({
      id: `${row.id}-parts`,
      description: 'Parts',
      type: 'PART',
      quantity: 1,
      unitPrice: money(row.parts_cost),
      totalPrice: money(row.parts_cost),
    });
  }
  const subtotal = money(row.labor_cost) + money(row.service_cost) + money(row.parts_cost);
  const status = row.status === 'APPROVED' ? 'APPROVED' : row.status === 'REJECTED' ? 'REJECTED' : 'WAITING_APPROVAL';
  return {
    id: String(row.id),
    estimateNumber: row.number,
    customerId: customerKey(profile),
    customerName: profile.name,
    customerEmail: profile.email,
    vehicleId: String(row.vehicle),
    vehicleInfo: row.vehicle_info,
    vehiclePlate: row.vehicle_plate,
    workOrderId: row.repair_job ? String(row.repair_job) : undefined,
    recommendedServices: row.description ? [row.description] : [],
    items,
    laborCost: money(row.labor_cost),
    serviceCost: money(row.service_cost),
    partsCost: money(row.parts_cost),
    subtotal,
    discount: money(row.discount),
    taxRatePercent: 0,
    taxAmount: money(row.tax),
    estimatedTotal: subtotal - money(row.discount) + money(row.tax),
    status,
    customerDecisionNote: row.decision_note || undefined,
    decidedAt: row.decided_at || undefined,
    createdAt: row.created_at,
    validUntil: '',
    notes: row.description || '',
  };
}

function mapNotification(row: ApiNotification): NotificationItem {
  const type =
    row.kind === 'REPAIR' ? 'REPAIR' : row.kind === 'INVOICE' ? 'INVOICE' : row.kind === 'PAYMENT' ? 'PAYMENT' : row.kind === 'QUOTE' ? 'QUOTE' : row.kind === 'MAINTENANCE' ? 'MAINTENANCE' : 'APPOINTMENT';
  return {
    id: String(row.id),
    type,
    title: row.title,
    message: row.message,
    timestamp: row.created_at,
    read: row.read,
    priority: 'MEDIUM',
    audience: 'CUSTOMER',
  };
}

function mapPart(row: ApiPart): InventoryPart {
  return {
    id: String(row.id),
    name: row.name,
    sku: row.part_number,
    category: 'Brakes',
    stockQuantity: row.quantity,
    minStockLevel: 0,
    unitPrice: money(row.unit_price),
    costPrice: money(row.unit_price),
    supplierId: '',
    supplierName: row.brand || '',
    location: row.category_name || '',
    status: row.quantity > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK',
    lastRestockedDate: '',
    imageUrl: mediaUrl(row.image_url),
  };
}

function mapHistory(row: ApiHistory, profile: CustomerProfile): ServiceHistoryRecord {
  return {
    id: String(row.id),
    vehicleId: String(row.vehicle),
    customerId: customerKey(profile),
    workOrderId: String(row.id),
    workOrderNumber: `WO-${String(row.id).padStart(4, '0')}`,
    serviceDate: row.start_date || '',
    mileage: row.mileage || 0,
    serviceType: row.problem || row.diagnosis || 'Completed repair',
    mechanicName: row.mechanic_name || '',
    mechanicPhoto: mediaUrl(row.mechanic_photo),
    inspectorName: row.inspector_name || '',
    inspectorPhoto: mediaUrl(row.inspector_photo),
    partsUsed: row.parts_used || '',
    laborCost: 0,
    totalCost: money(row.total_cost),
    status: 'COMPLETED',
  };
}

export async function loadPublicServices(): Promise<ServiceItem[]> {
  const response = await fetch('/api/public/services/');
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  const data = await response.json();
  const rows = (Array.isArray(data) ? data : []) as ApiService[];
  return rows.map(mapService);
}

export async function loadCustomerPortal(profile: CustomerProfile): Promise<CustomerPortalData> {
  const [vehicleRows, serviceRows, bookingRows, repairRows, inspectionRows, invoiceRows, paymentRows, partRows, historyRows, estimateRows, notificationRows] = await Promise.all([
    readList<ApiVehicle>('/api/customer/vehicles/'),
    readList<ApiService>('/api/customer/services/'),
    readList<ApiBooking>('/api/customer/bookings/'),
    readList<ApiRepair>('/api/customer/repairs/'),
    readList<ApiInspection>('/api/customer/inspections/'),
    readList<ApiInvoice>('/api/customer/invoices/'),
    readList<ApiPayment>('/api/customer/payments/'),
    readList<ApiPart>('/api/customer/parts/'),
    readList<ApiHistory>('/api/customer/history/'),
    readList<ApiEstimate>('/api/customer/estimates/'),
    readList<ApiNotification>('/api/customer/notifications/'),
  ]);
  const vehicles = vehicleRows.map((row) => mapVehicle(row, profile));
  const services = serviceRows.map(mapService);
  const payments = paymentRows.map((row) => mapPayment(row, profile));
  return {
    vehicles,
    services,
    appointments: bookingRows.map((row) => mapBooking(row, profile, vehicles, services)),
    workOrders: repairRows.map((row) => mapRepair(row, profile, vehicles, inspectionRows)),
    invoices: invoiceRows.map((row) => mapInvoice(row, profile, vehicles)),
    payments,
    receipts: payments.filter((payment) => payment.receiptNumber).map((payment) => ({
      id: payment.id,
      receiptNumber: payment.receiptNumber || payment.paymentIdNumber,
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      invoiceNumber: payment.invoiceNumber,
      customerId: payment.customerId,
      customerName: payment.customerName,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate,
    })),
    estimates: estimateRows.map((row) => mapEstimate(row, profile)),
    history: historyRows.map((row) => mapHistory(row, profile)),
    notifications: notificationRows.map(mapNotification),
    parts: partRows.map(mapPart),
  };
}

export async function decideCustomerEstimate(id: string, decision: 'approve' | 'reject', note?: string): Promise<void> {
  const response = await apiRequest(`/api/customer/estimates/${id}/${decision}/`, {
    method: 'POST',
    body: JSON.stringify({ note: note || '' }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function markCustomerNotificationRead(id: string): Promise<void> {
  const response = await apiRequest(`/api/customer/notifications/${id}/read/`, { method: 'POST' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function markAllCustomerNotificationsRead(): Promise<void> {
  const response = await apiRequest('/api/customer/notifications/read-all/', { method: 'POST' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export type CustomerVehicleInput = {
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  vin?: string;
  mileage?: number;
  color?: string;
  vehicleType?: string;
  engineNumber?: string;
  imageFile?: File | null;
};

function vehicleRequestBody(input: CustomerVehicleInput): BodyInit {
  const fields = {
    plate: input.licensePlate.trim(),
    brand: input.brand.trim(),
    model: input.model.trim(),
    year: String(input.year),
    color: input.color || '',
    vehicle_type: input.vehicleType || '',
    vin: (input.vin || '').trim(),
    engine_number: input.engineNumber || '',
    mileage: String(input.mileage || 0),
  };
  if (!input.imageFile) {
    return JSON.stringify({
      ...fields,
      year: input.year,
      mileage: input.mileage || 0,
    });
  }
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  body.append('image', input.imageFile);
  return body;
}

export async function createCustomerVehicle(profile: CustomerProfile, input: CustomerVehicleInput): Promise<Vehicle> {
  const response = await apiRequest('/api/customer/vehicles/', { method: 'POST', body: vehicleRequestBody(input) });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return mapVehicle((await response.json()) as ApiVehicle, profile);
}

export async function updateCustomerVehicle(
  profile: CustomerProfile,
  vehicleId: string,
  input: CustomerVehicleInput
): Promise<Vehicle> {
  const response = await apiRequest(`/api/customer/vehicles/${vehicleId}/`, {
    method: 'PATCH',
    body: vehicleRequestBody(input),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return mapVehicle((await response.json()) as ApiVehicle, profile);
}

export async function deleteCustomerVehicle(vehicleId: string): Promise<void> {
  const response = await apiRequest(`/api/customer/vehicles/${vehicleId}/`, { method: 'DELETE' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function updateCustomerVehicleImage(
  profile: CustomerProfile,
  vehicleId: string,
  imageFile: File
): Promise<Vehicle> {
  const body = new FormData();
  body.append('image', imageFile);
  const response = await apiRequest(`/api/customer/vehicles/${vehicleId}/`, { method: 'PATCH', body });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return mapVehicle((await response.json()) as ApiVehicle, profile);
}

export async function createCustomerBooking(input: {
  vehicleId: string;
  serviceId: string;
  date: string;
  time: string;
  problem: string;
  notes?: string;
}): Promise<ApiBooking> {
  const response = await apiRequest('/api/customer/bookings/', {
    method: 'POST',
    body: JSON.stringify({
      vehicle: Number(input.vehicleId),
      service: Number(input.serviceId),
      booking_date: input.date,
      booking_time: input.time || null,
      problem: input.problem,
      note: input.notes || '',
    }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return response.json() as Promise<ApiBooking>;
}

export async function cancelCustomerBooking(id: string, reason: string): Promise<void> {
  const response = await apiRequest(`/api/customer/bookings/${id}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ cancel_reason: reason }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function rescheduleCustomerBooking(id: string, date: string, time: string): Promise<void> {
  const response = await apiRequest(`/api/customer/bookings/${id}/reschedule/`, {
    method: 'POST',
    body: JSON.stringify({ booking_date: date, booking_time: time || null }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function saveCustomerProfile(fields: {
  name: string;
  phone: string;
  address: string;
  photo?: File | null;
}): Promise<CustomerProfile> {
  const parts = fields.name.trim().split(/\s+/).filter(Boolean);
  const payload = {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
    phone: fields.phone,
    address: fields.address,
  };
  const body = fields.photo
    ? (() => {
        const form = new FormData();
        form.append('first_name', payload.first_name);
        form.append('last_name', payload.last_name);
        form.append('phone', payload.phone);
        form.append('address', payload.address);
        form.append('photo', fields.photo as File);
        return form;
      })()
    : JSON.stringify(payload);
  const response = await apiRequest('/api/auth/me/', {
    method: 'PATCH',
    body,
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return response.json() as Promise<CustomerProfile>;
}

export async function changeCustomerPassword(currentPassword: string, password: string): Promise<void> {
  const response = await apiRequest('/api/auth/password/change/', {
    method: 'POST',
    body: JSON.stringify({ current_password: currentPassword, password }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

type ApiPartRequest = {
  id: number;
  number: string;
  spare_part: number;
  part_name: string;
  part_number: string;
  unit_price: string;
  vehicle: number | null;
  booking: number | null;
  vehicle_plate: string;
  vehicle_title: string;
  fulfillment: string;
  notes: string;
  cancel_reason?: string;
  status: string;
  created_at: string;
  work_order_number: string;
  invoice_number: string;
  invoice_status: string;
  invoice_total: string;
  amount_paid: string;
  can_withdraw?: boolean;
  issued?: boolean;
};

export type CustomerPartRequestRow = {
  id: string;
  number: string;
  productName: string;
  sku: string;
  price: number;
  carBrand: string;
  vehiclePlate: string;
  bookingId: string;
  fulfillment: string;
  customerNotes: string;
  cancelReason: string;
  status: string;
  requestedAt: string;
  workOrderNumber: string;
  invoiceNumber: string;
  invoiceStatus: string;
  invoiceTotal: number;
  amountPaid: number;
  canWithdraw: boolean;
  issued: boolean;
};

function mapPartRequest(row: ApiPartRequest): CustomerPartRequestRow {
  return {
    id: String(row.id),
    number: row.number,
    productName: row.part_name,
    sku: row.part_number,
    price: money(row.unit_price),
    carBrand: row.vehicle_title || 'Unregistered vehicle',
    vehiclePlate: row.vehicle_plate || '',
    bookingId: row.booking ? String(row.booking) : '',
    fulfillment: row.fulfillment,
    customerNotes: row.notes || '',
    cancelReason: row.cancel_reason || '',
    status: row.status,
    requestedAt: row.created_at,
    workOrderNumber: row.work_order_number || '',
    invoiceNumber: row.invoice_number || '',
    invoiceStatus: row.invoice_status || '',
    invoiceTotal: money(row.invoice_total),
    amountPaid: money(row.amount_paid),
    canWithdraw: Boolean(row.can_withdraw),
    issued: Boolean(row.issued),
  };
}

export async function addBookingService(bookingId: string, serviceId: string): Promise<ApiBooking> {
  const response = await apiRequest(`/api/customer/bookings/${bookingId}/add-service/`, {
    method: 'POST',
    body: JSON.stringify({ service: Number(serviceId) }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return response.json() as Promise<ApiBooking>;
}

export async function removeBookingService(bookingId: string, bookingServiceId: number): Promise<void> {
  const response = await apiRequest(`/api/customer/bookings/${bookingId}/remove-service/`, {
    method: 'POST',
    body: JSON.stringify({ booking_service: bookingServiceId }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function listCustomerPartRequests(): Promise<CustomerPartRequestRow[]> {
  const response = await apiRequest('/api/customer/part-requests/');
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  const rows = (await response.json()) as ApiPartRequest[];
  return rows.map(mapPartRequest);
}

export async function withdrawCustomerPartRequest(id: string): Promise<void> {
  const response = await apiRequest(`/api/customer/part-requests/${id}/withdraw/`, { method: 'POST' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function confirmCustomerPartPurchase(id: string): Promise<CustomerPartRequestRow> {
  const response = await apiRequest(`/api/customer/part-requests/${id}/confirm-purchase/`, { method: 'POST' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return mapPartRequest((await response.json()) as ApiPartRequest);
}

export async function confirmCustomerRepair(workOrderId: string): Promise<void> {
  const response = await apiRequest(`/api/customer/repairs/${workOrderId}/confirm/`, { method: 'POST' });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function declineCustomerRepair(workOrderId: string, reason: string): Promise<void> {
  const response = await apiRequest(`/api/customer/repairs/${workOrderId}/decline/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}

export async function createCustomerPartRequest(input: {
  sparePartId: string;
  vehicleId?: string;
  bookingId?: string;
  fulfillment: string;
  notes?: string;
}): Promise<CustomerPartRequestRow> {
  const response = await apiRequest('/api/customer/part-requests/', {
    method: 'POST',
    body: JSON.stringify({
      spare_part: Number(input.sparePartId),
      vehicle: input.vehicleId ? Number(input.vehicleId) : null,
      booking: input.bookingId ? Number(input.bookingId) : null,
      fulfillment: input.fulfillment,
      notes: input.notes || '',
    }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
  return mapPartRequest((await response.json()) as ApiPartRequest);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const response = await apiRequest('/api/auth/password-reset/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error(await apiErrorMessage(response));
}
