import { UserRole } from '../types';

export const ROLE_LABEL: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  STAFF: 'Front desk',
  TECHNICIAN: 'Mechanic',
  CUSTOMER: 'Customer'
};

export const ROLE_DESK: Record<UserRole, string> = {
  ADMIN: 'Admin console',
  MANAGER: 'Manager desk',
  STAFF: 'Front desk',
  TECHNICIAN: 'Workshop',
  CUSTOMER: 'Customer portal'
};

export const ROLE_FOCUS: Record<UserRole, string> = {
  ADMIN: 'Users, permissions, security, and garage settings',
  MANAGER: 'Revenue, technician workload, stock, and reports',
  STAFF: 'Bookings, vehicle check-in, invoices, and payments',
  TECHNICIAN: 'Assigned jobs, diagnosis, parts on the job, and bay camera',
  CUSTOMER: 'Your vehicles, appointments, quotes, and bills'
};

export const ERP_DEMO_ACCOUNTS: { userId: string; role: UserRole; name: string; job: string }[] = [
  { userId: 'user-admin', role: 'ADMIN', name: 'Marcus Vance', job: 'Administrator' },
  { userId: 'user-manager', role: 'MANAGER', name: 'Sarah Jenkins', job: 'Manager' },
  { userId: 'user-staff', role: 'STAFF', name: 'Alex Wong', job: 'Front desk' },
  { userId: 'user-tech-dara', role: 'TECHNICIAN', name: 'Dara Kim', job: 'Mechanic' }
];

const VIEW_ROLES: Record<string, UserRole[]> = {
  Dashboard: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],
  Customers: ['ADMIN', 'MANAGER', 'STAFF'],
  Vehicles: ['ADMIN', 'MANAGER', 'STAFF'],
  Appointments: ['ADMIN', 'MANAGER', 'STAFF'],
  Services: ['ADMIN', 'MANAGER', 'STAFF'],
  WorkOrders: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],
  WorkOrderDetail: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],
  Tasks: ['ADMIN', 'MANAGER', 'TECHNICIAN'],
  Technicians: ['ADMIN', 'MANAGER'],
  TechnicianDetail: ['ADMIN', 'MANAGER'],
  CCTV: ['ADMIN', 'MANAGER', 'TECHNICIAN'],
  Inventory: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],
  Suppliers: ['ADMIN', 'MANAGER'],
  Invoices: ['ADMIN', 'MANAGER', 'STAFF'],
  Payments: ['ADMIN', 'MANAGER', 'STAFF'],
  InvoiceDetail: ['ADMIN', 'MANAGER', 'STAFF'],
  Reports: ['ADMIN', 'MANAGER'],
  Feedback: ['ADMIN', 'MANAGER'],
  Documents: ['ADMIN', 'MANAGER', 'STAFF'],
  Notifications: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'],
  Users: ['ADMIN'],
  Permissions: ['ADMIN'],
  ActivityLogs: ['ADMIN', 'MANAGER'],
  Settings: ['ADMIN', 'MANAGER'],
  CustomerDetail: ['ADMIN', 'MANAGER', 'STAFF'],
  VehicleDetail: ['ADMIN', 'MANAGER', 'STAFF']
};

export const ERP_VIEW_TITLE: Record<string, string> = {
  Dashboard: '',
  Customers: 'Customers',
  Vehicles: 'Vehicles',
  Appointments: 'Appointments',
  Services: 'Service catalog',
  WorkOrders: 'Work orders',
  WorkOrderDetail: 'Work order',
  Tasks: 'Task board',
  Technicians: 'Technicians',
  TechnicianDetail: 'Technician',
  CCTV: 'Bay cameras',
  Inventory: 'Parts inventory',
  Suppliers: 'Suppliers',
  Invoices: 'Invoices',
  Payments: 'Payments',
  InvoiceDetail: 'Invoice',
  Reports: 'Reports',
  Feedback: 'Customer feedback',
  Documents: 'Workshop documents',
  Notifications: 'Staff notifications',
  Users: 'User management',
  Permissions: 'Roles & permissions',
  ActivityLogs: 'Activity logs',
  Settings: 'Garage settings',
  CustomerDetail: 'Customer profile',
  VehicleDetail: 'Vehicle dossier'
};

export function erpNavbarTitle(view: string, role: UserRole) {
  if (view === 'Dashboard') return ROLE_DESK[role];
  return ERP_VIEW_TITLE[view] || view.replace(/([A-Z])/g, ' $1').trim();
}

export function isStaffNotification(n: { audience?: string }) {
  return n.audience !== 'CUSTOMER';
}

export function isErpViewAllowed(role: UserRole, view: string) {
  if (role === 'CUSTOMER') return false;
  const allowed = VIEW_ROLES[view];
  if (!allowed) return role === 'ADMIN';
  return allowed.includes(role);
}
