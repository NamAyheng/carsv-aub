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
  MessageSquare,
  ClipboardList,
  LayoutDashboard,
  Video,
  Package
} from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { portalPaths, tabForPath } from '../../routes';
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
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import {
  alertBadgeClass,
  alertChipClass,
  customerAlert,
  strongestAlert,
  workOrderAlert,
  type AlertTone,
} from '../../utils/customerAlerts';

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
}

export const CustomerPortalApp: React.FC<CustomerPortalAppProps> = ({
  onBackToPublicSite
}) => {
  const {
    currentUser,
    notifications,
    workOrders,
    markNotificationAsRead,
    addToast,
    logout,
    theme
  } = useApp();
  const isDark = theme === 'dark';

  const navigate = useNavigate();
  const { pathname } = useLocation();
  const activeTab = tabForPath(pathname);
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
  const liveAlerts = customerNotifications.flatMap((note) => {
    if (note.read) return [];
    const alert = customerAlert(note.type, note.title, note.message);
    return alert ? [{ note, ...alert }] : [];
  });
  const badgeTone = strongestAlert(liveAlerts.map((item) => item.tone));
  const openJobTone = strongestAlert(
    (workOrders || [])
      .filter((job) => belongsToCurrentCustomer(currentUser, job))
      .map((job) => workOrderAlert(job.status))
      .filter((tone): tone is AlertTone => tone !== null)
  );

  const tabTone = (tab: CustomerTab): AlertTone | null => {
    if (tab === 'TRACKING') return openJobTone;
    if (tab === 'QUOTES') return strongestAlert(liveAlerts.filter((item) => item.note.type === 'QUOTE').map((item) => item.tone));
    if (tab === 'INVOICES') {
      return strongestAlert(
        liveAlerts.filter((item) => item.note.type === 'INVOICE' || item.note.type === 'PAYMENT').map((item) => item.tone)
      );
    }
    if (tab === 'APPOINTMENTS') {
      return strongestAlert(liveAlerts.filter((item) => item.note.type === 'APPOINTMENT').map((item) => item.tone));
    }
    if (tab === 'VEHICLES') {
      return strongestAlert(liveAlerts.filter((item) => item.note.type === 'MAINTENANCE').map((item) => item.tone));
    }
    return null;
  };

  const handleMarkCustomerNotificationsRead = () => {
    liveAlerts.forEach((item) => markNotificationAsRead(item.note.id));
    if (liveAlerts.length > 0) {
      addToast({ type: 'info', title: 'Alerts cleared', message: 'These alerts are marked as read.' });
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

  const navItems: { id: CustomerTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'VEHICLES', label: 'Vehicles', icon: Car },
    { id: 'APPOINTMENTS', label: 'Appointments', icon: Calendar },
    { id: 'TRACKING', label: 'Tracking', icon: Video },
    { id: 'QUOTES', label: 'Quotes', icon: ClipboardList },
    { id: 'PARTS_PRODUCTS', label: 'Parts', icon: Package },
    { id: 'INVOICES', label: 'Invoices', icon: Receipt },
    { id: 'DOCUMENTS', label: 'Documents', icon: FileText },
    { id: 'FEEDBACK', label: 'Reviews', icon: MessageSquare }
  ];

  const firstName = (currentUser?.name || 'John').split(' ')[0];

  const handleTabChange = (tab: CustomerTab) => {
    navigate(portalPaths[tab]);
    setMobileMenuOpen(false);
    setProfileDropdownOpen(false);
  };

  const handleOpenBookingWithService = (serviceId?: string) => {
    setPreselectedService(serviceId);
    setBookingModalOpen(true);
  };

  return (
    <div
      className={`min-h-screen font-sans antialiased flex flex-col selection:bg-blue-600 selection:text-slate-950 transition-colors ${
        isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      <header className="portal-brand-header sticky top-0 z-40 relative border-b border-white/10 text-white shadow-md shadow-black/40">
        {mobileMenuOpen && (
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-40">
          <div className="h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('DASHBOARD')}
              className="portal-brand-logo flex items-center gap-2.5 shrink-0 cursor-pointer"
            >
              <div className="portal-brand-logo-mark w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/30">
                <Car className="w-5 h-5 text-slate-950" strokeWidth={2.25} />
              </div>
              <div className="text-left leading-tight">
                <div className="text-lg font-black tracking-tight whitespace-nowrap text-white">
                  Car<span className="text-blue-400">SV</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap text-white/70">
                  Customer portal
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenBookingWithService()}
                className="bar-action hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-slate-950 text-sm font-semibold whitespace-nowrap shadow-sm shadow-blue-600/25 cursor-pointer transition-all"
              >
                <Calendar className="w-4 h-4" />
                Book service
              </button>

              <ThemeToggle className="!bg-white/15 !border-white/25 !text-white hover:!bg-white/25 [&_svg]:!text-white" />

              <div className="relative" ref={notificationsRef}>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(!notificationsOpen);
                    setProfileDropdownOpen(false);
                  }}
                  className="bar-action relative h-9 w-9 rounded-full flex items-center justify-center border transition-colors bg-white/15 border-white/25 text-white hover:bg-white/25"
                >
                  <Bell className="w-4 h-4" />
                  {badgeTone && (
                    <span className={`absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${alertBadgeClass(badgeTone)}`}>
                      {liveAlerts.length}
                    </span>
                  )}
                </button>

                {notificationsOpen && (
                  <div
                    className={`portal-header-menu notification-panel fixed top-16 right-4 w-[320px] max-w-[calc(100vw-32px)] rounded-2xl shadow-2xl z-50 border overflow-hidden ${
                      isDark ? 'bg-slate-800 border-slate-600' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className={`px-4 py-3 border-b flex items-center justify-between gap-3 ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Alerts</p>
                      {liveAlerts.length > 0 && (
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
                      {liveAlerts.length === 0 && (
                        <p className={`p-4 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                          No alerts right now.
                        </p>
                      )}
                      {liveAlerts.slice(0, 8).map((item) => {
                        const n = item.note;
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
                              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${item.tone === 'red' ? 'text-red-500' : item.tone === 'orange' ? 'text-orange-500' : 'text-emerald-600'}`} />
                              <p className={`flex-1 text-sm font-bold leading-5 whitespace-normal break-words ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {n.title}
                              </p>
                              <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${alertChipClass(item.tone)}`}>
                                {item.label}
                              </span>
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
                  className="bar-action flex items-center gap-2 h-9 pl-1 pr-2 rounded-full border transition-colors cursor-pointer bg-white/15 border-white/25 hover:bg-white/25"
                >
                  {currentUser?.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt={currentUser?.name}
                      className="w-7 h-7 rounded-full object-cover ring-1 ring-white/40"
                    />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-blue-600 text-slate-950 text-xs font-black flex items-center justify-center">
                      {(currentUser?.name || 'C').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:inline text-sm font-semibold whitespace-nowrap text-white">
                    {firstName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/70" />
                </button>

                {profileDropdownOpen && (
                  <div
                    className={`portal-header-menu absolute right-0 mt-2 w-56 rounded-2xl shadow-2xl p-2 z-50 text-xs space-y-1 border ${
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
                      onClick={() => {
                        logout();
                        navigate('/');
                      }}
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
                aria-expanded={mobileMenuOpen}
                aria-controls="portal-mobile-nav"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="lg:hidden h-9 w-9 rounded-full flex items-center justify-center border bg-white/15 border-white/25 text-white hover:bg-white/25"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 pb-2.5 -mx-1 overflow-x-auto text-white/80 scrollbar-none">
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
                      ? 'bg-blue-600 text-slate-950 shadow-sm shadow-blue-600/25'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                  {tabTone(item.id) && (
                    <span className={`w-1.5 h-1.5 rounded-full ${alertBadgeClass(tabTone(item.id) as AlertTone)} ${active ? 'ring-2 ring-slate-950/20' : 'ring-2 ring-white/30'}`} />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {mobileMenuOpen && (
          <div
            id="portal-mobile-nav"
            className={`portal-mobile-nav absolute left-0 right-0 top-full z-50 lg:hidden border-t px-4 py-3 space-y-1 shadow-xl ${
              isDark
                ? 'border-white/10 bg-[#202127] keep-on-dark'
                : 'border-slate-200 bg-white'
            }`}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabChange(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-11 rounded-xl text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-blue-600 text-slate-950'
                      : isDark
                        ? 'text-white hover:bg-white/10'
                        : 'text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      active ? 'text-slate-950' : isDark ? 'text-white' : 'text-slate-700'
                    }`}
                  />
                  {item.label}
                  {tabTone(item.id) && (
                    <span className={`ml-auto w-1.5 h-1.5 rounded-full ${alertBadgeClass(tabTone(item.id) as AlertTone)}`} />
                  )}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleOpenBookingWithService();
              }}
              className="w-full mt-2 py-2.5 rounded-xl bg-blue-600 text-slate-950 text-sm font-semibold shadow-sm shadow-blue-600/25"
            >
              Book service
            </button>
          </div>
        )}
      </header>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 min-w-0">
        {activeTab === 'DASHBOARD' && (
          <CustomerDashboardHome
            onNavigateTab={(tab) => handleTabChange(tab)}
            onOpenBookAppointment={() => handleOpenBookingWithService()}
            onOpenAddVehicle={() => handleTabChange('VEHICLES')}
          />
        )}

        {activeTab === 'VEHICLES' && (
          <CustomerVehiclesView
            onBookServiceForVehicle={(vId) => handleOpenBookingWithService()}
            onViewWorkOrder={(woId) => {
              navigate(`/tracking?job=${encodeURIComponent(woId)}`);
              setMobileMenuOpen(false);
            }}
            onBrowseParts={() => handleTabChange('PARTS_PRODUCTS')}
          />
        )}

        {activeTab === 'APPOINTMENTS' && (
          <CustomerAppointmentsView
            onOpenBookAppointment={() => handleOpenBookingWithService()}
            onTrackWorkOrder={(woId) => {
              navigate(woId ? `/tracking?job=${encodeURIComponent(woId)}` : '/tracking');
              setMobileMenuOpen(false);
            }}
          />
        )}

        {activeTab === 'TRACKING' && (
          <CustomerWorkOrderTracking onNavigateToParts={() => handleTabChange('PARTS_PRODUCTS')} />
        )}

        {activeTab === 'QUOTES' && (
          <CustomerQuotesView onTrackWorkOrder={() => handleTabChange('TRACKING')} />
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
        onSuccessViewAppointments={() => handleTabChange('APPOINTMENTS')}
      />
    </div>
  );
};
