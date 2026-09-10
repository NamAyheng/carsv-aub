import React from 'react';
import {
  Calendar,
  Users,
  Car,
  FileSpreadsheet,
  UserPlus,
  CarFront,
  CalendarPlus,
  FilePlus,
  Clock,
  Phone,
  CheckCircle2,
  AlertCircle,
  ArrowRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { RoleDeskBanner } from '../common/RoleDeskBanner';

interface StaffDashboardProps {
  onOpenCustomerModal?: () => void;
  onOpenVehicleModal?: () => void;
  onOpenAppointmentModal?: () => void;
  onOpenWorkOrderModal?: () => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onOpenCustomerModal,
  onOpenVehicleModal,
  onOpenAppointmentModal,
  onOpenWorkOrderModal
}) => {
  const {
    customers,
    vehicles,
    appointments,
    workOrders,
    setCurrentView,
    updateAppointment,
    viewWorkOrderDetail,
    viewCustomerDetail
  } = useApp();

  const todayDate = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayDate);
  const activeWorkOrders = workOrders.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED');

  const handleCheckIn = (aptId: string) => {
    updateAppointment(aptId, { status: 'IN_PROGRESS' });
  };

  return (
    <div className="space-y-6">
      <RoleDeskBanner />
      {/* 1. TOP BENTO ROW: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div
          onClick={() => setCurrentView('Appointments')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Today's Arrivals</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(todayAppointments.length).padStart(2, '0')}</div>
          <div className="text-xs text-green-600 font-semibold">All on schedule</div>
        </div>

        <div
          onClick={() => setCurrentView('Customers')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Registered Customers</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(customers.length).padStart(2, '0')}</div>
          <div className="text-xs text-blue-600 font-semibold">+4 added this week</div>
        </div>

        <div
          onClick={() => setCurrentView('Vehicles')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Total Fleet Vehicles</span>
            <div className="p-1 rounded bg-green-50 text-green-600">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(vehicles.length).padStart(2, '0')}</div>
          <div className="text-xs text-gray-400">Active client fleet</div>
        </div>

        <div
          onClick={() => setCurrentView('WorkOrders')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Active Work Orders</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-blue-600 my-2">{String(activeWorkOrders.length).padStart(2, '0')}</div>
          <div className="text-xs text-blue-600 font-semibold">In progress & assigned</div>
        </div>
      </div>

      {/* 2. MIDDLE BENTO ROW: Front Desk Schedule & Intake Queue */}
      <div className="grid grid-cols-12 gap-6">
        {/* Today's Appointment Intake Schedule */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                Customer Check-In & Service Schedule
              </h3>
              <p className="text-xs text-gray-400">Client vehicle arrivals scheduled for today</p>
            </div>
            <button
              onClick={() => setCurrentView('Appointments')}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Full Calendar →
            </button>
          </div>

          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div
                key={apt.id}
                className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-gray-50 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex flex-col items-center justify-center font-mono font-bold shrink-0">
                    <span className="text-xs">{apt.time}</span>
                    <span className="text-[9px] text-blue-600 uppercase font-semibold">Today</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-gray-900">{apt.customerName}</h4>
                      <StatusBadge priority={apt.priority} size="sm" />
                      <StatusBadge status={apt.status} size="sm" />
                    </div>
                    <p className="text-xs font-semibold text-gray-700 mt-0.5">{apt.vehicleInfo}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                      <span>Service: <strong>{apt.serviceName}</strong></span>
                      <span>•</span>
                      <span>Assigned: <strong>{apt.assignedStaffName}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:self-center">
                  <a
                    href={`tel:${apt.customerPhone}`}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                    title={`Call ${apt.customerPhone}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  {apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED' ? (
                    <button
                      onClick={() => handleCheckIn(apt.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      Check-In Vehicle
                    </button>
                  ) : (
                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Checked In
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Customer Directory & Quick Actions */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-gray-50 pb-3 mb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                Recent Customers
              </h3>
              <button
                onClick={() => setCurrentView('Customers')}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                All →
              </button>
            </div>

            <div className="space-y-2.5">
              {customers.slice(0, 4).map((cust) => (
                <div
                  key={cust.id}
                  onClick={() => viewCustomerDetail(cust.id)}
                  className="p-2.5 rounded-lg border border-gray-100 bg-gray-50 hover:bg-blue-50/60 cursor-pointer transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <img
                      src={cust.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                        {cust.name}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{cust.phone}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-600 shrink-0" />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 space-y-2">
            <button
              onClick={() => {
                if (onOpenCustomerModal) onOpenCustomerModal();
                else setCurrentView('Customers');
              }}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Register New Customer</span>
            </button>
            <button
              onClick={() => {
                if (onOpenAppointmentModal) onOpenAppointmentModal();
                else setCurrentView('Appointments');
              }}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
