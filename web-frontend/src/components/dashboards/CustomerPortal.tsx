import React, { useState } from 'react';
import { CustomerPortalApp } from '../customer/CustomerPortalApp';
import { CustomerPublicLanding } from '../customer/CustomerPublicLanding';
import { CustomerPublicBlog } from '../customer/CustomerPublicBlog';
import { CustomerBookAppointmentModal } from '../customer/CustomerBookAppointmentModal';
import { useApp } from '../../context/AppContext';

export const CustomerPortal: React.FC = () => {
  const { switchRole } = useApp();
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'PUBLIC_SITE' | 'BLOG'>('DASHBOARD');
  const [bookingOpen, setBookingOpen] = useState(false);
  const [preselectedService, setPreselectedService] = useState<string | undefined>(undefined);

  const openBooking = (serviceId?: string) => {
    setPreselectedService(serviceId);
    setBookingOpen(true);
  };

  if (viewMode === 'BLOG') {
    return (
      <>
        <CustomerPublicBlog
          onBackHome={() => setViewMode('PUBLIC_SITE')}
          onOpenCustomerPortal={() => setViewMode('DASHBOARD')}
          onOpenBooking={() => openBooking()}
          onOpenStaffLogin={() => switchRole('ADMIN')}
          onOpenBlog={() => setViewMode('BLOG')}
        />
        <CustomerBookAppointmentModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          preselectedServiceId={preselectedService}
          onSuccessViewAppointments={() => {
            setBookingOpen(false);
            setViewMode('DASHBOARD');
          }}
        />
      </>
    );
  }

  if (viewMode === 'PUBLIC_SITE') {
    return (
      <>
        <CustomerPublicLanding
          onOpenCustomerPortal={() => setViewMode('DASHBOARD')}
          onEnterCustomerPortal={() => setViewMode('DASHBOARD')}
          onOpenBooking={openBooking}
          onOpenStaffLogin={() => switchRole('ADMIN')}
          onOpenBlog={() => setViewMode('BLOG')}
        />
        <CustomerBookAppointmentModal
          isOpen={bookingOpen}
          onClose={() => setBookingOpen(false)}
          preselectedServiceId={preselectedService}
          onSuccessViewAppointments={() => {
            setBookingOpen(false);
            setViewMode('DASHBOARD');
          }}
        />
      </>
    );
  }

  return (
    <CustomerPortalApp
      onBackToPublicSite={() => setViewMode('PUBLIC_SITE')}
      onSwitchToStaffERP={() => switchRole('ADMIN')}
    />
  );
};
