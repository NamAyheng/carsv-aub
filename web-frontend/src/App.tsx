import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { LoginView } from './components/auth/LoginView';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { GlobalSearchModal } from './components/layout/GlobalSearchModal';
import { ToastContainer } from './components/common/ToastContainer';
import { ConfirmModal } from './components/common/ConfirmModal';

// Dashboards
import { AdminDashboard } from './components/dashboards/AdminDashboard';
import { ManagerDashboard } from './components/dashboards/ManagerDashboard';
import { StaffDashboard } from './components/dashboards/StaffDashboard';
import { TechnicianDashboard } from './components/dashboards/TechnicianDashboard';
import { CustomerPortal } from './components/dashboards/CustomerPortal';
import { CustomerPublicLanding } from './components/customer/CustomerPublicLanding';
import { CustomerPublicBlog } from './components/customer/CustomerPublicBlog';
import { CustomerAuthModal } from './components/customer/CustomerAuthModal';

// Customer Components
import { CustomerList } from './components/customers/CustomerList';
import { CustomerDetailView } from './components/customers/CustomerDetailView';
import { CustomerFormModal } from './components/customers/CustomerFormModal';

// Vehicle Components
import { VehicleList } from './components/vehicles/VehicleList';
import { VehicleDetailView } from './components/vehicles/VehicleDetailView';
import { VehicleFormModal } from './components/vehicles/VehicleFormModal';

// Appointment Components
import { AppointmentManager } from './components/appointments/AppointmentManager';
import { AppointmentFormModal } from './components/appointments/AppointmentFormModal';

// Service Components
import { ServiceCatalog } from './components/services/ServiceCatalog';
import { ServiceFormModal } from './components/services/ServiceFormModal';

// Work Order Components
import { WorkOrderList } from './components/workorders/WorkOrderList';
import { WorkOrderDetailView } from './components/workorders/WorkOrderDetailView';
import { WorkOrderFormModal } from './components/workorders/WorkOrderFormModal';

// Inventory Components
import { InventoryList } from './components/inventory/InventoryList';
import { InventoryFormModal } from './components/inventory/InventoryFormModal';

// Technician Components
import { TechnicianList } from './components/technicians/TechnicianList';
import { TechnicianDetailModal } from './components/technicians/TechnicianDetailModal';

// Invoice Components
import { InvoiceList } from './components/invoices/InvoiceList';
import { InvoiceDetailModal } from './components/invoices/InvoiceDetailModal';

// Analytics & Reports
import { ReportsView } from './components/reports/ReportsView';

// CCTV & Security
import { CCTVMonitoringView } from './components/security/CCTVMonitoringView';

// Feedback & Settings
import { FeedbackList } from './components/feedback/FeedbackList';
import { SettingsView } from './components/settings/SettingsView';
import {
  UsersView,
  PermissionsView,
  ActivityLogsView,
  StaffNotificationsView,
  DocumentsView,
  PaymentsView,
  TaskBoardView,
  SuppliersView
} from './components/settings/ErpSystemPages';
import { isErpViewAllowed } from './utils/roles';

// Types
import { Customer, Vehicle, ServiceItem, InventoryItem, Technician, Invoice } from './types';

const MainLayout: React.FC = () => {
  const {
    isAuthenticated,
    currentRole,
    currentView,
    setCurrentView,
    theme
  } = useApp();

  useEffect(() => {
    if (isAuthenticated && currentRole !== 'CUSTOMER' && !isErpViewAllowed(currentRole, currentView)) {
      setCurrentView('Dashboard');
    }
  }, [isAuthenticated, currentRole, currentView, setCurrentView]);

  // Modal State Handlers
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [vehicleToEdit, setVehicleToEdit] = useState<Vehicle | null>(null);

  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<ServiceItem | null>(null);

  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false);

  const [isInventoryModalOpen, setIsInventoryModalOpen] = useState(false);
  const [inventoryToEdit, setInventoryToEdit] = useState<InventoryItem | null>(null);

  const [selectedTechForModal, setSelectedTechForModal] = useState<Technician | null>(null);
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<Invoice | null>(null);

  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [isCustomerAuthOpen, setIsCustomerAuthOpen] = useState(false);
  const [publicPage, setPublicPage] = useState<'HOME' | 'BLOG'>('HOME');

  // If not authenticated, render Customer Public Landing ("What are we?") or Staff Login
  if (!isAuthenticated) {
    if (showStaffLogin) {
      return (
        <div className={`min-h-screen flex flex-col justify-center transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'}`}>
          <LoginView onBackToPublicSite={() => setShowStaffLogin(false)} />
          <ToastContainer />
        </div>
      );
    }

    return (
      <div className={`min-h-screen customer-theme-root transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} selection:bg-blue-600 selection:text-white`}>
        {publicPage === 'BLOG' ? (
          <CustomerPublicBlog
            onBackHome={() => setPublicPage('HOME')}
            onOpenCustomerPortal={() => setIsCustomerAuthOpen(true)}
            onOpenAuth={() => setIsCustomerAuthOpen(true)}
            onOpenBooking={() => setIsCustomerAuthOpen(true)}
            onOpenStaffLogin={() => setShowStaffLogin(true)}
            onOpenBlog={() => setPublicPage('BLOG')}
          />
        ) : (
          <CustomerPublicLanding
            onOpenCustomerPortal={() => setIsCustomerAuthOpen(true)}
            onOpenStaffLogin={() => setShowStaffLogin(true)}
            onOpenBlog={() => setPublicPage('BLOG')}
          />
        )}
        <CustomerAuthModal
          isOpen={isCustomerAuthOpen}
          onClose={() => setIsCustomerAuthOpen(false)}
          onSuccessRedirect={() => setIsCustomerAuthOpen(false)}
        />
        <ToastContainer />
      </div>
    );
  }

  // If authenticated as Customer, render full-screen dedicated Customer Portal
  if (currentRole === 'CUSTOMER') {
    return (
      <div className={`min-h-screen customer-theme-root transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} selection:bg-blue-600 selection:text-white`}>
        <CustomerPortal />
        <ToastContainer />
        <ConfirmModal />
      </div>
    );
  }

  // Render Role-specific Dashboard for Staff/Admin ERP
  const renderDashboard = () => {
    switch (currentRole) {
      case 'ADMIN':
        return <AdminDashboard />;
      case 'MANAGER':
        return <ManagerDashboard />;
      case 'STAFF':
        return <StaffDashboard />;
      case 'TECHNICIAN':
        return <TechnicianDashboard />;
      default:
        return <AdminDashboard />;
    }
  };

  // Main Dynamic View Router
  const renderMainContent = () => {
    switch (currentView) {
      case 'Dashboard':
        return renderDashboard();

      case 'Customers':
        return (
          <CustomerList
            onOpenAddModal={() => {
              setCustomerToEdit(null);
              setIsCustomerModalOpen(true);
            }}
            onOpenEditModal={(cust) => {
              setCustomerToEdit(cust);
              setIsCustomerModalOpen(true);
            }}
          />
        );

      case 'CustomerDetail':
        return (
          <CustomerDetailView
            onBack={() => setCurrentView('Customers')}
            onEditCustomer={(cust) => {
              setCustomerToEdit(cust);
              setIsCustomerModalOpen(true);
            }}
            onAddVehicle={() => {
              setVehicleToEdit(null);
              setIsVehicleModalOpen(true);
            }}
            onAddAppointment={() => setIsAppointmentModalOpen(true)}
            onAddWorkOrder={() => setIsWorkOrderModalOpen(true)}
          />
        );

      case 'Vehicles':
        return (
          <VehicleList
            onOpenAddModal={() => {
              setVehicleToEdit(null);
              setIsVehicleModalOpen(true);
            }}
            onOpenEditModal={(veh) => {
              setVehicleToEdit(veh);
              setIsVehicleModalOpen(true);
            }}
          />
        );

      case 'VehicleDetail':
        return (
          <VehicleDetailView
            onBack={() => setCurrentView('Vehicles')}
            onEditVehicle={(veh) => {
              setVehicleToEdit(veh);
              setIsVehicleModalOpen(true);
            }}
            onAddWorkOrder={() => setIsWorkOrderModalOpen(true)}
            onAddAppointment={() => setIsAppointmentModalOpen(true)}
          />
        );

      case 'Appointments':
        return (
          <AppointmentManager
            onOpenAddModal={() => setIsAppointmentModalOpen(true)}
          />
        );

      case 'Services':
        return (
          <ServiceCatalog
            onOpenAddModal={() => {
              setServiceToEdit(null);
              setIsServiceModalOpen(true);
            }}
            onOpenEditModal={(serv) => {
              setServiceToEdit(serv);
              setIsServiceModalOpen(true);
            }}
          />
        );

      case 'WorkOrders':
        return (
          <WorkOrderList
            onOpenAddModal={() => setIsWorkOrderModalOpen(true)}
          />
        );

      case 'Tasks':
        return <TaskBoardView />;

      case 'WorkOrderDetail':
        return (
          <WorkOrderDetailView
            onBack={() => setCurrentView('WorkOrders')}
            onOpenInvoice={(invId) => {
              // open invoice modal
            }}
          />
        );

      case 'Inventory':
        return (
          <InventoryList
            onOpenAddModal={() => {
              setInventoryToEdit(null);
              setIsInventoryModalOpen(true);
            }}
            onOpenEditModal={(item) => {
              setInventoryToEdit(item);
              setIsInventoryModalOpen(true);
            }}
          />
        );

      case 'Suppliers':
        return <SuppliersView />;

      case 'Technicians':
      case 'TechnicianDetail':
        return (
          <TechnicianList
            onOpenDetailModal={(tech) => setSelectedTechForModal(tech)}
          />
        );

      case 'Invoices':
      case 'InvoiceDetail':
        return (
          <InvoiceList
            onOpenInvoiceDetail={(inv) => setSelectedInvoiceForModal(inv)}
          />
        );

      case 'Payments':
        return <PaymentsView />;

      case 'Reports':
        return <ReportsView />;

      case 'CCTV':
        return <CCTVMonitoringView />;

      case 'Feedback':
        return <FeedbackList />;

      case 'Documents':
        return <DocumentsView />;

      case 'Notifications':
        return <StaffNotificationsView />;

      case 'ActivityLogs':
        return <ActivityLogsView />;

      case 'Users':
        return <UsersView />;

      case 'Permissions':
        return <PermissionsView />;

      case 'Settings':
        return <SettingsView />;

      default:
        return renderDashboard();
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden font-sans antialiased transition-colors duration-200 ${theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar />

        {/* Dynamic Page Workspace */}
        <main className={`flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6 ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
          <div className="max-w-7xl mx-auto">
            {renderMainContent()}
          </div>
        </main>
      </div>

      {/* Global Modals & Dialogs */}
      <GlobalSearchModal />
      <ToastContainer />

      <ConfirmModal />

      {/* Entity Modals */}
      <CustomerFormModal
        isOpen={isCustomerModalOpen}
        onClose={() => {
          setIsCustomerModalOpen(false);
          setCustomerToEdit(null);
        }}
        customerToEdit={customerToEdit}
      />

      <VehicleFormModal
        isOpen={isVehicleModalOpen}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setVehicleToEdit(null);
        }}
        vehicleToEdit={vehicleToEdit}
      />

      <AppointmentFormModal
        isOpen={isAppointmentModalOpen}
        onClose={() => setIsAppointmentModalOpen(false)}
      />

      <ServiceFormModal
        isOpen={isServiceModalOpen}
        onClose={() => {
          setIsServiceModalOpen(false);
          setServiceToEdit(null);
        }}
        serviceToEdit={serviceToEdit}
      />

      <WorkOrderFormModal
        isOpen={isWorkOrderModalOpen}
        onClose={() => setIsWorkOrderModalOpen(false)}
      />

      <InventoryFormModal
        isOpen={isInventoryModalOpen}
        onClose={() => {
          setIsInventoryModalOpen(false);
          setInventoryToEdit(null);
        }}
        itemToEdit={inventoryToEdit}
      />

      <TechnicianDetailModal
        isOpen={!!selectedTechForModal}
        onClose={() => setSelectedTechForModal(null)}
        technician={selectedTechForModal}
      />

      <InvoiceDetailModal
        isOpen={!!selectedInvoiceForModal}
        onClose={() => setSelectedInvoiceForModal(null)}
        invoice={selectedInvoiceForModal}
      />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
