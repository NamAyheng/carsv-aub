import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  LogOut,
  Settings,
  Shield,
  ExternalLink
} from 'lucide-react';
import { useApp, NavigationPage } from '../../context/AppContext';
import { ThemeToggle } from '../common/ThemeToggle';
import {
  ERP_DEMO_ACCOUNTS,
  ROLE_LABEL,
  erpNavbarTitle,
  isStaffNotification
} from '../../utils/roles';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    currentRole,
    currentUser,
    switchUser,
    logout,
    setMobileMenuOpen,
    setGlobalSearchOpen,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    selectedWorkOrderId
  } = useApp();

  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);

  const deskNotifications = notifications.filter(isStaffNotification);
  const unreadCount = deskNotifications.filter((n) => !n.read).length;
  const canOpenSettings = currentRole === 'ADMIN' || currentRole === 'MANAGER';

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifDropdownOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (demoRef.current && !demoRef.current.contains(e.target as Node)) {
        setDemoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbs = () => {
    const crumbs: { label: string; action?: () => void }[] = [{ label: 'Staff ERP', action: () => setCurrentView('Dashboard') }];

    switch (currentView) {
      case 'Dashboard':
        crumbs.push({ label: ROLE_LABEL[currentRole] });
        break;
      case 'WorkOrderDetail':
        crumbs.push({ label: 'Work orders', action: () => setCurrentView('WorkOrders') });
        crumbs.push({ label: selectedWorkOrderId ? selectedWorkOrderId.toUpperCase() : 'Detail' });
        break;
      case 'CustomerDetail':
        crumbs.push({ label: 'Customers', action: () => setCurrentView('Customers') });
        crumbs.push({ label: 'Customer profile' });
        break;
      case 'VehicleDetail':
        crumbs.push({ label: 'Vehicles', action: () => setCurrentView('Vehicles') });
        crumbs.push({ label: 'Vehicle dossier' });
        break;
      case 'TechnicianDetail':
        crumbs.push({ label: 'Technicians', action: () => setCurrentView('Technicians') });
        crumbs.push({ label: 'Technician' });
        break;
      case 'InvoiceDetail':
        crumbs.push({ label: 'Invoices', action: () => setCurrentView('Invoices') });
        crumbs.push({ label: 'Invoice' });
        break;
      default:
        crumbs.push({ label: erpNavbarTitle(currentView, currentRole) });
    }
    return crumbs;
  };

  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 px-4 sm:px-8 flex items-center justify-between shadow-xs shrink-0">
      <div className="flex items-center space-x-4 min-w-0">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-lg font-bold text-gray-800 tracking-tight truncate">
            {erpNavbarTitle(currentView, currentRole)}
          </h1>
          <p className="hidden sm:block text-[10px] text-gray-400 truncate">
            {getBreadcrumbs().map((c) => c.label).join(' / ')}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-3 sm:space-x-5">
        <div className="relative hidden sm:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search vehicles, customers..."
            onClick={() => setGlobalSearchOpen(true)}
            readOnly
            className="pl-9 pr-8 py-1.5 bg-gray-100 border-none rounded-lg text-xs md:text-sm w-44 md:w-64 text-gray-700 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 cursor-pointer"
          />
          <kbd className="absolute right-2.5 top-2 hidden md:inline-block px-1.5 py-0.5 text-[9px] font-mono bg-white text-gray-400 rounded border border-gray-200">
            ⌘K
          </kbd>
        </div>

        <div className="relative hidden lg:block" ref={demoRef}>
          <button
            type="button"
            onClick={() => setDemoDropdownOpen((open) => !open)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 border border-gray-200 text-gray-600 hover:bg-white hover:text-gray-900"
            title="Switch demo staff account"
          >
            Try as
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {demoDropdownOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Demo staff login</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Each person is a different job — not extra roles on your account.</p>
              </div>
              {ERP_DEMO_ACCOUNTS.map((acc) => {
                const active = currentUser.id === acc.userId;
                return (
                  <button
                    key={acc.userId}
                    type="button"
                    onClick={() => {
                      switchUser(acc.userId);
                      setDemoDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 border-b border-gray-50 last:border-0 ${
                      active ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">{acc.name}</p>
                    <p className="text-[11px] text-gray-500">{acc.job}</p>
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  switchUser('user-customer-demo');
                  setDemoDropdownOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Leave ERP — customer website
              </button>
            </div>
          )}
        </div>

        <ThemeToggle />

        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
            className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg relative transition-colors"
            title="Staff notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white" />
            )}
          </button>

          {notifDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">Staff notifications</h4>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllNotificationsAsRead}
                    className="text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                {deskNotifications.slice(0, 5).map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => {
                      markNotificationAsRead(notif.id);
                      if (notif.targetModule) setCurrentView(notif.targetModule as NavigationPage);
                      setNotifDropdownOpen(false);
                    }}
                    className={`p-3.5 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notif.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900">{notif.title}</p>
                      <span className="text-[10px] text-gray-400 font-mono">{notif.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-snug">{notif.message}</p>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-gray-100 text-center bg-gray-50/50">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('Notifications');
                    setNotifDropdownOpen(false);
                  }}
                  className="text-xs font-bold text-blue-600 hover:text-blue-800"
                >
                  View all staff notifications →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center space-x-2 p-1 pl-2 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
          >
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-gray-900 leading-tight">{currentUser.name}</p>
              <p className="text-[10px] text-gray-500 font-semibold">{ROLE_LABEL[currentRole]}</p>
            </div>
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-8 h-8 rounded-lg object-cover ring-2 ring-gray-200"
            />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {profileDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <p className="text-xs font-bold text-gray-900">{currentUser.name}</p>
                <p className="text-[11px] text-gray-500 truncate">{currentUser.email}</p>
                <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                  <Shield className="w-3 h-3" />
                  {ROLE_LABEL[currentRole]}
                </div>
              </div>

              <div className="lg:hidden p-3 border-b border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                  Demo staff login
                </span>
                <div className="space-y-1">
                  {ERP_DEMO_ACCOUNTS.map((acc) => (
                    <button
                      key={acc.userId}
                      type="button"
                      onClick={() => {
                        switchUser(acc.userId);
                        setProfileDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2 py-1.5 text-xs rounded-md ${
                        currentUser.id === acc.userId ? 'bg-blue-600 text-white font-bold' : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {acc.name} · {acc.job}
                    </button>
                  ))}
                </div>
              </div>

              {(canOpenSettings) && (
                <div className="p-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('Settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Settings className="w-4 h-4 text-gray-400" />
                    Garage settings
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('ActivityLogs');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4 text-gray-400" />
                    Activity logs
                  </button>
                </div>
              )}

              <div className="p-2 border-t border-gray-100 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    switchUser('user-customer-demo');
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  Customer website
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
