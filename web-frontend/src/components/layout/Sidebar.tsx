import React from 'react';
import {
  LayoutDashboard,
  Users,
  Car,
  Calendar,
  Wrench,
  FileSpreadsheet,
  CheckSquare,
  UserCheck,
  Boxes,
  Truck,
  Receipt,
  CreditCard,
  BarChart3,
  Bell,
  FileText,
  Video,
  History,
  Settings,
  ShieldCheck,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useApp, NavigationPage } from '../../context/AppContext';
import { ROLE_DESK, ROLE_LABEL, isStaffNotification } from '../../utils/roles';

interface NavItem {
  id: NavigationPage;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  badgeColor?: string;
  roles?: string[];
}

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    sidebarCollapsed,
    setSidebarCollapsed,
    mobileMenuOpen,
    setMobileMenuOpen,
    currentRole,
    currentUser,
    appointments,
    tasks,
    inventory,
    notifications,
    workOrders
  } = useApp();

  const todayDate = new Date().toISOString().split('T')[0];
  const todayAptsCount = appointments.filter((a) => a.date === todayDate && a.status !== 'CANCELLED').length;
  const urgentTasksCount = tasks.filter((t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'COMPLETED').length;
  const lowStockCount = inventory.filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK').length;
  const unreadNotifsCount = notifications.filter((n) => !n.read && isStaffNotification(n)).length;
  const activeWOsCount = workOrders.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED').length;

  const navSections: { title?: string; items: NavItem[] }[] = [
    {
      items: [{ id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard }]
    },
    {
      title: 'FRONT DESK',
      items: [
        { id: 'Customers', label: 'Customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
        { id: 'Vehicles', label: 'Vehicles', icon: Car, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
        { id: 'Appointments', label: 'Appointments', icon: Calendar, badge: todayAptsCount > 0 ? todayAptsCount : undefined, badgeColor: 'bg-blue-500', roles: ['ADMIN', 'MANAGER', 'STAFF'] },
        { id: 'Services', label: 'Service catalog', icon: Wrench, roles: ['ADMIN', 'MANAGER', 'STAFF'] }
      ]
    },
    {
      title: 'WORKSHOP',
      items: [
        { id: 'WorkOrders', label: 'Work orders', icon: FileSpreadsheet, badge: activeWOsCount > 0 ? activeWOsCount : undefined, badgeColor: 'bg-indigo-500', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'] },
        { id: 'Tasks', label: 'Task board', icon: CheckSquare, badge: urgentTasksCount > 0 ? urgentTasksCount : undefined, badgeColor: 'bg-amber-500', roles: ['ADMIN', 'MANAGER', 'TECHNICIAN'] },
        { id: 'Technicians', label: 'Technicians', icon: UserCheck, roles: ['ADMIN', 'MANAGER'] },
        { id: 'CCTV', label: 'Bay cameras', icon: Video, roles: ['ADMIN', 'MANAGER', 'TECHNICIAN'] }
      ]
    },
    {
      title: 'STOCK & BILLING',
      items: [
        { id: 'Inventory', label: 'Parts inventory', icon: Boxes, badge: lowStockCount > 0 ? `${lowStockCount} alert` : undefined, badgeColor: 'bg-rose-500', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'] },
        { id: 'Suppliers', label: 'Suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER'] },
        { id: 'Invoices', label: 'Invoices', icon: Receipt, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
        { id: 'Payments', label: 'Payments', icon: CreditCard, roles: ['ADMIN', 'MANAGER', 'STAFF'] }
      ]
    },
    {
      title: 'INSIGHTS',
      items: [
        { id: 'Reports', label: 'Reports', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
        { id: 'Feedback', label: 'Customer feedback', icon: MessageSquare, roles: ['ADMIN', 'MANAGER'] }
      ]
    },
    {
      title: currentRole === 'ADMIN' || currentRole === 'MANAGER' ? 'ADMINISTRATION' : 'WORKSPACE',
      items: [
        { id: 'Documents', label: 'Documents', icon: FileText, roles: ['ADMIN', 'MANAGER', 'STAFF'] },
        { id: 'Notifications', label: 'Staff alerts', icon: Bell, badge: unreadNotifsCount > 0 ? unreadNotifsCount : undefined, badgeColor: 'bg-rose-500', roles: ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'] },
        { id: 'Users', label: 'Staff users', icon: Users, roles: ['ADMIN'] },
        { id: 'Permissions', label: 'Roles & access', icon: ShieldCheck, roles: ['ADMIN'] },
        { id: 'ActivityLogs', label: 'Activity logs', icon: History, roles: ['ADMIN', 'MANAGER'] },
        { id: 'Settings', label: 'Garage settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] }
      ]
    }
  ];

  const isAllowed = (item: NavItem) => {
    if (!item.roles) return true;
    return item.roles.includes(currentRole);
  };

  const handleNavigate = (page: NavigationPage) => {
    setCurrentView(page);
    if (mobileMenuOpen) setMobileMenuOpen(false);
  };

  return (
    <>
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-950/80 backdrop-blur-xs lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 bg-[#111827] text-gray-300 flex flex-col border-r border-gray-800 transition-all duration-300 ease-in-out shrink-0 lg:static lg:translate-x-0 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="p-6 flex items-center justify-between border-b border-gray-800 shrink-0">
          <div
            onClick={() => handleNavigate('Dashboard')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-md shadow-blue-600/30 group-hover:scale-105 transition-transform shrink-0">
              C
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xl font-bold text-white tracking-tight">CarSV</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    ERP
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 truncate mt-0.5">{ROLE_DESK[currentRole]}</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            className="hidden lg:flex p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
          {navSections.map((section, idx) => {
            const filteredItems = section.items.filter(isAllowed);
            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {section.title && !sidebarCollapsed && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </div>
                )}
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    currentView === item.id ||
                    (item.id === 'WorkOrders' && currentView === 'WorkOrderDetail') ||
                    (item.id === 'Customers' && currentView === 'CustomerDetail') ||
                    (item.id === 'Vehicles' && currentView === 'VehicleDetail') ||
                    (item.id === 'Technicians' && currentView === 'TechnicianDetail') ||
                    (item.id === 'Invoices' && currentView === 'InvoiceDetail');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm transition-colors relative font-medium ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-sm font-semibold'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left truncate">{item.label}</span>
                          {item.badge !== undefined && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-bold tracking-tight ${
                                item.badgeColor || 'bg-blue-500'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {sidebarCollapsed && item.badge !== undefined && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-gray-900" />
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold ring-2 ring-blue-500/40 shrink-0">
              {currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
                <p className="text-xs text-blue-300 font-semibold truncate">{ROLE_LABEL[currentRole]}</p>
                <p className="text-[10px] text-gray-500 truncate">{ROLE_DESK[currentRole]}</p>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
