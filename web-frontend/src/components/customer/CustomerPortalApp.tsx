import React, { useEffect, useRef, useState } from 'react';
import {
  Car,
  Calendar,
  FileText,
  Receipt,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Globe,
  Shield,
  MessageSquare,
  ClipboardList,
  LayoutDashboard,
  Video,
  Package
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CustomerDashboardHome } from './CustomerDashboardHome';
import { CustomerVehiclesView } from './CustomerVehiclesView';
import { CustomerAppointmentsView } from './CustomerAppointmentsView';
import { CustomerWorkOrderTracking } from './CustomerWorkOrderTracking';
import { CustomerInvoicesView } from './CustomerInvoicesView';
import { CustomerDocumentsView } from './CustomerDocumentsView';
import { CustomerFeedbackView } from './CustomerFeedbackView';
import { CustomerProfileView } from './CustomerProfileView';
import { CustomerBookAppointmentModal } from './CustomerBookAppointmentModal';
import { CustomerProductsView } from './CustomerProductsView';
import { CustomerQuotesView } from './CustomerQuotesView';
import { ThemeToggle } from '../common/ThemeToggle';

export type CustomerTab =
  | 'DASHBOARD'
  | 'VEHICLES'
  | 'APPOINTMENTS'
  | 'TRACKING'
  | 'QUOTES'
  | 'PARTS_PRODUCTS'
  | 'INVOICES'
  | 'DOCUMENTS'
  | 'FEEDBACK'
  | 'PROFILE';

interface CustomerPortalAppProps {
  onBackToPublicSite: () => void;
  onSwitchToStaffERP: () => void;
}

export const CustomerPortalApp: React.FC<CustomerPortalAppProps> = ({
  onBackToPublicSite,
  onSwitchToStaffERP
}) => {
  const {
    currentUser,
    notifications,
    markNotificationAsRead,
    addToast,
    logout,
    theme
  } = useApp();
  const isDark = theme === 'dark';

  const [activeTab, setActiveTab] = useState<CustomerTab>('DASHBOARD');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(target)) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  // Booking Modal
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<string | undefined>(undefined);

  const customerNotifications = (notifications || []).filter((n) => n.audience === 'CUSTOMER');
  const unreadCount = customerNotifications.filter((n) => !n.read).length;

  const handleMarkCustomerNotificationsRead = () => {
    const unread = customerNotifications.filter((n) => !n.read);
    unread.forEach((n) => markNotificationAsRead(n.id));
    if (unread.length > 0) {
      addToast({ type: 'info', title: 'Notifications cleared', message: 'All items marked as read.' });
    }
  };

  const notificationIcon = (type: string) => {
    if (type === 'REPAIR' || type === 'PICKUP') return Video;
    if (type === 'APPOINTMENT') return Calendar;
    if (type === 'PAYMENT' || type === 'INVOICE') return Receipt;
    if (type === 'QUOTE') return ClipboardList;
    if (type === 'MAINTENANCE') return Car;
    return Bell;
  };

  const navItems: { id: CustomerTab; label: string; icon: React.ComponentType<{ className?: string }>; live?: boolean }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'VEHICLES', label: 'Vehicles', icon: Car },
    { id: 'APPOINTMENTS', label: 'Appointments', icon: Calendar },
    { id: 'TRACKING', label: 'Tracking', icon: Video, live: true },
    { id: 'QUOTES', label: 'Quotes', icon: ClipboardList },
    { id: 'PARTS_PRODUCTS', label: 'Parts', icon: Package },
    { id: 'INVOICES', label: 'Invoices', icon: Receipt },
    { id: 'DOCUMENTS', label: 'Documents', icon: FileText },
    { id: 'FEEDBACK', label: 'Reviews', icon: MessageSquare }
  ];

  const firstName = (currentUser?.name || 'John').split(' ')[0];

  const handleTabChange = (tab: CustomerTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleOpenBookingWithService = (serviceId?: string) => {
    setPreselectedService(serviceId);
    setBookingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-white">
      <header
        className={`sticky top-0 z-40 backdrop-blur-md border-b ${
          isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/95 border-slate-200 shadow-sm'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('DASHBOARD')}
              className="flex items-center gap-2.5 shrink-0 cursor-pointer"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-600/25">
                <Car className="w-5 h-5" />
              </div>
              <div className="text-left leading-tight">
                <div className={`text-lg font-black tracking-tight whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Car<span className="text-blue-500">SV</span>
                </div>
                <div className={`text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Customer portal
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenBookingWithService()}
                className="bar-action hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold whitespace-nowrap shadow-sm shadow-blue-600/25 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                Book service
              </button>

              <ThemeToggle />

              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileDropdownOpen(false);
                  }}
                  className={`bar-action relative h-9 w-9 rounded-full flex items-center justify-center border transition-colors ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className={`notification-panel fixed top-16 right-4 w-[320px] max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl z-50 border overflow-hidden ${
                      isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Notifications</p>
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          onClick={handleMarkCustomerNotificationsRead}
                          className={`text-xs font-semibold whitespace-nowrap ${isDark ? 'text-sky-300 hover:text-white' : 'text-blue-600 hover:underline'}`}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-[360px] overflow-y-auto overflow-x-hidden">
                      {customerNotifications.length === 0 && (
                        <p className={`p-4 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                          No notifications yet.
                        </p>
                      )}
                      {customerNotifications.slice(0, 6).map((n) => {
                        const Icon = notificationIcon(n.type);
                        return (
                          <div
                            key={n.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              markNotificationAsRead(n.id);
                              if (
                                n.targetModule === 'TRACKING' ||
                                n.targetModule === 'APPOINTMENTS' ||
                                n.targetModule === 'INVOICES' ||
                                n.targetModule === 'QUOTES' ||
                                n.targetModule === 'VEHICLES' ||
                                n.targetModule === 'DOCUMENTS'
                              ) {
                                handleTabChange(n.targetModule);
                                setNotificationsOpen(false);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                markNotificationAsRead(n.id);
                              }
                            }}
                            className={`w-full px-4 py-3 border-b last:border-b-0 cursor-pointer ${
                              isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-sky-300' : 'text-blue-600'}`} />
                              <p className={`flex-1 text-sm font-bold leading-5 whitespace-normal break-words ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {n.title}
                              </p>
                              {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-sky-400 shrink-0" />}
                            </div>
                            <p className={`mt-1.5 text-sm leading-5 whitespace-normal break-words ${isDark ? 'text-slate-200' : 'text-slate-600'}`}>
                              {n.message}
                            </p>
                            <p className={`mt-1 text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {n.timestamp}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => {
                    setProfileDropdownOpen(!profileDropdownOpen);
                    setNotificationsOpen(false);
                  }}
                  className={`bar-action flex items-center gap-2 h-9 pl-1 pr-2 rounded-full border transition-colors cursor-pointer ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <img
                    src={
                      currentUser?.avatar ||
                      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80'
                    }
                    alt={currentUser?.name}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                  <span className={`hidden sm:inline text-sm font-semibold whitespace-nowrap ${isDark ? 'text-white' : 'text-slate-800'}`}>
                    {firstName}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} />
                </button>

                {profileDropdownOpen && (
                  <div
                    className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 border ${
                      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`px-3 py-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
                      <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{currentUser?.name}</div>
                      <div className={`truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{currentUser?.email}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTabChange('PROFILE')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-blue-500" />
                      My profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('FEEDBACK')}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
                      Rate workshop
                    </button>
                    <button
                      type="button"
                      onClick={onBackToPublicSite}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        isDark ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 text-emerald-500" />
                      Public website
                    </button>
                    <button
                      type="button"
                      onClick={onSwitchToStaffERP}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        isDark ? 'text-amber-400 hover:bg-amber-950/40' : 'text-amber-700 hover:bg-amber-50'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      Staff ERP demo
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-2 ${
                        isDark ? 'text-red-400 hover:bg-red-950/40' : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden h-9 w-9 rounded-full flex items-center justify-center border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-slate-200'
                    : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <nav className={`hidden lg:flex items-center gap-1 pb-2.5 -mx-1 overflow-x-auto ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDark
                        ? 'hover:bg-slate-800 hover:text-white'
                        : 'hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  {item.live && (
                    <span className={`w-1.5 h-1.5 rounded-full bg-red-500 ${active ? 'ring-2 ring-white/40' : ''}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {mobileMenuOpen && (
          <div className={`lg:hidden border-t px-4 py-3 space-y-1 ${isDark ? 'border-slate-800 bg-slate-950' : 'border-slate-200 bg-white'}`}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold ${
                    active
                      ? 'bg-blue-600 text-white'
                      : isDark
                        ? 'text-slate-200 hover:bg-slate-800'
                        : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.live && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-red-500" />}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenBookingWithService();
              }}
              className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold"
            >
              Book service
            </button>
          </div>
        )}
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'DASHBOARD' && (
          <CustomerDashboardHome
            onNavigateTab={(tab) => {
              if (tab === 'VEHICLES') setActiveTab('VEHICLES');
              if (tab === 'APPOINTMENTS') setActiveTab('APPOINTMENTS');
              if (tab === 'TRACKING') setActiveTab('TRACKING');
              if (tab === 'QUOTES') setActiveTab('QUOTES');
              if (tab === 'PARTS_PRODUCTS') setActiveTab('PARTS_PRODUCTS');
              if (tab === 'INVOICES') setActiveTab('INVOICES');
              if (tab === 'DOCUMENTS') setActiveTab('DOCUMENTS');
              if (tab === 'FEEDBACK') setActiveTab('FEEDBACK');
              if (tab === 'PROFILE') setActiveTab('PROFILE');
            }}
            onOpenBookAppointment={() => handleOpenBookingWithService()}
            onOpenAddVehicle={() => setActiveTab('VEHICLES')}
          />
        )}

        {activeTab === 'VEHICLES' && (
          <CustomerVehiclesView
            onBookServiceForVehicle={(vId) => handleOpenBookingWithService()}
            onViewWorkOrder={(woId) => setActiveTab('TRACKING')}
            onBrowseParts={() => setActiveTab('PARTS_PRODUCTS')}
          />
        )}

        {activeTab === 'APPOINTMENTS' && (
          <CustomerAppointmentsView
            onOpenBookAppointment={() => handleOpenBookingWithService()}
            onTrackWorkOrder={(woId) => setActiveTab('TRACKING')}
          />
        )}

        {activeTab === 'TRACKING' && (
          <CustomerWorkOrderTracking onNavigateToParts={() => setActiveTab('PARTS_PRODUCTS')} />
        )}

        {activeTab === 'QUOTES' && (
          <CustomerQuotesView onTrackWorkOrder={() => setActiveTab('TRACKING')} />
        )}

        {activeTab === 'PARTS_PRODUCTS' && (
          <CustomerProductsView
            onNavigateTab={(tab) => handleTabChange(tab)}
            onOpenBookAppointment={() => handleOpenBookingWithService()}
          />
        )}

        {activeTab === 'INVOICES' && <CustomerInvoicesView />}

        {activeTab === 'DOCUMENTS' && <CustomerDocumentsView />}

        {activeTab === 'FEEDBACK' && <CustomerFeedbackView />}

        {activeTab === 'PROFILE' && <CustomerProfileView onLogout={logout} />}
      </main>

      {/* 3. BOOK APPOINTMENT MODAL */}
      <CustomerBookAppointmentModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preselectedServiceId={preselectedService}
        onSuccessViewAppointments={() => setActiveTab('APPOINTMENTS')}
      />
    </div>
  );
};
