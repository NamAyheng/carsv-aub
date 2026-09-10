import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  Search,
  Plus,
  Clock,
  Car,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Play,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  Filter,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Appointment } from '../../types';

interface AppointmentManagerProps {
  onOpenAddModal: () => void;
}

export const AppointmentManager: React.FC<AppointmentManagerProps> = ({
  onOpenAddModal
}) => {
  const {
    appointments,
    updateAppointment,
    deleteAppointment,
    openConfirmDialog,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch =
      apt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.vehicleInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.customerPhone.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || apt.status === statusFilter;
    const matchesDate = viewMode === 'CALENDAR' ? apt.date === selectedDate : true;

    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleStatusChange = (aptId: string, newStatus: any) => {
    updateAppointment(aptId, { status: newStatus });
    addToast({
      type: 'success',
      title: 'Appointment Updated',
      message: `Status set to ${newStatus}.`
    });
  };

  const handleCancel = (apt: Appointment) => {
    openConfirmDialog({
      title: `Cancel Appointment for ${apt.customerName}?`,
      message: `Are you sure you want to cancel the booking for ${apt.vehicleInfo} on ${apt.date} at ${apt.time}?`,
      variant: 'warning',
      confirmText: 'Cancel Booking',
      onConfirm: () => {
        updateAppointment(apt.id, { status: 'CANCELLED' });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Service Appointments</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {appointments.length} Bookings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Schedule customer arrivals, bay capacity planning, and front desk intake.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Schedule Exported', message: 'Appointment schedule saved as iCal/CSV.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Book Appointment</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer, vehicle plate, phone, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="IN_PROGRESS">Checked In / In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('LIST')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                viewMode === 'LIST' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              List View
            </button>
            <button
              onClick={() => setViewMode('CALENDAR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                viewMode === 'CALENDAR' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Day Schedule
            </button>
          </div>
        </div>
      </div>

      {/* Day Selector for Calendar Mode */}
      {viewMode === 'CALENDAR' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span className="font-bold text-slate-900 text-sm">Schedule for:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1 text-xs bg-slate-50 rounded-lg border border-slate-300 font-mono font-bold"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-3 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg"
            >
              Today
            </button>
          </div>
        </div>
      )}

      {/* Appointments List / Grid */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <CalendarIcon className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="text-base font-bold text-slate-900">No Appointments Found</h3>
            <p className="text-xs text-slate-500 mt-1">There are no bookings matching your current filter criteria.</p>
          </div>
        ) : (
          filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                apt.status === 'CANCELLED' ? 'opacity-60 bg-slate-50/60 border-slate-200' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Time Badge */}
                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 flex flex-col items-center justify-center font-mono font-bold shrink-0">
                  <span className="text-sm">{apt.time}</span>
                  <span className="text-[10px] text-blue-600 font-semibold">{apt.date}</span>
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">{apt.customerName}</h3>
                    <StatusBadge priority={apt.priority} size="sm" />
                    <StatusBadge status={apt.status} size="sm" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">{apt.vehicleInfo}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1 font-medium">
                      Service: <strong className="text-slate-900">{apt.serviceName}</strong>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {apt.customerPhone}
                    </span>
                    <span>•</span>
                    <span>Receptionist: <strong>{apt.assignedStaffName}</strong></span>
                  </div>
                  {apt.notes && (
                    <p className="text-[11px] text-slate-600 italic mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      Notes: {apt.notes}
                    </p>
                  )}
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-2 md:self-center">
                {apt.status === 'SCHEDULED' && (
                  <button
                    onClick={() => handleStatusChange(apt.id, 'CONFIRMED')}
                    className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Confirm Booking
                  </button>
                )}

                {(apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED') && (
                  <button
                    onClick={() => handleStatusChange(apt.id, 'IN_PROGRESS')}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Check In Vehicle
                  </button>
                )}

                {apt.status === 'IN_PROGRESS' && (
                  <button
                    onClick={() => handleStatusChange(apt.id, 'COMPLETED')}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
                  >
                    Mark Finished
                  </button>
                )}

                {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleCancel(apt)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Cancel Appointment"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
