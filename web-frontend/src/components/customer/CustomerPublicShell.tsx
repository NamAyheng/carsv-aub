import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Car, Menu, UserCheck, X } from 'lucide-react';
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
      return 'bg-blue-600 text-slate-950 shadow-sm shadow-blue-600/25 transition-colors';
    }
    return 'text-white/80 hover:bg-white/10 hover:text-white transition-colors';
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-40">
          <div className="h-16 flex items-center justify-between gap-4">
            <button
              type="button"
              className="portal-brand-logo flex items-center gap-2.5 shrink-0 cursor-pointer"
              onClick={() => handleNav('home')}
            >
              <div className="portal-brand-logo-mark w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm shadow-blue-600/30">
                <Car className="w-5 h-5 text-slate-950" strokeWidth={2.25} />
              </div>
              <div className="text-left leading-tight">
                <div className="text-lg font-black tracking-tight whitespace-nowrap text-white">
                  Car<span className="text-blue-400">SV</span>
                </div>
                <div className="text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap text-white/70">
                  Precision garage
                </div>
              </div>
            </button>

            <div className="flex items-center gap-2 shrink-0">
              {isAuthenticated && currentRole === 'CUSTOMER' ? (
                <button
                  type="button"
                  onClick={handleEnterCustomer}
                  className="bar-action hidden lg:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold border border-white/25 bg-white/15 hover:bg-white/25 text-white whitespace-nowrap transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Portal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenAuth('LOGIN')}
                  className="bar-action hidden lg:inline-flex items-center h-9 px-3 rounded-full text-sm font-semibold border border-white/25 bg-white/15 hover:bg-white/25 text-white whitespace-nowrap transition-colors"
                >
                  Login
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenBooking()}
                className="bar-action hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-slate-950 text-sm font-semibold whitespace-nowrap shadow-sm shadow-blue-600/25 cursor-pointer transition-all"
              >
                <Calendar className="w-4 h-4" />
                Book service
              </button>

              <ThemeToggle className="!bg-white/15 !border-white/25 !text-white hover:!bg-white/25 [&_svg]:!text-white" />

              {isAuthenticated && currentRole === 'CUSTOMER' ? (
                <button
                  type="button"
                  onClick={handleEnterCustomer}
                  className="bar-action lg:hidden inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-sm font-semibold border border-white/25 bg-white/15 hover:bg-white/25 text-white whitespace-nowrap transition-colors"
                >
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  Portal
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleOpenAuth('LOGIN')}
                  className="bar-action lg:hidden inline-flex items-center h-9 px-3.5 rounded-full bg-blue-600 hover:bg-blue-500 text-slate-950 text-sm font-semibold whitespace-nowrap shadow-sm shadow-blue-600/25 cursor-pointer transition-all"
                >
                  Login
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-expanded={mobileMenuOpen}
                aria-controls="public-mobile-nav"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                className="bar-action lg:hidden h-9 w-9 rounded-full flex items-center justify-center border border-white/25 bg-white/15 text-white hover:bg-white/25 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1 pb-3 overflow-x-auto">
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
          <div
            id="public-mobile-nav"
            className="portal-mobile-nav keep-on-dark absolute left-0 right-0 top-full z-50 lg:hidden bg-[#202127] border-b border-white/10 px-4 sm:px-6 py-4 sm:py-5 space-y-4 shadow-xl"
          >
            <div className="flex flex-col gap-1.5 font-medium">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNav(item.id)}
                  aria-current={activeSection === item.id ? 'page' : undefined}
                  className={`text-left px-3 py-2.5 rounded-xl min-h-11 ${navClass(item.id)}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="pt-4 border-t border-white/10 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenBooking();
                }}
                className="w-full py-3 rounded-xl bg-blue-600 text-slate-950 font-bold text-center shadow-sm shadow-blue-600/25"
              >
                Book service
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  if (isAuthenticated && currentRole === 'CUSTOMER') handleEnterCustomer();
                  else handleOpenAuth('LOGIN');
                }}
                className="w-full py-3 rounded-xl font-semibold text-center border border-white/25 bg-white/10 text-white"
              >
                {isAuthenticated && currentRole === 'CUSTOMER' ? 'Back to portal' : 'Customer Login'}
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="bg-slate-950 border-t border-slate-800/80 py-10 sm:py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 min-w-0">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                  <Car className="w-5 h-5" />
                </div>
                <span className="text-lg font-black text-white tracking-tight">
                  Car<span className="text-blue-500">SV</span>
                </span>
              </div>
              <span className="hidden sm:inline text-slate-600">|</span>
              <span className="leading-relaxed max-w-sm sm:max-w-none">
                © 2026 CarSV Automotive Technologies Inc. All rights reserved.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-2 text-slate-400">
              {['home', 'about', 'services', 'blog'].map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleNav(id)}
                  className={`transition-colors min-h-9 ${
                    activeSection === id ? 'text-blue-400 font-semibold' : 'hover:text-white'
                  }`}
                >
                  {id === 'home' ? 'Home' : id === 'about' ? 'What We Are' : id === 'services' ? 'Services' : 'Blog'}
                </button>
              ))}
              <button type="button" onClick={handleEnterCustomer} className="hover:text-white transition-colors min-h-9">
                Customer Portal
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};
