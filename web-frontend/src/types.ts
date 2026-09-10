export type UserRole = 'ADMIN' | 'MANAGER' | 'STAFF' | 'TECHNICIAN' | 'CUSTOMER';
export type InventoryItem = InventoryPart;
export type Feedback = CustomerFeedback;



export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  lastLogin: string;
  createdAt: string;
  specialization?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  avatar?: string;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'VIP';
  createdAt: string;
  lastServiceDate?: string;
  totalSpent: number;
  vehicleIds: string[];
}

export interface Vehicle {
  id: string;
  customerId: string;
  customerName: string;
  brand: string;
  model: string;
  year: number;
  licensePlate: string;
  vin: string;
  mileage: number;
  color: string;
  fuelType: 'Gasoline' | 'Diesel' | 'Hybrid' | 'Electric';
  transmission: 'Automatic' | 'Manual';
  status: 'READY' | 'IN_REPAIR' | 'WAITING_PARTS' | 'INSPECTION' | 'COMPLETED';
  lastServiceDate: string;
  image: string;
  imageUrl?: string;
  notes?: string;
  vehicleType?: string;
  engineNumber?: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
}

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Appointment {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  vehicleId: string;
  vehicleInfo: string; // e.g. "Toyota Camry (PP-1234)"
  serviceName: string;
  serviceId: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  problemDescription: string;
  priority: PriorityLevel;
  status: AppointmentStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  estimatedDurationHours: number;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: 'Maintenance' | 'Engine' | 'Brakes' | 'Electrical' | 'Transmission' | 'Tires' | 'AC & Heating' | 'Body';
  description: string;
  basePrice: number;
  estimatedDurationHours: number;
  requiredParts: string[];
  status: 'ACTIVE' | 'INACTIVE';
  timesPerformed: number;
  imageUrl?: string;
}

export type WorkOrderStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'WAITING_APPROVAL'
  | 'IN_PROGRESS'
  | 'WAITING_PARTS'
  | 'QUALITY_CHECK'
  | 'READY_FOR_PICKUP'
  | 'COMPLETED'
  | 'DELIVERED';

export interface RepairTask {
  id: string;
  workOrderId: string;
  title: string;
  description: string;
  vehicleInfo: string;
  technicianId: string;
  technicianName: string;
  priority: PriorityLevel;
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  progress: number; // 0 - 100
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED';
  notes?: string;
  completedAt?: string;
}

export interface InspectionCheckItem {
  id: string;
  category: 'Exterior' | 'Interior' | 'Under Hood' | 'Tires & Brakes' | 'Fluids' | 'Electrical';
  label: string;
  status: 'PASS' | 'ATTENTION' | 'FAIL' | 'NOT_CHECKED';
  notes?: string;
}

export interface InspectionReport {
  id: string;
  workOrderId: string;
  type: 'BEFORE_REPAIR' | 'AFTER_REPAIR';
  inspectorName: string;
  inspectionDate: string;
  mileage: number;
  fuelLevelPercent: number; // 0 - 100
  exteriorCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED';
  interiorCondition: 'CLEAN' | 'STAINS' | 'DAMAGED' | 'FAIR';
  engineCondition: 'NORMAL' | 'NOISE' | 'LEAK' | 'WARNING_LIGHT';
  existingDamages: string[]; // e.g. ["Front bumper scratch", "Rear left dent"]
  checkItems: InspectionCheckItem[];
  photos: string[];
  customerSignatureDate?: string;
  notes?: string;
}

export interface WorkOrderPart {
  partId: string;
  partName: string;
  partNumber: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string; // e.g. "WO-1024"
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleId: string;
  vehicleInfo: string;
  vehiclePlate: string;
  vehicleMileage: number;
  reportedProblem: string;
  priority: PriorityLevel;
  status: WorkOrderStatus;
  assignedTechnicianId: string;
  assignedTechnicianName: string;
  cctvBayId?: string;
  estimatedCost: number;
  actualCost?: number;
  laborRatePerHour: number;
  laborHoursEstimated: number;
  laborHoursActual: number;
  services: string[];
  tasks: RepairTask[];
  partsUsed: WorkOrderPart[];
  beforePhotos: string[];
  afterPhotos: string[];
  beforeInspection?: InspectionReport;
  afterInspection?: InspectionReport;
  invoiceId?: string;
  estimateId?: string;
  isPaid: boolean;
  createdAt: string;
  completedAt?: string;
  notes?: string;
  diagnosis?: string;
  rootCause?: string;
  recommendedRepair?: string;
}

export interface Technician {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  specialization: string; // e.g. "Engine Specialist", "Brake Specialist"
  availability: 'AVAILABLE' | 'BUSY' | 'ON_LEAVE' | 'OFF_DUTY';
  activeTaskCount: number;
  completedTaskCount: number;
  completionRatePercent: number;
  rating: number; // 1-5
  hourlyRate: number;
  joinedDate: string;
  skills: string[];
}

export interface InventoryPart {
  id: string;
  name: string;
  sku: string;
  category: 'Brakes' | 'Engine' | 'Filters' | 'Fluids & Oils' | 'Electrical' | 'Suspension' | 'Tires' | 'Body & Trim';
  stockQuantity: number;
  minStockLevel: number;
  unitPrice: number; // Sale price
  costPrice: number; // Purchase price
  supplierId: string;
  supplierName: string;
  location: string; // e.g. "Shelf A-12"
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lastRestockedDate: string;
}

export interface StockAdjustment {
  id: string;
  partId: string;
  partName: string;
  type: 'ADD' | 'REMOVE' | 'AUDIT_CORRECTION';
  quantityChange: number;
  newQuantity: number;
  reason: string;
  adjustedBy: string;
  date: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  categories: string[];
  status: 'ACTIVE' | 'INACTIVE';
  paymentTerms: string;
  rating: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  items: {
    partName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  totalAmount: number;
  orderDate: string;
  expectedDeliveryDate: string;
  status: 'PENDING' | 'ORDERED' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
}

export type InvoiceStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'PARTIAL' | 'CANCELLED';

/** Counter / catalog sale vs workshop booking & repair. Extra parts on a job stay SERVICE_REPAIR. */
export type InvoiceKind = 'PARTS_SALE' | 'SERVICE_REPAIR';

export type InvoiceFulfillment = 'COUNTER_PICKUP' | 'DELIVERY' | 'WORKSHOP_INSTALL';

export interface InvoiceItem {
  id: string;
  description: string;
  type: 'SERVICE' | 'PART' | 'LABOR';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  sku?: string;
  /** Extra equipment bought after the car was already booked / in the bay. */
  addedAfterBooking?: boolean;
}

export interface Invoice {
  id: string;
  invoiceNumber: string; // INV-… service, POS-… parts sale
  kind: InvoiceKind;
  workOrderId?: string;
  workOrderNumber?: string;
  appointmentId?: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  vehicleId?: string;
  vehicleInfo?: string;
  vehiclePlate?: string;
  technicianName?: string;
  bayNumber?: string;
  fulfillment?: InvoiceFulfillment;
  items: InvoiceItem[];
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  discountPercent: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  paymentMethod?: string;
  notes?: string;
}

export interface PaymentRecord {
  id: string;
  paymentIdNumber: string; // e.g. "PAY-5542"
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  amount: number;
  paymentMethod: 'Credit Card' | 'Cash' | 'Bank Transfer' | 'ABA PayWay' | 'Stripe' | 'Cheque';
  paymentDate: string;
  transactionRef: string;
  status: 'COMPLETED' | 'PENDING' | 'REFUNDED' | 'FAILED';
  receivedBy: string;
  notes?: string;
  receiptNumber?: string;
}

export interface CCTVCamera {
  id: string;
  bayNumber: string; // "Bay 01 - Engine Diagnostics"
  name: string;
  location: string;
  currentVehicle?: string;
  currentPlate?: string;
  currentWorkOrder?: string;
  currentTechnician?: string;
  status: 'ONLINE' | 'ACTIVE_REPAIR' | 'IDLE' | 'MAINTENANCE';
  resolution: string;
  fps: number;
  thumbnailUrl: string;
  streamPlaceholderType: 'engine' | 'underbody' | 'brakes' | 'interior' | 'lift' | 'wash';
}

export interface CustomerFeedback {
  id: string;
  customerId: string;
  customerName: string;
  customerAvatar?: string;
  workOrderId: string;
  vehicleInfo: string;
  overallRating: number; // 1 - 5
  serviceRating: number;
  technicianRating: number;
  speedRating: number;
  comment: string;
  createdAt: string;
  managerResponse?: string;
  status: 'PUBLISHED' | 'FLAGGED' | 'RESOLVED';
}

export interface ActivityLog {
  id: string;
  userName: string;
  userRole: UserRole;
  userAvatar?: string;
  action: string;
  module: 'CUSTOMERS' | 'VEHICLES' | 'APPOINTMENTS' | 'WORK_ORDERS' | 'TASKS' | 'INVENTORY' | 'INVOICES' | 'PAYMENTS' | 'USERS' | 'SECURITY' | 'SETTINGS';
  description: string;
  timestamp: string;
  ipAddress?: string;
}

export type NotificationType =
  | 'TASK'
  | 'APPOINTMENT'
  | 'INVENTORY'
  | 'REPAIR'
  | 'PAYMENT'
  | 'SYSTEM'
  | 'MAINTENANCE'
  | 'QUOTE'
  | 'INVOICE'
  | 'PICKUP';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetModule?: string;
  targetId?: string;
  audience?: 'STAFF' | 'CUSTOMER';
}

export type EstimateStatus = 'DRAFT' | 'SENT' | 'WAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface EstimateLineItem {
  id: string;
  description: string;
  type: 'SERVICE' | 'PART' | 'LABOR';
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Estimate {
  id: string;
  estimateNumber: string;
  customerId: string;
  customerName: string;
  customerEmail?: string;
  vehicleId: string;
  vehicleInfo: string;
  vehiclePlate: string;
  workOrderId?: string;
  workOrderNumber?: string;
  recommendedServices: string[];
  items: EstimateLineItem[];
  laborCost: number;
  serviceCost: number;
  partsCost: number;
  subtotal: number;
  discount: number;
  taxRatePercent: number;
  taxAmount: number;
  estimatedTotal: number;
  status: EstimateStatus;
  customerDecisionNote?: string;
  decidedAt?: string;
  createdAt: string;
  validUntil: string;
  notes?: string;
}

export interface ServiceHistoryRecord {
  id: string;
  vehicleId: string;
  customerId: string;
  workOrderId?: string;
  workOrderNumber?: string;
  serviceDate: string;
  mileage: number;
  serviceType: string;
  mechanicName: string;
  partsUsed: string;
  laborCost: number;
  totalCost: number;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  status: 'COMPLETED' | 'IN_PROGRESS';
}

export interface PaymentReceipt {
  id: string;
  receiptNumber: string;
  paymentId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  vehicleInfo?: string;
  amount: number;
  paymentMethod: string;
  paymentDate: string;
}

export type MaintenanceReminderKind = 'OIL_CHANGE' | 'BRAKE_INSPECTION' | 'TIRE_ROTATION' | 'BATTERY_CHECK' | 'PERIODIC';

export interface MaintenanceReminder {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicleInfo: string;
  kind: MaintenanceReminderKind;
  title: string;
  dueDate?: string;
  dueMileage?: number;
  currentMileage: number;
  status: 'UPCOMING' | 'DUE' | 'OVERDUE' | 'DONE';
}

export type WarrantyClaimStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'DENIED';

export interface WarrantyClaim {
  id: string;
  customerId: string;
  vehicleId: string;
  vehicleInfo: string;
  workOrderId?: string;
  partOrService: string;
  issueDescription: string;
  status: WarrantyClaimStatus;
  submittedAt: string;
}

export interface GarageDocument {
  id: string;
  name: string;
  category: 'Vehicle Documents' | 'Repair Documents' | 'Inspection Reports' | 'Invoices' | 'Warranty Documents' | 'Images';
  fileSize: string;
  fileType: 'pdf' | 'jpg' | 'png' | 'docx' | 'xlsx';
  uploadedBy: string;
  uploadedAt: string;
  relatedVehiclePlate?: string;
  relatedCustomer?: string;
  downloadUrl?: string;
}

export interface GarageSettings {
  garageName: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  address: string;
  taxRegistrationNumber: string;
  currency: string;
  defaultLaborRatePerHour: number;
  defaultTaxRatePercent: number;
  invoiceTerms: string;
  operatingHours: string;
  lowStockAlertThreshold: number;
  enableCCTVCustomerStream: boolean;
  enableEmailAlerts: boolean;
  enableSmsAlerts: boolean;
  autoAssignTechnicians: boolean;
}

export interface RolePermissions {
  Customers: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Vehicles: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Appointments: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  WorkOrders: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Tasks: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Inventory: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Reports: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Users: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  CCTV: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  Settings: { view: boolean; create: boolean; edit: boolean; delete: boolean };
}
