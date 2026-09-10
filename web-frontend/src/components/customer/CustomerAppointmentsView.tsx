import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Car,
  Wrench,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { Appointment } from '../../types';

interface CustomerAppointmentsViewProps {
  onOpenBookAppointment: () => void;
  onTrackWorkOrder?: (workOrderId: string) => void;
}

export const CustomerAppointmentsView: React.FC<CustomerAppointmentsViewProps> = ({
  onOpenBookAppointment,
  onTrackWorkOrder
}) => {
  const { appointments, currentUser, updateAppointment, cancelAppointment, addToast } = useApp();

  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'TODAY' | 'COMPLETED' | 'CANCELLED'>('UPCOMING');
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('10:15');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filter appointments for customer
  const customerAppointments = (appointments || []).filter((a) => belongsToCurrentCustomer(currentUser, a));

  const filteredAppointments = customerAppointments.filter((a) => {
    if (activeTab === 'TODAY') return a.date === todayStr;
    if (activeTab === 'UPCOMING') return a.date >= todayStr && a.status !== 'CANCELLED' && a.status !== 'COMPLETED';
    if (activeTab === 'COMPLETED') return a.status === 'COMPLETED';
    if (activeTab === 'CANCELLED') return a.status === 'CANCELLED';
    return true;
  });

  const handleCancelAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget) return;
    if (!cancelReason.trim()) {
      addToast({ type: 'error', title: 'Cancellation reason required', message: 'Please enter why you are cancelling this booking.' });
      return;
    }
    cancelAppointment(cancelTarget.id, cancelReason.trim());
    setCancelTarget(null);
    setCancelReason('');
  };

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAppointment || !newDate) return;

    updateAppointment(rescheduleAppointment.id, {
      date: newDate,
      time: newTime,
      status: 'SCHEDULED'
    });

    addToast({
      type: 'success',
      title: 'Appointment Rescheduled',
      message: `Your booking is now moved to ${newDate} at ${newTime}.`
    });

    setRescheduleAppointment(null);
  };

  const getStatusBadge = (status: Appointment['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Confirmed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">In Progress</span>;
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">Completed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30">Cancelled</span>;
      default:
        return <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">Scheduled</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Calendar className="w-6 h-6 text-blue-500" />
            <span>My Service Appointments</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track scheduled garage check-ins, view assigned technician bays, and manage reservations.
          </p>
        </div>

        <button
          onClick={onOpenBookAppointment}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl gap-2">
        {(['UPCOMING', 'TODAY', 'COMPLETED', 'CANCELLED'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === tab
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No {activeTab.toLowerCase()} appointments found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Need to schedule an oil service, brake check, or vehicle diagnostic?
          </p>
          <button
            onClick={onOpenBookAppointment}
            className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold mt-2"
          >
            Book an Appointment
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAppointments.map((apt) => (
            <div
              key={apt.id}
              className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span>{apt.date}</span>
                    <span>•</span>
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{apt.time}</span>
                  </div>
                  {getStatusBadge(apt.status)}
                </div>

                <h3 className="text-base font-bold text-white mb-1">{apt.serviceName}</h3>
                <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-2">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span>{apt.vehicleInfo}</span>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 line-clamp-2">
                  <strong className="text-slate-300">Symptoms:</strong> {apt.problemDescription || 'Routine checkup'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedAppointmentDetails(apt)}
                  className="text-xs text-slate-400 hover:text-white font-semibold py-1 px-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  View Details
                </button>

                <div className="flex items-center gap-2">
                  {apt.status !== 'CANCELLED' && apt.status !== 'COMPLETED' && (
                    <>
                      <button
                        onClick={() => {
                          setRescheduleAppointment(apt);
                          setNewDate(apt.date);
                          setNewTime(apt.time);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold py-1.5 px-3 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 transition-all"
                      >
                        Reschedule
                      </button>
                      <button
                        onClick={() => {
                          setCancelTarget(apt);
                          setCancelReason('');
                        }}
                        className="text-xs text-red-400 hover:text-red-300 font-bold py-1.5 px-3 rounded-lg bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 transition-all"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleCancelAppointment}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Cancel booking</h3>
              <button type="button" onClick={() => setCancelTarget(null)} className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              {cancelTarget.serviceName} on {cancelTarget.date} at {cancelTarget.time}. A cancellation reason is required.
            </p>
            <textarea
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="e.g. Need a different date / car is not available"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="px-4 py-2 text-xs text-slate-400">
                Keep booking
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">
                Confirm cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 1: RESCHEDULE APPOINTMENT */}
      {rescheduleAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Reschedule Appointment</h3>
              <button
                onClick={() => setRescheduleAppointment(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReschedule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  min={todayStr}
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Time Slot</label>
                <select
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                >
                  <option value="08:00">08:00 AM</option>
                  <option value="09:30">09:30 AM</option>
                  <option value="10:15">10:15 AM</option>
                  <option value="13:30">01:30 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:30">04:30 PM</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRescheduleAppointment(null)}
                  className="px-4 py-2 text-xs text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-lg"
                >
                  Confirm New Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: APPOINTMENT DETAILS */}
      {selectedAppointmentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">Appointment Details</h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedAppointmentDetails.id}</span>
              </div>
              <button
                onClick={() => setSelectedAppointmentDetails(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Service:</span>
                <span className="text-white font-bold">{selectedAppointmentDetails.serviceName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Vehicle:</span>
                <span className="text-white font-bold">{selectedAppointmentDetails.vehicleInfo}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Date & Time:</span>
                <span className="text-white font-bold">{selectedAppointmentDetails.date} at {selectedAppointmentDetails.time}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Assigned Technician:</span>
                <span className="text-blue-400 font-bold">{selectedAppointmentDetails.assignedStaffName || 'Dara Kim'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Status:</span>
                <div>{getStatusBadge(selectedAppointmentDetails.status)}</div>
              </div>
              <div className="py-2">
                <span className="text-slate-400 block mb-1">Reported Symptoms:</span>
                <p className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                  {selectedAppointmentDetails.problemDescription || 'Routine checkup and factory maintenance.'}
                </p>
              </div>
              {selectedAppointmentDetails.status === 'CANCELLED' && (
                <div className="py-2">
                  <span className="text-slate-400 block mb-1">Cancellation:</span>
                  <p className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                    {selectedAppointmentDetails.cancellationReason || 'No reason stored'}
                    {selectedAppointmentDetails.cancelledAt ? ` · ${selectedAppointmentDetails.cancelledAt}` : ''}
                    {selectedAppointmentDetails.cancelledBy ? ` · ${selectedAppointmentDetails.cancelledBy}` : ''}
                  </p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAppointmentDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
