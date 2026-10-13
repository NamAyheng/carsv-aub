import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Calendar, Car, Menu, Phone, UserCheck, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { pathForSection, sectionForPath } from '../../routes';
import { ThemeToggle } from '../common/ThemeToggle';

export interface CustomerPublicShellHandlers {
  onOpenAuth?: (mode: 'LOGIN' | 'REGISTER') => void;
  onOpenBooking?: (serviceId?: string) => void;
  onEnterCustomerPortal?: () => void;
  onOpenCustomerPortal?: () => void;
  onOpenBlog?: () => void;
  onBackHome?: () => void;
}

interface CustomerPublicShellProps extends CustomerPublicShellHandlers {
  currentPage: 'home' | 'blog';
  children: React.ReactNode;
}

const NAV = [
  { id: 'home', label: 'Home' },
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'transparency', label: 'Live bay' },
  { id: 'blog', label: 'Blog' },
  { id: 'contact', label: 'Contact' }
];

export const CustomerPublicShell: React.FC<CustomerPublicShellProps> = ({
  currentPage,
  children,
  onOpenAuth,
  onOpenBooking,
  onEnterCustomerPortal,
  onOpenCustomerPortal
}) => {
  const { isAuthenticated, currentRole, theme } = useApp();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fromPath = sectionForPath(pathname);
  const activeSection = currentPage === 'blog' ? 'blog' : fromPath === 'live-bay' ? 'transparency' : fromPath;

  const greyBtn = isDark
    ? 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700'
    : 'bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300';

  const handleOpenAuth = (mode: 'LOGIN' | 'REGISTER') => {
    if (onOpenAuth) onOpenAuth(mode);
    else if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onEnterCustomerPortal) onEnterCustomerPortal();
  };

  const handleOpenBooking = (serviceId?: string) => {
    if (onOpenBooking) onOpenBooking(serviceId);
    else if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onEnterCustomerPortal) onEnterCustomerPortal();
  };

  const handleEnterCustomer = () => {
    if (isAuthenticated && currentRole === 'CUSTOMER') navigate('/dashboard');
    else if (onOpenCustomerPortal) onOpenCustomerPortal();
    else if (onEnterCustomerPortal) onEnterCustomerPortal();
  };

  const handleNav = (id: string) => {
    setMobileMenuOpen(false);
    navigate(pathForSection(id));
  };

  const navClass = (id: string) => {
    const active = activeSection === id;
    if (active) {
      return 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 transition-colors';
    }
    return isDark
      ? 'text-slate-300 hover:bg-blue-600/20 hover:text-blue-200 transition-colors'
      : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col">
      <div className="bg-slate-900 border-b border-slate-800/80 px-4 sm:px-8 py-2 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Workshop Open: 07:30 AM - 06:30 PM (Mon - Sat)
            </span>
            <span className="hidden md:inline text-slate-600">•</span>
            <span className="hidden md:flex items-center gap-1 text-slate-300">
              <Phone className="w-3.5 h-3.5 text-blue-400" />
              Emergency Assistance: +855 12 888 901
            </span>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && currentRole === 'CUSTOMER' ? (
              <button
                type="button"
                onClick={handleEnterCustomer}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-3 py-1 rounded-md transition-colors flex items-center gap-1.5"
              >
                <span>Go to My Customer Portal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAuth('LOGIN')}
                  className="hover:text-white transition-colors cursor-pointer text-slate-300 font-medium"
                >
                  Customer Sign In
                </button>
              </div>
            )}
            <ThemeToggle variant="pill" />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between gap-4">
            <button type="button" className="flex items-center gap-3 shrink-0" onClick={() => handleNav('home')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-600/25 border border-blue-400/30">
                <Car className="w-5 h-5 text-white" />
              </div>
              <div className="leading-tight text-left">
                <span className="text-xl font-black tracking-tight text-white whitespace-nowrap">
                  Car<span className="text-blue-500">SV</span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Precision garage</p>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && currentRole === 'CUSTOMER' ? (
                <button
                  type="button"
                  onClick={handleEnterCustomer}
                  className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold border whitespace-nowrap ${greyBtn}`}
                >
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  Portal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenAuth('LOGIN')}
                  className={`hidden sm:inline-flex items-center h-9 px-3 rounded-full text-sm font-semibold border whitespace-nowrap ${greyBtn}`}
                >
                  Login
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenBooking()}
                className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold whitespace-nowrap"
              >
                <Calendar className="w-4 h-4" />
                Book
              </button>

              <ThemeToggle />

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-2 pb-3 overflow-x-auto">
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNav(item.id)}
                aria-current={activeSection === item.id ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap ${navClass(item.id)}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden bg-slate-900/95 border-b border-slate-800 px-6 py-5 space-y-4">
            <div className="flex flex-col gap-3 font-medium text-slate-200">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                  className={`text-left px-3 py-2 rounded-xl ${navClass(item.id)}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-slate-800 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenBooking();
                }}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-center"
              >
                Book Appointment
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isAuthenticated && currentRole === 'CUSTOMER') handleEnterCustomer();
                  else handleOpenAuth('LOGIN');
                }}
                className={`w-full py-3 rounded-xl font-semibold text-center border ${greyBtn}`}
              >
                {isAuthenticated && currentRole === 'CUSTOMER' ? 'Back to portal' : 'Customer Login'}
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-slate-950 border-t border-slate-800/80 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                <Car className="w-5 h-5" />
              </div>
              <span className="text-lg font-black text-white tracking-tight">
                Car<span className="text-blue-500">SV</span>
              </span>
              <span className="text-slate-600">|</span>
              <span>© 2026 CarSV Automotive Technologies Inc. All rights reserved.</span>
            </div>

            <div className="flex items-center gap-6 text-slate-400">
              {['home', 'about', 'services', 'blog'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNav(id)}
                  className={`transition-colors ${
                    activeSection === id ? 'text-blue-400 font-semibold' : 'hover:text-white'
                  }`}
                >
                  {id === 'home' ? 'Home' : id === 'about' ? 'What We Are' : id === 'services' ? 'Services' : 'Blog'}
                </button>
              ))}
              <button type="button" onClick={handleEnterCustomer} className="hover:text-white transition-colors">
                Customer Portal
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
