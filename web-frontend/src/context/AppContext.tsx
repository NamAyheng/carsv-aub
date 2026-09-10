import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  UserRole,
  Customer,
  Vehicle,
  Appointment,
  ServiceItem,
  WorkOrder,
  RepairTask,
  Technician,
  InventoryPart,
  Supplier,
  PurchaseOrder,
  Invoice,
  PaymentRecord,
  CCTVCamera,
  CustomerFeedback,
  ActivityLog,
  NotificationItem,
  GarageDocument,
  GarageSettings,
  RolePermissions,
  StockAdjustment,
  WorkOrderStatus,
  PriorityLevel,
  Estimate,
  ServiceHistoryRecord,
  PaymentReceipt,
  WarrantyClaim
} from '../types';
import {
  initialUsers,
  initialCustomers,
  initialVehicles,
  initialServices,
  initialAppointments,
  initialWorkOrders,
  initialTasks,
  initialTechnicians,
  initialInventory,
  initialSuppliers,
  initialPurchaseOrders,
  initialInvoices,
  initialPayments,
  initialCCTVCameras,
  initialFeedback,
  initialActivityLogs,
  initialNotifications,
  initialDocuments,
  initialSettings,
  defaultRolePermissions
} from '../data/mockData';
import {
  initialEstimates,
  initialServiceHistory,
  initialPaymentReceipts,
  initialWarrantyClaims
} from '../data/customerGarage';
import { findDuplicateVehicle, invoiceRemaining, nextOilChangeMileage, remainingBalance, validatePaymentAmount } from '../utils/garageLogic';
import { ROLE_LABEL } from '../utils/roles';

export type NavigationPage =
  | 'Dashboard'
  | 'Customers'
  | 'Vehicles'
  | 'Appointments'
  | 'Services'
  | 'WorkOrders'
  | 'Tasks'
  | 'Technicians'
  | 'Inventory'
  | 'Suppliers'
  | 'Invoices'
  | 'Payments'
  | 'Reports'
  | 'Notifications'
  | 'Documents'
  | 'CCTV'
  | 'ActivityLogs'
  | 'Settings'
  | 'Users'
  | 'Permissions'
  | 'Feedback'
  | 'WorkOrderDetail'
  | 'CustomerDetail'
  | 'VehicleDetail'
  | 'TechnicianDetail'
  | 'InvoiceDetail';

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
}

interface AppContextType {
  // Auth state
  isAuthenticated: boolean;
  currentUser: User;
  currentRole: UserRole;
  login: (email: string, role?: UserRole) => boolean;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  switchUser: (userId: string) => void;

  // Theme state
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Navigation
  currentView: NavigationPage;
  setCurrentView: (view: NavigationPage) => void;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  globalSearchOpen: boolean;
  setGlobalSearchOpen: (open: boolean) => void;

  // Selected Detail IDs
  selectedWorkOrderId: string | null;
  setSelectedWorkOrderId: (id: string | null) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  selectedVehicleId: string | null;
  setSelectedVehicleId: (id: string | null) => void;
  selectedTechnicianId: string | null;
  setSelectedTechnicianId: (id: string | null) => void;
  selectedInvoiceId: string | null;
  setSelectedInvoiceId: (id: string | null) => void;

  // Deep Navigation Helpers
  viewWorkOrderDetail: (id: string) => void;
  viewCustomerDetail: (id: string) => void;
  viewVehicleDetail: (id: string) => void;
  viewTechnicianDetail: (id: string) => void;
  viewInvoiceDetail: (id: string) => void;

  // Entities & CRUD
  users: User[];
  customers: Customer[];
  vehicles: Vehicle[];
  services: ServiceItem[];
  appointments: Appointment[];
  workOrders: WorkOrder[];
  tasks: RepairTask[];
  technicians: Technician[];
  inventory: InventoryPart[];
  stockAdjustments: StockAdjustment[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  invoices: Invoice[];
  payments: PaymentRecord[];
  paymentReceipts: PaymentReceipt[];
  estimates: Estimate[];
  serviceHistory: ServiceHistoryRecord[];
  warrantyClaims: WarrantyClaim[];
  cctvCameras: CCTVCamera[];
  cctvFeeds: CCTVCamera[];
  feedback: CustomerFeedback[];
  feedbackList: CustomerFeedback[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];
  documents: GarageDocument[];
  settings: GarageSettings;
  permissions: Record<UserRole, RolePermissions>;

  // Modals & Dialogs
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  confirmDialog: ConfirmDialogState | null;
  showConfirmDialog: (config: Omit<ConfirmDialogState, 'isOpen'>) => void;
  closeConfirmDialog: () => void;

  // Mutators
  addCustomer: (cust: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'vehicleIds'>) => Customer;
  updateCustomer: (id: string, cust: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  addVehicle: (veh: Omit<Vehicle, 'id' | 'lastServiceDate'>) => Vehicle | null;
  updateVehicle: (id: string, veh: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;

  addAppointment: (apt: Omit<Appointment, 'id'>) => Appointment;
  updateAppointment: (id: string, apt: Partial<Appointment>) => void;
  cancelAppointment: (id: string, reason: string) => void;
  deleteAppointment: (id: string) => void;

  addService: (srv: Omit<ServiceItem, 'id' | 'timesPerformed'>) => ServiceItem;
  updateService: (id: string, srv: Partial<ServiceItem>) => void;
  deleteService: (id: string) => void;

  createWorkOrder: (wo: Partial<WorkOrder>) => WorkOrder;
  addWorkOrder: (wo: Partial<WorkOrder>) => WorkOrder;
  updateWorkOrder: (id: string, wo: Partial<WorkOrder>) => void;
  updateWorkOrderStatus: (id: string, status: WorkOrderStatus) => void;

  createTask: (task: Omit<RepairTask, 'id'>) => RepairTask;
  updateTask: (id: string, task: Partial<RepairTask>) => void;
  updateTaskProgress: (id: string, progress: number, status?: RepairTask['status']) => void;
  deleteTask: (id: string) => void;

  updateTechnician: (id: string, updates: Partial<Technician>) => void;

  addInventoryPart: (part: Omit<InventoryPart, 'id' | 'lastRestockedDate'>) => InventoryPart;
  addInventoryItem: (part: Omit<InventoryPart, 'id' | 'lastRestockedDate'>) => InventoryPart;
  updateInventoryPart: (id: string, part: Partial<InventoryPart>) => void;
  updateInventoryItem: (id: string, part: Partial<InventoryPart>) => void;
  adjustStock: (partId: string, quantityChange: number, type: 'ADD' | 'REMOVE' | 'AUDIT_CORRECTION', reason: string) => void;

  addSupplier: (sup: Omit<Supplier, 'id'>) => Supplier;
  updateSupplier: (id: string, sup: Partial<Supplier>) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => PurchaseOrder;
  updatePurchaseOrderStatus: (id: string, status: PurchaseOrder['status']) => void;

  createInvoice: (inv: Omit<Invoice, 'id'>) => Invoice;
  updateInvoice: (id: string, inv: Partial<Invoice>) => void;
  recordPayment: (payment: Omit<PaymentRecord, 'id'>) => PaymentRecord | null;

  approveEstimate: (id: string, note?: string) => void;
  rejectEstimate: (id: string, note?: string) => void;
  submitWarrantyClaim: (claim: Omit<WarrantyClaim, 'id' | 'submittedAt' | 'status'>) => WarrantyClaim;

  addFeedback: (fb: Omit<CustomerFeedback, 'id' | 'createdAt' | 'status'>) => void;
  replyFeedback: (id: string, reply: string) => void;
  updateFeedback: (id: string, updates: Partial<CustomerFeedback>) => void;

  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;

  addUser: (user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => User;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;

  updateSettings: (newSettings: Partial<GarageSettings>) => void;
  resetMockData: () => void;
  updateRolePermission: (role: UserRole, module: keyof RolePermissions, action: 'view' | 'create' | 'edit' | 'delete', value: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Theme state - defaults to 'light' ("for light mode should be the same as before")
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('carsv_theme');
      if (saved === 'dark' || saved === 'light') return saved;
    }
    return 'light';
  });

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('carsv_theme', newTheme);
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
      }
    }
  }, [theme]);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User>(initialUsers[0]);
  const [currentRole, setCurrentRole] = useState<UserRole>('ADMIN');

  // Navigation
  const [currentView, setCurrentView] = useState<NavigationPage>('Dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [globalSearchOpen, setGlobalSearchOpen] = useState<boolean>(false);

  // Selected details
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<string | null>('wo-1024');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>('cust-1');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('veh-1');
  const [selectedTechnicianId, setSelectedTechnicianId] = useState<string | null>('user-tech-dara');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>('inv-2026-089');

  // Entities state
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [services, setServices] = useState<ServiceItem[]>(initialServices);
  const [appointments, setAppointments] = useState<Appointment[]>(initialAppointments);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>(initialWorkOrders);
  const [tasks, setTasks] = useState<RepairTask[]>(initialTasks);
  const [technicians, setTechnicians] = useState<Technician[]>(initialTechnicians);
  const [inventory, setInventory] = useState<InventoryPart[]>(initialInventory);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(initialPurchaseOrders);
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [payments, setPayments] = useState<PaymentRecord[]>(initialPayments);
  const [paymentReceipts, setPaymentReceipts] = useState<PaymentReceipt[]>(initialPaymentReceipts);
  const [estimates, setEstimates] = useState<Estimate[]>(initialEstimates);
  const [serviceHistory, setServiceHistory] = useState<ServiceHistoryRecord[]>(initialServiceHistory);
  const [warrantyClaims, setWarrantyClaims] = useState<WarrantyClaim[]>(initialWarrantyClaims);
  const [cctvCameras, setCctvCameras] = useState<CCTVCamera[]>(initialCCTVCameras);
  const [feedback, setFeedback] = useState<CustomerFeedback[]>(initialFeedback);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(initialActivityLogs);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [documents, setDocuments] = useState<GarageDocument[]>(initialDocuments);
  const [settings, setSettings] = useState<GarageSettings>(initialSettings);
  const [permissions, setPermissions] = useState<Record<UserRole, RolePermissions>>({
    ADMIN: { ...defaultRolePermissions },
    MANAGER: {
      ...defaultRolePermissions,
      Users: { view: true, create: false, edit: false, delete: false },
      Settings: { view: true, create: false, edit: true, delete: false }
    },
    STAFF: {
      ...defaultRolePermissions,
      Reports: { view: false, create: false, edit: false, delete: false },
      Users: { view: false, create: false, edit: false, delete: false },
      Settings: { view: false, create: false, edit: false, delete: false },
      Inventory: { view: true, create: false, edit: false, delete: false },
      Tasks: { view: true, create: true, edit: true, delete: false }
    },
    TECHNICIAN: {
      Customers: { view: true, create: false, edit: false, delete: false },
      Vehicles: { view: true, create: false, edit: false, delete: false },
      Appointments: { view: true, create: false, edit: false, delete: false },
      WorkOrders: { view: true, create: false, edit: true, delete: false },
      Tasks: { view: true, create: false, edit: true, delete: false },
      Inventory: { view: true, create: false, edit: false, delete: false },
      Reports: { view: false, create: false, edit: false, delete: false },
      Users: { view: false, create: false, edit: false, delete: false },
      CCTV: { view: true, create: false, edit: false, delete: false },
      Settings: { view: false, create: false, edit: false, delete: false }
    },
    CUSTOMER: {
      Customers: { view: false, create: false, edit: false, delete: false },
      Vehicles: { view: true, create: false, edit: false, delete: false },
      Appointments: { view: true, create: true, edit: false, delete: false },
      WorkOrders: { view: true, create: false, edit: false, delete: false },
      Tasks: { view: false, create: false, edit: false, delete: false },
      Inventory: { view: false, create: false, edit: false, delete: false },
      Reports: { view: false, create: false, edit: false, delete: false },
      Users: { view: false, create: false, edit: false, delete: false },
      CCTV: { view: true, create: false, edit: false, delete: false },
      Settings: { view: false, create: false, edit: false, delete: false }
    }
  });

  // UI state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    const duration = 3000;
    const newToast: ToastMessage = { ...toast, id, duration };
    setToasts((prev) => [...prev, newToast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const showConfirmDialog = (config: Omit<ConfirmDialogState, 'isOpen'>) => {
    setConfirmDialog({ ...config, isOpen: true });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog(null);
  };

  const logActivity = (action: string, module: ActivityLog['module'], description: string) => {
    const newLog: ActivityLog = {
      id: 'act-' + Date.now(),
      userName: `${currentUser.name} (${currentUser.role})`,
      userRole: currentUser.role,
      userAvatar: currentUser.avatar,
      action,
      module,
      description,
      timestamp: 'Just now',
      ipAddress: '192.168.1.100'
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  const pushCustomerNotification = (
    n: Omit<NotificationItem, 'id' | 'timestamp' | 'read' | 'audience'>
  ) => {
    const item: NotificationItem = {
      ...n,
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: 'Just now',
      read: false,
      audience: 'CUSTOMER'
    };
    setNotifications((prev) => [item, ...prev]);
  };

  // Auth operations
  const login = (email: string, role?: UserRole) => {
    const foundUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (foundUser) {
      setCurrentUser(foundUser);
      setCurrentRole(foundUser.role);
      setIsAuthenticated(true);
      setCurrentView('Dashboard');
      addToast({
        type: 'success',
        title: `Welcome back, ${foundUser.name}`,
        message: `Signed in as ${ROLE_LABEL[foundUser.role]}`
      });
      return true;
    }
    if (role) {
      const roleUser = users.find((u) => u.role === role) || users[0];
      setCurrentUser(roleUser);
      setCurrentRole(role);
      setIsAuthenticated(true);
      setCurrentView('Dashboard');
      addToast({
        type: 'success',
        title: `Logged in as ${roleUser.name}`,
        message: `Signed in as ${ROLE_LABEL[roleUser.role]}`
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    addToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been safely signed out of CarSV.'
    });
  };

  const switchRole = (role: UserRole) => {
    const matchingUser = users.find((u) => u.role === role) || users[0];
    setCurrentUser(matchingUser);
    setCurrentRole(role);
    setCurrentView('Dashboard');
    addToast({
      type: 'info',
      title: `Now signed in as ${matchingUser.name}`,
      message: ROLE_LABEL[role]
    });
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
      setCurrentRole(found.role);
      setCurrentView('Dashboard');
      addToast({
        type: 'info',
        title: `Now signed in as ${found.name}`,
        message: ROLE_LABEL[found.role]
      });
    }
  };

  // Deep Navigation Helpers
  const viewWorkOrderDetail = (id: string) => {
    setSelectedWorkOrderId(id);
    setCurrentView('WorkOrderDetail');
  };

  const viewCustomerDetail = (id: string) => {
    setSelectedCustomerId(id);
    setCurrentView('CustomerDetail');
  };

  const viewVehicleDetail = (id: string) => {
    setSelectedVehicleId(id);
    setCurrentView('VehicleDetail');
  };

  const viewTechnicianDetail = (id: string) => {
    setSelectedTechnicianId(id);
    setCurrentView('TechnicianDetail');
  };

  const viewInvoiceDetail = (id: string) => {
    setSelectedInvoiceId(id);
    setCurrentView('InvoiceDetail');
  };

  // CRUD Implementations
  const addCustomer = (cust: Omit<Customer, 'id' | 'createdAt' | 'totalSpent' | 'vehicleIds'>) => {
    const id = 'cust-' + (customers.length + 1);
    const newCust: Customer = {
      ...cust,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      totalSpent: 0,
      vehicleIds: []
    };
    setCustomers((prev) => [newCust, ...prev]);
    logActivity('CUSTOMER_CREATED', 'CUSTOMERS', `Registered new customer ${newCust.name} (${newCust.phone})`);
    addToast({
      type: 'success',
      title: 'Customer Added',
      message: `${newCust.name} has been added successfully.`
    });
    return newCust;
  };

  const updateCustomer = (id: string, updated: Partial<Customer>) => {
    setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    logActivity('CUSTOMER_UPDATED', 'CUSTOMERS', `Updated customer record ID ${id}`);
    addToast({ type: 'success', title: 'Customer Updated', message: 'Customer details saved.' });
  };

  const deleteCustomer = (id: string) => {
    const cust = customers.find((c) => c.id === id);
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    logActivity('CUSTOMER_DELETED', 'CUSTOMERS', `Deleted customer ${cust?.name || id}`);
    addToast({ type: 'warning', title: 'Customer Removed', message: 'Customer record deleted.' });
  };

  const addVehicle = (veh: Omit<Vehicle, 'id' | 'lastServiceDate'>) => {
    const duplicate = findDuplicateVehicle(vehicles, veh.licensePlate, veh.vin || '');
    if (duplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Vehicle',
        message: `Plate or VIN already registered as ${duplicate.brand} ${duplicate.model} (${duplicate.licensePlate}).`
      });
      return null;
    }
    const id = 'veh-' + (vehicles.length + 1);
    const mileage = veh.mileage || 0;
    const newVeh: Vehicle = {
      ...veh,
      id,
      lastServiceDate: new Date().toISOString().split('T')[0],
      nextServiceMileage: veh.nextServiceMileage || nextOilChangeMileage(mileage),
      nextServiceDate: veh.nextServiceDate
    };
    setVehicles((prev) => [newVeh, ...prev]);
    setCustomers((prev) =>
      prev.map((c) => (c.id === veh.customerId ? { ...c, vehicleIds: [...c.vehicleIds, id] } : c))
    );
    logActivity('VEHICLE_CREATED', 'VEHICLES', `Added vehicle ${newVeh.brand} ${newVeh.model} (${newVeh.licensePlate}) for customer ${newVeh.customerName}`);
    addToast({
      type: 'success',
      title: 'Vehicle Registered',
      message: `${newVeh.brand} ${newVeh.model} (${newVeh.licensePlate}) added.`
    });
    return newVeh;
  };

  const updateVehicle = (id: string, updated: Partial<Vehicle>) => {
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, ...updated } : v)));
    logActivity('VEHICLE_UPDATED', 'VEHICLES', `Updated vehicle details ID ${id}`);
    addToast({ type: 'success', title: 'Vehicle Updated', message: 'Vehicle details saved.' });
  };

  const deleteVehicle = (id: string) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
    logActivity('VEHICLE_DELETED', 'VEHICLES', `Deleted vehicle ID ${id}`);
    addToast({ type: 'warning', title: 'Vehicle Deleted', message: 'Vehicle removed from system.' });
  };

  const addAppointment = (apt: Omit<Appointment, 'id'>) => {
    const id = 'apt-' + (appointments.length + 101);
    const newApt: Appointment = { ...apt, id };
    setAppointments((prev) => [newApt, ...prev]);
    logActivity('APPOINTMENT_CREATED', 'APPOINTMENTS', `Booked appointment #${id} for ${newApt.customerName} on ${newApt.date} ${newApt.time}`);
    pushCustomerNotification({
      type: 'APPOINTMENT',
      title: 'Booking created',
      message: `${newApt.serviceName} on ${newApt.date} at ${newApt.time} for ${newApt.vehicleInfo}.`,
      priority: 'MEDIUM',
      targetModule: 'APPOINTMENTS',
      targetId: id
    });
    addToast({
      type: 'success',
      title: 'Appointment Booked',
      message: `Appointment scheduled for ${newApt.customerName} at ${newApt.time}.`
    });
    return newApt;
  };

  const updateAppointment = (id: string, updated: Partial<Appointment>) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updated } : a)));
    logActivity('APPOINTMENT_UPDATED', 'APPOINTMENTS', `Updated appointment #${id}`);
    if (updated.date || updated.time) {
      pushCustomerNotification({
        type: 'APPOINTMENT',
        title: 'Booking updated',
        message: `Appointment ${id} was rescheduled${updated.date ? ` to ${updated.date}` : ''}${updated.time ? ` at ${updated.time}` : ''}.`,
        priority: 'MEDIUM',
        targetModule: 'APPOINTMENTS',
        targetId: id
      });
    }
    addToast({ type: 'success', title: 'Appointment Updated', message: 'Appointment status saved.' });
  };

  const cancelAppointment = (id: string, reason: string) => {
    const apt = appointments.find((a) => a.id === id);
    if (!apt) return;
    if (apt.status === 'COMPLETED') {
      addToast({ type: 'error', title: 'Cannot cancel', message: 'Completed bookings cannot be cancelled.' });
      return;
    }
    setAppointments((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              status: 'CANCELLED',
              cancellationReason: reason,
              cancelledAt: new Date().toISOString().split('T')[0],
              cancelledBy: currentUser.name
            }
          : a
      )
    );
    logActivity('APPOINTMENT_CANCELLED', 'APPOINTMENTS', `Cancelled appointment #${id}: ${reason}`);
    pushCustomerNotification({
      type: 'APPOINTMENT',
      title: 'Booking cancelled',
      message: `${apt.serviceName} on ${apt.date} was cancelled. Reason: ${reason}`,
      priority: 'MEDIUM',
      targetModule: 'APPOINTMENTS',
      targetId: id
    });
    addToast({ type: 'warning', title: 'Appointment Cancelled', message: 'Appointment cancelled.' });
  };

  const deleteAppointment = (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    logActivity('APPOINTMENT_CANCELLED', 'APPOINTMENTS', `Cancelled appointment #${id}`);
    addToast({ type: 'warning', title: 'Appointment Cancelled', message: 'Appointment cancelled.' });
  };

  const addService = (srv: Omit<ServiceItem, 'id' | 'timesPerformed'>) => {
    const id = 'srv-' + (services.length + 1);
    const newSrv: ServiceItem = { ...srv, id, timesPerformed: 0 };
    setServices((prev) => [newSrv, ...prev]);
    logActivity('SERVICE_CREATED', 'SETTINGS', `Added service ${newSrv.name} ($${newSrv.basePrice})`);
    addToast({ type: 'success', title: 'Service Added', message: `${newSrv.name} is now available.` });
    return newSrv;
  };

  const updateService = (id: string, updated: Partial<ServiceItem>) => {
    setServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    addToast({ type: 'success', title: 'Service Updated', message: 'Service catalog item updated.' });
  };

  const deleteService = (id: string) => {
    setServices((prev) => prev.filter((s) => s.id !== id));
    addToast({ type: 'warning', title: 'Service Removed', message: 'Service item removed from catalog.' });
  };

  const createWorkOrder = (wo: Partial<WorkOrder>) => {
    const count = workOrders.length + 1027;
    const woNum = `WO-${count}`;
    const newWO: WorkOrder = {
      id: 'wo-' + count,
      workOrderNumber: woNum,
      customerId: wo.customerId || 'cust-1',
      customerName: wo.customerName || 'Customer',
      customerPhone: wo.customerPhone || '',
      customerEmail: wo.customerEmail || '',
      vehicleId: wo.vehicleId || 'veh-1',
      vehicleInfo: wo.vehicleInfo || 'Vehicle',
      vehiclePlate: wo.vehiclePlate || 'PP-XXXX',
      vehicleMileage: wo.vehicleMileage || 0,
      reportedProblem: wo.reportedProblem || 'Customer reported issue',
      priority: wo.priority || 'MEDIUM',
      status: 'PENDING',
      assignedTechnicianId: wo.assignedTechnicianId || 'user-tech-dara',
      assignedTechnicianName: wo.assignedTechnicianName || 'Dara Kim',
      cctvBayId: wo.cctvBayId || 'cctv-1',
      estimatedCost: wo.estimatedCost || 150,
      laborRatePerHour: 35,
      laborHoursEstimated: wo.laborHoursEstimated || 2,
      laborHoursActual: 0,
      services: wo.services || ['Comprehensive 60-Point Vehicle Inspection'],
      tasks: wo.tasks || [],
      partsUsed: wo.partsUsed || [],
      beforePhotos: wo.beforePhotos || [],
      afterPhotos: wo.afterPhotos || [],
      isPaid: false,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 16),
      notes: wo.notes || ''
    };
    setWorkOrders((prev) => [newWO, ...prev]);
    logActivity('WORK_ORDER_CREATED', 'WORK_ORDERS', `Created Work Order #${newWO.workOrderNumber} for ${newWO.customerName} (${newWO.vehiclePlate})`);
    addToast({
      type: 'success',
      title: 'Work Order Created',
      message: `Work Order #${newWO.workOrderNumber} has been initialized.`
    });
    return newWO;
  };

  const updateWorkOrder = (id: string, updated: Partial<WorkOrder>) => {
    setWorkOrders((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
    logActivity('WORK_ORDER_UPDATED', 'WORK_ORDERS', `Updated Work Order ID ${id}`);
    addToast({ type: 'success', title: 'Work Order Saved', message: 'Work order details updated.' });
  };

  const updateWorkOrderStatus = (id: string, status: WorkOrderStatus) => {
    const wo = workOrders.find((w) => w.id === id);
    setWorkOrders((prev) =>
      prev.map((w) => {
        if (w.id === id) {
          const completedAt =
            status === 'COMPLETED' || status === 'DELIVERED' || status === 'READY_FOR_PICKUP'
              ? new Date().toISOString().replace('T', ' ').substring(0, 16)
              : w.completedAt;
          return { ...w, status, completedAt };
        }
        return w;
      })
    );
    logActivity('WORK_ORDER_STATUS', 'WORK_ORDERS', `Changed Work Order ${id} status to ${status}`);
    if (wo) {
      if (status === 'READY_FOR_PICKUP') {
        pushCustomerNotification({
          type: 'PICKUP',
          title: 'Vehicle ready for pickup',
          message: `${wo.workOrderNumber} — ${wo.vehicleInfo} (${wo.vehiclePlate}) passed quality check and is ready to collect.`,
          priority: 'HIGH',
          targetModule: 'TRACKING',
          targetId: wo.id
        });
      } else if (status === 'IN_PROGRESS') {
        pushCustomerNotification({
          type: 'REPAIR',
          title: 'Repair started',
          message: `${wo.workOrderNumber} is now in the workshop.`,
          priority: 'MEDIUM',
          targetModule: 'TRACKING',
          targetId: wo.id
        });
      } else if (status === 'WAITING_PARTS') {
        pushCustomerNotification({
          type: 'REPAIR',
          title: 'Waiting for parts',
          message: `${wo.workOrderNumber} is paused until spare parts arrive.`,
          priority: 'HIGH',
          targetModule: 'TRACKING',
          targetId: wo.id
        });
      } else if (status === 'COMPLETED' || status === 'DELIVERED') {
        const nextMileage = nextOilChangeMileage(wo.vehicleMileage);
        setServiceHistory((prev) => {
          if (prev.some((h) => h.workOrderId === wo.id && h.status === 'COMPLETED')) return prev;
          const record: ServiceHistoryRecord = {
            id: 'hist-' + wo.id,
            vehicleId: wo.vehicleId,
            customerId: wo.customerId,
            workOrderId: wo.id,
            workOrderNumber: wo.workOrderNumber,
            serviceDate: new Date().toISOString().split('T')[0],
            mileage: wo.vehicleMileage,
            serviceType: (wo.services || []).join(', ') || wo.reportedProblem,
            mechanicName: wo.assignedTechnicianName,
            partsUsed: (wo.partsUsed || []).map((p) => p.partName).join(', ') || '—',
            laborCost: wo.laborHoursActual * wo.laborRatePerHour,
            totalCost: wo.actualCost || wo.estimatedCost,
            nextServiceMileage: nextMileage,
            status: 'COMPLETED'
          };
          return [record, ...prev];
        });
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === wo.vehicleId
              ? {
                  ...v,
                  lastServiceDate: new Date().toISOString().split('T')[0],
                  nextServiceMileage: nextMileage,
                  status: 'READY'
                }
              : v
          )
        );
        pushCustomerNotification({
          type: 'REPAIR',
          title: 'Repair completed',
          message: `${wo.workOrderNumber} is complete. Service history was updated for ${wo.vehiclePlate}.`,
          priority: 'MEDIUM',
          targetModule: 'VEHICLES',
          targetId: wo.vehicleId
        });
      }
    }
    addToast({
      type: 'success',
      title: 'Status Advanced',
      message: `Work order marked as ${status.replace('_', ' ')}`
    });
  };

  const createTask = (task: Omit<RepairTask, 'id'>) => {
    const id = 'tsk-' + (tasks.length + 107);
    const newTask: RepairTask = { ...task, id };
    setTasks((prev) => [newTask, ...prev]);
    // also attach to the corresponding work order
    setWorkOrders((prev) =>
      prev.map((wo) => (wo.id === task.workOrderId ? { ...wo, tasks: [...wo.tasks, newTask] } : wo))
    );
    logActivity('TASK_CREATED', 'TASKS', `Created Task #${id} (${newTask.title}) assigned to ${newTask.technicianName}`);
    addToast({
      type: 'success',
      title: 'Task Created',
      message: `Task assigned to ${newTask.technicianName}.`
    });
    return newTask;
  };

  const updateTask = (id: string, updated: Partial<RepairTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    addToast({ type: 'success', title: 'Task Updated', message: 'Task changes saved.' });
  };

  const updateTaskProgress = (id: string, progress: number, status?: RepairTask['status']) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          let resolvedStatus = status || t.status;
          if (progress >= 100) resolvedStatus = 'COMPLETED';
          else if (progress > 0 && resolvedStatus === 'PENDING') resolvedStatus = 'IN_PROGRESS';
          return {
            ...t,
            progress,
            status: resolvedStatus,
            completedAt: progress >= 100 ? new Date().toISOString().replace('T', ' ').substring(0, 16) : undefined
          };
        }
        return t;
      })
    );
    addToast({
      type: 'info',
      title: 'Progress Updated',
      message: `Task progress set to ${progress}%`
    });
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    addToast({ type: 'warning', title: 'Task Deleted', message: 'Task removed.' });
  };

  const addInventoryPart = (part: Omit<InventoryPart, 'id' | 'lastRestockedDate'>) => {
    const id = 'prt-' + (inventory.length + 10);
    const newPart: InventoryPart = {
      ...part,
      id,
      lastRestockedDate: new Date().toISOString().split('T')[0]
    };
    setInventory((prev) => [newPart, ...prev]);
    logActivity('INVENTORY_PART_ADDED', 'INVENTORY', `Added part ${newPart.name} (${newPart.sku})`);
    addToast({
      type: 'success',
      title: 'Part Added',
      message: `${newPart.name} recorded in inventory.`
    });
    return newPart;
  };

  const updateInventoryPart = (id: string, updated: Partial<InventoryPart>) => {
    setInventory((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    addToast({ type: 'success', title: 'Part Updated', message: 'Inventory part details saved.' });
  };

  const adjustStock = (partId: string, quantityChange: number, type: 'ADD' | 'REMOVE' | 'AUDIT_CORRECTION', reason: string) => {
    setInventory((prev) =>
      prev.map((p) => {
        if (p.id === partId) {
          const newQty = Math.max(0, p.stockQuantity + quantityChange);
          let status: InventoryPart['status'] = 'IN_STOCK';
          if (newQty === 0) status = 'OUT_OF_STOCK';
          else if (newQty <= p.minStockLevel) status = 'LOW_STOCK';

          const adjustment: StockAdjustment = {
            id: 'adj-' + Date.now(),
            partId: p.id,
            partName: p.name,
            type,
            quantityChange,
            newQuantity: newQty,
            reason,
            adjustedBy: currentUser.name,
            date: new Date().toISOString().replace('T', ' ').substring(0, 16)
          };
          setStockAdjustments((adjs) => [adjustment, ...adjs]);

          return { ...p, stockQuantity: newQty, status, lastRestockedDate: quantityChange > 0 ? new Date().toISOString().split('T')[0] : p.lastRestockedDate };
        }
        return p;
      })
    );
    logActivity('STOCK_ADJUSTMENT', 'INVENTORY', `Stock adjustment of ${quantityChange > 0 ? '+' : ''}${quantityChange} on part ID ${partId}: ${reason}`);
    addToast({
      type: 'success',
      title: 'Stock Adjusted',
      message: `Stock level updated (${quantityChange > 0 ? '+' : ''}${quantityChange}).`
    });
  };

  const addSupplier = (sup: Omit<Supplier, 'id'>) => {
    const id = 'sup-' + (suppliers.length + 1);
    const newSup: Supplier = { ...sup, id };
    setSuppliers((prev) => [newSup, ...prev]);
    addToast({ type: 'success', title: 'Supplier Registered', message: `${newSup.name} added to suppliers list.` });
    return newSup;
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    setSuppliers((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated } : s)));
    addToast({ type: 'success', title: 'Supplier Saved', message: 'Supplier info updated.' });
  };

  const createPurchaseOrder = (po: Omit<PurchaseOrder, 'id'>) => {
    const id = 'po-' + (purchaseOrders.length + 302);
    const newPO: PurchaseOrder = { ...po, id };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    logActivity('PO_CREATED', 'INVENTORY', `Generated Purchase Order #${newPO.poNumber} ($${newPO.totalAmount}) to ${newPO.supplierName}`);
    addToast({
      type: 'success',
      title: 'Purchase Order Created',
      message: `PO #${newPO.poNumber} sent to supplier.`
    });
    return newPO;
  };

  const updatePurchaseOrderStatus = (id: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders((prev) => prev.map((po) => (po.id === id ? { ...po, status } : po)));
    addToast({ type: 'success', title: 'PO Status Updated', message: `PO marked as ${status}` });
  };

  const createInvoice = (inv: Omit<Invoice, 'id'>) => {
    const id = 'inv-2026-' + (invoices.length + 91);
    const newInv: Invoice = { ...inv, id };
    setInvoices((prev) => [newInv, ...prev]);
    logActivity('INVOICE_CREATED', 'INVOICES', `Issued Invoice #${newInv.invoiceNumber} ($${newInv.totalAmount}) for ${newInv.customerName}`);
    pushCustomerNotification({
      type: 'INVOICE',
      title: 'Invoice generated',
      message: `${newInv.invoiceNumber} for $${newInv.totalAmount.toFixed(2)} is ready to view and pay.`,
      priority: 'MEDIUM',
      targetModule: 'INVOICES',
      targetId: newInv.id
    });
    addToast({
      type: 'success',
      title: 'Invoice Generated',
      message: `Invoice #${newInv.invoiceNumber} created for $${newInv.totalAmount.toFixed(2)}`
    });
    return newInv;
  };

  const updateInvoice = (id: string, updated: Partial<Invoice>) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)));
    addToast({ type: 'success', title: 'Invoice Updated', message: 'Invoice changes saved.' });
  };

  const recordPayment = (payment: Omit<PaymentRecord, 'id'>) => {
    const invoice = invoices.find((inv) => inv.id === payment.invoiceId || inv.invoiceNumber === payment.invoiceNumber);
    if (!invoice) {
      addToast({ type: 'error', title: 'Payment Error', message: 'Invoice was not found.' });
      return null;
    }
    if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
      addToast({ type: 'error', title: 'Payment Error', message: `Invoice is already ${invoice.status.toLowerCase()}.` });
      return null;
    }
    const due = invoiceRemaining(invoice);
    const amountError = validatePaymentAmount(payment.amount, due);
    if (amountError) {
      addToast({ type: 'error', title: 'Invalid Payment', message: amountError });
      return null;
    }
    if (payments.some((p) => p.transactionRef && payment.transactionRef && p.transactionRef === payment.transactionRef && p.status === 'COMPLETED')) {
      addToast({ type: 'error', title: 'Duplicate Reference', message: 'This payment reference was already recorded.' });
      return null;
    }

    const id = 'pay-' + (payments.length + 3);
    const receiptNumber = payment.receiptNumber || `RCP-${new Date().getFullYear()}-${String(payments.length + 20).padStart(3, '0')}`;
    const newPayment: PaymentRecord = { ...payment, id, receiptNumber };
    setPayments((prev) => [newPayment, ...prev]);

    const newPaid = invoice.amountPaid + payment.amount;
    const newBal = remainingBalance(invoice.totalAmount, newPaid);
    const status: Invoice['status'] = newBal === 0 ? 'PAID' : 'PARTIAL';

    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === payment.invoiceId || inv.invoiceNumber === payment.invoiceNumber) {
          return { ...inv, amountPaid: newPaid, balanceDue: newBal, status, paymentMethod: payment.paymentMethod };
        }
        return inv;
      })
    );

    const receipt: PaymentReceipt = {
      id: 'rcp-' + id,
      receiptNumber,
      paymentId: id,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      vehicleInfo: invoice.vehicleInfo,
      amount: payment.amount,
      paymentMethod: payment.paymentMethod,
      paymentDate: payment.paymentDate
    };
    setPaymentReceipts((prev) => [receipt, ...prev]);

    logActivity('PAYMENT_RECORDED', 'PAYMENTS', `Recorded payment of $${payment.amount.toFixed(2)} (${payment.paymentMethod}) from ${payment.customerName}`);
    pushCustomerNotification({
      type: 'PAYMENT',
      title: status === 'PAID' ? 'Invoice paid in full' : 'Partial payment recorded',
      message: `Receipt ${receiptNumber} — $${payment.amount.toFixed(2)} on ${invoice.invoiceNumber}. Remaining balance $${newBal.toFixed(2)}.`,
      priority: 'MEDIUM',
      targetModule: 'INVOICES',
      targetId: invoice.id
    });
    addToast({
      type: 'success',
      title: 'Payment Recorded',
      message: `Received $${payment.amount.toFixed(2)} via ${payment.paymentMethod}. Remaining $${newBal.toFixed(2)}.`
    });
    return newPayment;
  };

  const approveEstimate = (id: string, note?: string) => {
    const est = estimates.find((e) => e.id === id);
    if (!est) return;
    setEstimates((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'APPROVED',
              customerDecisionNote: note || 'Approved by customer.',
              decidedAt: new Date().toISOString().split('T')[0]
            }
          : e
      )
    );
    if (est.workOrderId) {
      setWorkOrders((prev) =>
        prev.map((w) =>
          w.id === est.workOrderId && (w.status === 'WAITING_APPROVAL' || w.status === 'PENDING')
            ? { ...w, status: 'IN_PROGRESS' }
            : w
        )
      );
    }
    logActivity('ESTIMATE_APPROVED', 'WORK_ORDERS', `Customer approved ${est.estimateNumber}`);
    pushCustomerNotification({
      type: 'QUOTE',
      title: 'Quotation approved',
      message: `${est.estimateNumber} approved. The workshop can continue recommended repairs on ${est.vehiclePlate}.`,
      priority: 'MEDIUM',
      targetModule: 'TRACKING',
      targetId: est.workOrderId
    });
    addToast({ type: 'success', title: 'Quotation approved', message: `${est.estimateNumber} is approved.` });
  };

  const rejectEstimate = (id: string, note?: string) => {
    const est = estimates.find((e) => e.id === id);
    if (!est) return;
    setEstimates((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'REJECTED',
              customerDecisionNote: note || 'Rejected by customer.',
              decidedAt: new Date().toISOString().split('T')[0]
            }
          : e
      )
    );
    logActivity('ESTIMATE_REJECTED', 'WORK_ORDERS', `Customer rejected ${est.estimateNumber}`);
    pushCustomerNotification({
      type: 'QUOTE',
      title: 'Quotation rejected',
      message: `${est.estimateNumber} was declined. The garage will contact you about alternatives.`,
      priority: 'MEDIUM',
      targetModule: 'QUOTES',
      targetId: est.id
    });
    addToast({ type: 'warning', title: 'Quotation rejected', message: `${est.estimateNumber} was declined.` });
  };

  const submitWarrantyClaim = (claim: Omit<WarrantyClaim, 'id' | 'submittedAt' | 'status'>) => {
    const newClaim: WarrantyClaim = {
      ...claim,
      id: 'wc-' + (warrantyClaims.length + 1),
      submittedAt: new Date().toISOString().split('T')[0],
      status: 'SUBMITTED'
    };
    setWarrantyClaims((prev) => [newClaim, ...prev]);
    addToast({
      type: 'success',
      title: 'Warranty claim submitted',
      message: 'The service desk will review your claim.'
    });
    return newClaim;
  };

  const addFeedback = (fb: Omit<CustomerFeedback, 'id' | 'createdAt' | 'status'>) => {
    const id = 'fb-' + (feedback.length + 1);
    const newFb: CustomerFeedback = {
      ...fb,
      id,
      createdAt: 'Just now',
      status: 'PUBLISHED'
    };
    setFeedback((prev) => [newFb, ...prev]);
    logActivity('FEEDBACK_SUBMITTED', 'CUSTOMERS', `New review from ${fb.customerName} (${fb.overallRating} Stars)`);
    addToast({
      type: 'success',
      title: 'Feedback Submitted',
      message: 'Thank you for your review!'
    });
  };

  const replyFeedback = (id: string, managerResponse: string) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, managerResponse } : f)));
    addToast({ type: 'success', title: 'Response Published', message: 'Manager reply added to review.' });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    const hadUnread = notifications.some((n) => !n.read);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (hadUnread) {
      addToast({ type: 'info', title: 'Notifications cleared', message: 'All items marked as read.' });
    }
  };

  const addUser = (user: Omit<User, 'id' | 'createdAt' | 'lastLogin'>) => {
    const id = 'user-' + (users.length + 10);
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: 'Never'
    };
    setUsers((prev) => [...prev, newUser]);
    logActivity('USER_CREATED', 'USERS', `Created user account for ${newUser.name} (${newUser.role})`);
    addToast({ type: 'success', title: 'User Created', message: `${newUser.name} added as ${newUser.role}.` });
    return newUser;
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updated } : u)));
    addToast({ type: 'success', title: 'User Updated', message: 'User account updated.' });
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== id));
    logActivity('USER_DELETED', 'USERS', `Deleted user account ID ${id}`);
    addToast({ type: 'warning', title: 'User Removed', message: 'User account deleted.' });
  };

  const updateTechnician = (id: string, updated: Partial<Technician>) => {
    setTechnicians((prev) => prev.map((t) => (t.id === id ? { ...t, ...updated } : t)));
    addToast({ type: 'info', title: 'Technician Updated', message: 'Mechanic profile updated.' });
  };

  const updateFeedback = (id: string, updated: Partial<CustomerFeedback>) => {
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, ...updated } : f)));
    addToast({ type: 'success', title: 'Review Updated', message: 'Customer feedback updated.' });
  };

  const resetMockData = () => {
    setUsers(initialUsers);
    setCustomers(initialCustomers);
    setVehicles(initialVehicles);
    setServices(initialServices);
    setAppointments(initialAppointments);
    setWorkOrders(initialWorkOrders);
    setTasks(initialTasks);
    setTechnicians(initialTechnicians);
    setInventory(initialInventory);
    setStockAdjustments([]);
    setSuppliers(initialSuppliers);
    setPurchaseOrders(initialPurchaseOrders);
    setInvoices(initialInvoices);
    setPayments(initialPayments);
    setPaymentReceipts(initialPaymentReceipts);
    setEstimates(initialEstimates);
    setServiceHistory(initialServiceHistory);
    setWarrantyClaims(initialWarrantyClaims);
    setCctvCameras(initialCCTVCameras);
    setFeedback(initialFeedback);
    setActivityLogs(initialActivityLogs);
    setNotifications(initialNotifications);
    setDocuments(initialDocuments);
    setSettings(initialSettings);
    addToast({ type: 'info', title: 'Data Reset', message: 'Demo garage data has been restored to factory initial state.' });
  };

  const updateSettings = (newSettings: Partial<GarageSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
    logActivity('SETTINGS_SAVED', 'SETTINGS', 'Updated Garage Master Configuration & Rates');
    addToast({ type: 'success', title: 'Settings Saved', message: 'Master garage preferences updated.' });
  };

  const updateRolePermission = (role: UserRole, module: keyof RolePermissions, action: 'view' | 'create' | 'edit' | 'delete', value: boolean) => {
    setPermissions((prev) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [module]: {
          ...prev[role][module],
          [action]: value
        }
      }
    }));
    addToast({ type: 'info', title: 'Permission Updated', message: `${role} - ${String(module)}.${action} updated.` });
  };

  return (
    <AppContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        currentRole,
        login,
        logout,
        switchRole,
        switchUser,
        theme,
        toggleTheme,
        setTheme,
        currentView,
        setCurrentView,
        sidebarCollapsed,
        setSidebarCollapsed,
        mobileMenuOpen,
        setMobileMenuOpen,
        globalSearchOpen,
        setGlobalSearchOpen,
        selectedWorkOrderId,
        setSelectedWorkOrderId,
        selectedCustomerId,
        setSelectedCustomerId,
        selectedVehicleId,
        setSelectedVehicleId,
        selectedTechnicianId,
        setSelectedTechnicianId,
        selectedInvoiceId,
        setSelectedInvoiceId,
        viewWorkOrderDetail,
        viewCustomerDetail,
        viewVehicleDetail,
        viewTechnicianDetail,
        viewInvoiceDetail,
        users,
        customers,
        vehicles,
        services,
        appointments,
        workOrders,
        tasks,
        technicians,
        inventory,
        stockAdjustments,
        suppliers,
        purchaseOrders,
        invoices,
        payments,
        paymentReceipts,
        estimates,
        serviceHistory,
        warrantyClaims,
        cctvCameras,
        cctvFeeds: cctvCameras,
        feedback,
        feedbackList: feedback,
        activityLogs,
        notifications,
        documents,
        settings,
        permissions,
        toasts,
        addToast,
        removeToast,
        confirmDialog,
        showConfirmDialog,
        closeConfirmDialog,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        addVehicle,
        updateVehicle,
        deleteVehicle,
        addAppointment,
        updateAppointment,
        cancelAppointment,
        deleteAppointment,
        addService,
        updateService,
        deleteService,
        createWorkOrder,
        addWorkOrder: createWorkOrder,
        updateWorkOrder,
        updateWorkOrderStatus,
        createTask,
        updateTask,
        updateTaskProgress,
        deleteTask,
        updateTechnician,
        addInventoryPart,
        addInventoryItem: addInventoryPart,
        updateInventoryPart,
        updateInventoryItem: updateInventoryPart,
        adjustStock,
        addSupplier,
        updateSupplier,
        createPurchaseOrder,
        updatePurchaseOrderStatus,
        createInvoice,
        updateInvoice,
        recordPayment,
        approveEstimate,
        rejectEstimate,
        submitWarrantyClaim,
        addFeedback,
        replyFeedback,
        updateFeedback,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addUser,
        updateUser,
        deleteUser,
        updateSettings,
        resetMockData,
        updateRolePermission
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
