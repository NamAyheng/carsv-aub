import React, { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmModal } from './components/common/ConfirmModal';
import { CustomerPortalApp, CustomerTab } from './components/customer/CustomerPortalApp';
import { CustomerPublicLanding } from './components/customer/CustomerPublicLanding';
import { CustomerPublicBlog } from './components/customer/CustomerPublicBlog';
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';
import { CustomerBookAppointmentModal } from './components/customer/CustomerBookAppointmentModal';
import { portalPaths, sectionForPath } from './routes';

function ThemeFrame({ children }: { children: React.ReactNode }) {
  const { theme } = useApp();
  return (
    <div className={`min-h-screen customer-theme-root transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} selection:bg-blue-600 selection:text-slate-950`}>
      {children}
      <ToastContainer />
      <ConfirmModal />
    </div>
  );
}

function RequireCustomer({ children }: { children: React.ReactNode }) {
  const { authReady, isAuthenticated, currentRole } = useApp();
  const location = useLocation();
  if (!authReady) return null;
  if (!isAuthenticated || currentRole !== 'CUSTOMER') {
    const next = encodeURIComponent(location.pathname);
    return <Navigate to={`/?signin=1&next=${next}`} replace />;
  }
  return children;
}

function PublicSite() {
  const { isAuthenticated, currentRole } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const section = sectionForPath(location.pathname);
  const [params] = useSearchParams();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [serviceId, setServiceId] = useState<string | undefined>(undefined);
  const signedIn = isAuthenticated && currentRole === 'CUSTOMER';

  useEffect(() => {
    if (params.get('signin') === '1') setAuthOpen(true);
  }, [params]);

  useEffect(() => {
    if (section === 'blog') {
      window.scrollTo(0, 0);
      return;
    }
    const id = section === 'live-bay' ? 'transparency' : section;
    const scroll = () => {
      if (id === 'home') window.scrollTo(0, 0);
      else document.getElementById(id)?.scrollIntoView({ block: 'start' });
    };
    scroll();
    const timer = window.setTimeout(scroll, 500);
    return () => window.clearTimeout(timer);
  }, [section]);

  const openAuth = (mode: 'LOGIN' | 'REGISTER' = 'LOGIN') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const openBooking = (id?: string) => {
    if (!signedIn) {
      openAuth('LOGIN');
      return;
    }
    setServiceId(id);
    setBookingOpen(true);
  };

  const openPortal = () => {
    if (signedIn) navigate(portalPaths.DASHBOARD);
    else openAuth('LOGIN');
  };

  return (
    <>
      {section === 'blog' ? (
        <CustomerPublicBlog
          onBackHome={() => navigate('/')}
          onOpenCustomerPortal={openPortal}
          onOpenAuth={() => openAuth('LOGIN')}
          onOpenBooking={() => openBooking()}
          onOpenBlog={() => navigate('/blog')}
        />
      ) : (
        <CustomerPublicLanding
          onOpenAuth={openAuth}
          onOpenBooking={openBooking}
          onOpenCustomerPortal={openPortal}
          onEnterCustomerPortal={openPortal}
          onOpenBlog={() => navigate('/blog')}
        />
      )}
      <CustomerAuthModal
        key={authMode}
        isOpen={authOpen}
        initialMode={authMode}
        onClose={() => {
          setAuthOpen(false);
          if (params.get('signin')) navigate(location.pathname, { replace: true });
        }}
        onSuccessRedirect={() => {
          setAuthOpen(false);
          navigate(params.get('next') || portalPaths.DASHBOARD);
        }}
      />
      {signedIn && (
        <CustomerBookAppointmentModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          preselectedServiceId={serviceId}
          onSuccessViewAppointments={() => {
            setBookingOpen(false);
            navigate(portalPaths.APPOINTMENTS);
          }}
        />
      )}
    </>
  );
}

function CustomerPage({ tab }: { tab: CustomerTab }) {
  const navigate = useNavigate();
  return (
    <CustomerPortalApp
      key={tab}
      onBackToPublicSite={() => navigate('/')}
    />
  );
}

function AppRoutes() {
  return (
    <ThemeFrame>
      <Routes>
        <Route path="/" element={<PublicSite />} />
        <Route path="/about" element={<PublicSite />} />
        <Route path="/services" element={<PublicSite />} />
        <Route path="/how-it-works" element={<PublicSite />} />
        <Route path="/live-bay" element={<PublicSite />} />
        <Route path="/blog" element={<PublicSite />} />
        <Route path="/contact" element={<PublicSite />} />
        <Route path="/dashboard" element={<RequireCustomer><CustomerPage tab="DASHBOARD" /></RequireCustomer>} />
        <Route path="/vehicles" element={<RequireCustomer><CustomerPage tab="VEHICLES" /></RequireCustomer>} />
        <Route path="/appointments" element={<RequireCustomer><CustomerPage tab="APPOINTMENTS" /></RequireCustomer>} />
        <Route path="/tracking" element={<RequireCustomer><CustomerPage tab="TRACKING" /></RequireCustomer>} />
        <Route path="/quotes" element={<RequireCustomer><CustomerPage tab="QUOTES" /></RequireCustomer>} />
        <Route path="/parts" element={<RequireCustomer><CustomerPage tab="PARTS_PRODUCTS" /></RequireCustomer>} />
        <Route path="/invoices" element={<RequireCustomer><CustomerPage tab="INVOICES" /></RequireCustomer>} />
        <Route path="/documents" element={<RequireCustomer><CustomerPage tab="DOCUMENTS" /></RequireCustomer>} />
        <Route path="/reviews" element={<RequireCustomer><CustomerPage tab="FEEDBACK" /></RequireCustomer>} />
        <Route path="/profile" element={<RequireCustomer><CustomerPage tab="PROFILE" /></RequireCustomer>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeFrame>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
