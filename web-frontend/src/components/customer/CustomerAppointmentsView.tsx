import React, { useEffect, useState } from 'react';
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
import {
  addBookingService,
  createCustomerPartRequest,
  CustomerPartRequestRow,
  listCustomerPartRequests,
} from '../../api/garage';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { appointmentStatusTone, softStatusBadge, softStatusButton } from '../../utils/customerStatusTone';
import { Appointment } from '../../types';

interface CustomerAppointmentsViewProps {
  onOpenBookAppointment: () => void;
  onTrackWorkOrder?: (workOrderId: string) => void;
}

export const CustomerAppointmentsView: React.FC<CustomerAppointmentsViewProps> = ({
  onOpenBookAppointment,
  onTrackWorkOrder
}) => {
  const {
    appointments,
    services,
    inventory,
    currentUser,
    updateAppointment,
    cancelAppointment,
    addToast,
    liveCustomer,
    refreshCustomerPortal,
  } = useApp();
  const [extraServiceId, setExtraServiceId] = useState('');
  const [addingService, setAddingService] = useState(false);
  const [extraPartId, setExtraPartId] = useState('');
  const [addingPart, setAddingPart] = useState(false);
  const [partRequests, setPartRequests] = useState<CustomerPartRequestRow[]>([]);

  const [activeTab, setActiveTab] = useState<'UPCOMING' | 'TODAY' | 'COMPLETED' | 'CANCELLED' | 'ALL'>('UPCOMING');
  const [selectedAppointmentDetails, setSelectedAppointmentDetails] = useState<Appointment | null>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<Appointment | null>(null);

  const refreshPartRequests = async () => {
    try {
      const rows = await listCustomerPartRequests();
      setPartRequests(rows);
    } catch {
      setPartRequests([]);
    }
  };

  useEffect(() => {
    let cancelled = false;
    listCustomerPartRequests()
      .then((rows) => {
        if (!cancelled) setPartRequests(rows);
      })
      .catch(() => {
        if (!cancelled) setPartRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [appointments?.length, selectedAppointmentDetails?.id]);

  // Keep open details in sync with portal appointments (services list after refresh).
  useEffect(() => {
    if (!selectedAppointmentDetails) return;
    const fresh = (appointments || []).find((row) => row.id === selectedAppointmentDetails.id);
    if (!fresh) return;
    const sameServices =
      JSON.stringify(fresh.services || []) === JSON.stringify(selectedAppointmentDetails.services || []) &&
      fresh.serviceName === selectedAppointmentDetails.serviceName;
    if (!sameServices) {
      setSelectedAppointmentDetails(fresh);
    }
  }, [appointments, selectedAppointmentDetails]);

  const openAppointmentDetails = (apt: Appointment) => {
    const fresh = (appointments || []).find((row) => row.id === apt.id) || apt;
    setSelectedAppointmentDetails(fresh);
    setExtraServiceId('');
    setExtraPartId('');
    void refreshPartRequests();
  };
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

  const slotTaken = (vehicleId: string, date: string, time: string, ignoreId?: string) =>
    (appointments || []).some(
      (item) =>
        item.id !== ignoreId &&
        item.vehicleId === vehicleId &&
        item.date === date &&
        (item.time || '').slice(0, 5) === time &&
        item.status !== 'CANCELLED'
    );

  const canReschedule = (apt: Appointment) => apt.status === 'SCHEDULED' || apt.status === 'CONFIRMED';
  const canCancel = (apt: Appointment) => canReschedule(apt);
  const canTrack = (apt: Appointment) => Boolean(apt.workOrderNumber);

  const handleConfirmReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleAppointment || !newDate) return;
    if (slotTaken(rescheduleAppointment.vehicleId, newDate, newTime, rescheduleAppointment.id)) {
      addToast({
        type: 'error',
        title: 'Time already booked',
        message: 'That vehicle already has a booking at this time.',
      });
      return;
    }

    updateAppointment(rescheduleAppointment.id, {
      date: newDate,
      time: newTime,
      status: 'SCHEDULED'
    });

    if (!liveCustomer) {
      addToast({
        type: 'success',
        title: 'Appointment Rescheduled',
        message: `Your booking is now moved to ${newDate} at ${newTime}.`
      });
    }

    setRescheduleAppointment(null);
  };

  const getStatusBadge = (status: Appointment['status'], label?: string) => {
    const text =
      label ||
      (status === 'CONFIRMED'
        ? 'Confirmed'
        : status === 'IN_PROGRESS'
          ? 'In progress'
          : status === 'COMPLETED'
            ? 'Completed'
            : status === 'CANCELLED'
              ? 'Cancelled'
              : 'Scheduled');
    return (
      <span className={softStatusBadge(appointmentStatusTone(status, label || text))}>{text}</span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 p-4 sm:p-6 rounded-3xl border border-slate-800 min-w-0">
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
      <div className="tab-scroll border border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl">
        {(
          [
            { id: 'ALL', label: 'All' },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'TODAY', label: 'Today' },
            { id: 'COMPLETED', label: 'Completed' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-12 text-center space-y-3">
          <Calendar className="w-12 h-12 text-slate-400 mx-auto" />
          <h4 className="text-base font-bold text-white">
            No {activeTab === 'ALL' ? '' : `${activeTab.toLowerCase()} `}appointments found
          </h4>
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
                  {getStatusBadge(apt.status, apt.statusLabel)}
                </div>

                <h3 className="text-base font-bold text-white mb-1">{apt.serviceName}</h3>
                <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-2">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                {apt.workOrderNumber && (
                  <p className="text-[11px] text-slate-400 mb-1">{apt.workOrderNumber}{apt.assignedStaffName ? ` · ${apt.assignedStaffName}` : ''}</p>
                )}
                  <span>{apt.vehicleInfo}</span>
                </div>

                <p className="text-xs text-slate-400 bg-slate-950/60 p-3 rounded-xl border border-slate-800 line-clamp-2">
                  <strong className="text-slate-300">Symptoms:</strong> {apt.problemDescription || 'Routine checkup'}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <button
                  onClick={() => openAppointmentDetails(apt)}
                  className="text-xs text-slate-400 hover:text-white font-semibold py-2 px-2.5 min-h-9 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  View Details
                </button>

                <div className="flex flex-wrap items-center justify-end gap-2">
                  {canTrack(apt) && onTrackWorkOrder && (
                    <button
                      type="button"
                      onClick={() => onTrackWorkOrder(apt.workOrderNumber || apt.id)}
                      className={softStatusButton('green')}
                    >
                      Track
                    </button>
                  )}
                  {(canReschedule(apt) || canCancel(apt)) && (
                    <>
                      {canReschedule(apt) && (
                      <button
                        onClick={() => {
                          setRescheduleAppointment(apt);
                          setNewDate(apt.date);
                          setNewTime(apt.time);
                        }}
                        className={softStatusButton('blue')}
                      >
                        Reschedule
                      </button>
                      )}
                      {canCancel(apt) && (
                      <button
                        onClick={() => {
                          setCancelTarget(apt);
                          setCancelReason('');
                        }}
                        className={softStatusButton('red')}
                      >
                        Cancel
                      </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            onSubmit={handleCancelAppointment}
            className="relative w-full max-w-md bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[min(92dvh,90vh)] overflow-y-auto"
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl p-4 sm:p-6 space-y-4 max-h-[min(92dvh,90vh)] overflow-y-auto">
            <div className="flex justify-between items-center gap-3">
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
          <div className="relative w-full max-w-lg max-h-[min(90vh,720px)] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex justify-between items-center px-6 pt-6 pb-3 border-b border-slate-800 shrink-0">
              <div>
                <h3 className="text-base font-bold text-white">Appointment Details</h3>
                <span className="text-xs text-slate-400 font-mono">ID: {selectedAppointmentDetails.id}</span>
              </div>
              <button
                onClick={() => {
                  setSelectedAppointmentDetails(null);
                  setExtraPartId('');
                  setExtraServiceId('');
                }}
                className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 py-4 space-y-3 text-xs">
              <div className="py-1.5 border-b border-slate-800/80 space-y-1">
                <span className="text-slate-400">Services on this visit:</span>
                {(selectedAppointmentDetails.services && selectedAppointmentDetails.services.length > 0
                  ? selectedAppointmentDetails.services
                  : [{ id: null, name: selectedAppointmentDetails.serviceName, price: 0, primary: true }]
                ).map((item, index) => (
                  <div key={item.id != null ? `svc-${item.id}` : `${item.name}-${index}`} className="flex justify-between text-white font-bold">
                    <span>
                      {item.name}
                      {item.primary ? (
                        <span className="ml-1.5 text-[10px] font-semibold text-slate-500">main</span>
                      ) : null}
                    </span>
                    {item.price > 0 && <span>${item.price.toFixed(2)}</span>}
                  </div>
                ))}
                {selectedAppointmentDetails.status !== 'CANCELLED' && selectedAppointmentDetails.status !== 'COMPLETED' && (
                  <form
                    className="pt-2 space-y-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!extraServiceId || addingService) return;
                      setAddingService(true);
                      try {
                        const updated = await addBookingService(selectedAppointmentDetails.id, extraServiceId);
                        await refreshCustomerPortal();
                        const mappedServices = (updated.services || []).map((item) => ({
                          id: item.id == null ? null : Number(item.id),
                          name: item.name,
                          price: Number(item.price) || 0,
                          primary: Boolean(item.primary),
                        }));
                        setSelectedAppointmentDetails((current) =>
                          current
                            ? {
                                ...current,
                                serviceName:
                                  mappedServices.map((row) => row.name).join(', ') || current.serviceName,
                                services: mappedServices,
                              }
                            : current
                        );
                        setExtraServiceId('');
                        addToast({
                          type: 'success',
                          title: 'Service added to this visit',
                          message: 'It stays on the same appointment. The garage sees it on that booking.',
                        });
                      } catch (error) {
                        addToast({
                          type: 'error',
                          title: 'Service was not added',
                          message: error instanceof Error ? error.message : 'Try again.',
                        });
                      } finally {
                        setAddingService(false);
                      }
                    }}
                  >
                    <label className="block text-[11px] font-semibold text-slate-400">Add another service</label>
                    <div className="flex gap-2">
                      <select
                        value={extraServiceId}
                        onChange={(event) => setExtraServiceId(event.target.value)}
                        className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                      >
                        <option value="">Choose a service</option>
                        {(services || [])
                          .filter((item) => item.status === 'ACTIVE' && item.bookable !== false)
                          .filter((item) => item.id !== selectedAppointmentDetails.serviceId)
                          .filter(
                            (item) =>
                              !(selectedAppointmentDetails.services || []).some(
                                (row) => row.name === item.name || String(row.id) === item.id
                              )
                          )
                          .map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name} · ${(item.estimatedTotal ?? item.basePrice).toFixed(2)}
                            </option>
                          ))}
                      </select>
                      <button type="submit" disabled={addingService} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
                        {addingService ? 'Adding…' : 'Add'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
              {(() => {
                const visitParts = partRequests.filter((row) => row.bookingId === selectedAppointmentDetails.id);
                return (
                  <div className="py-1.5 border-b border-slate-800/80 space-y-1">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Workshop parts on this booking:</span>
                      {visitParts.length === 0 && <span className="font-mono text-slate-500">$0.00</span>}
                    </div>
                    {visitParts.map((row) => (
                      <div key={row.id} className="flex justify-between text-white font-bold gap-3">
                        <span>
                          {row.productName}
                          <span className="block text-[10px] font-mono font-normal text-slate-500">
                            {row.number} · {row.status}
                          </span>
                        </span>
                        <span>${row.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {selectedAppointmentDetails.status !== 'CANCELLED' && selectedAppointmentDetails.status !== 'COMPLETED' && (
                      <form
                        className="pt-2 space-y-2"
                        onSubmit={async (event) => {
                          event.preventDefault();
                          if (!extraPartId || addingPart) return;
                          setAddingPart(true);
                          try {
                            const saved = await createCustomerPartRequest({
                              sparePartId: extraPartId,
                              vehicleId: selectedAppointmentDetails.vehicleId,
                              bookingId: selectedAppointmentDetails.id,
                              fulfillment: 'INSTALL_IN_WORKSHOP',
                            });
                            await refreshPartRequests();
                            setExtraPartId('');
                            await refreshCustomerPortal();
                            addToast({
                              type: 'success',
                              title: 'Part added to this visit',
                              message: `${saved.productName} is on the booking. Stock stays on the shelf until the garage issues it.`,
                            });
                          } catch (error) {
                            addToast({
                              type: 'error',
                              title: 'Part was not added',
                              message: error instanceof Error ? error.message : 'Try again.',
                            });
                          } finally {
                            setAddingPart(false);
                          }
                        }}
                      >
                        <label className="block text-[11px] font-semibold text-slate-400">Add more parts</label>
                        <div className="flex gap-2">
                          <select
                            value={extraPartId}
                            onChange={(event) => setExtraPartId(event.target.value)}
                            className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                          >
                            <option value="">Choose a part</option>
                            {(inventory || [])
                              .filter((part) => part.stockQuantity > 0)
                              .filter(
                                (part) =>
                                  !partRequests.some(
                                    (row) =>
                                      row.bookingId === selectedAppointmentDetails.id &&
                                      row.sku === part.sku &&
                                      !row.issued
                                  )
                              )
                              .map((part) => (
                                <option key={part.id} value={part.id}>
                                  {part.name} · ${part.unitPrice.toFixed(2)}
                                </option>
                              ))}
                          </select>
                          <button type="submit" disabled={addingPart} className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
                            {addingPart ? 'Adding…' : 'Add'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })()}
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
                <span className="text-blue-400 font-bold">{selectedAppointmentDetails.assignedStaffName || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Status:</span>
                <div>{getStatusBadge(selectedAppointmentDetails.status, selectedAppointmentDetails.statusLabel)}</div>
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

            <div className="shrink-0 border-t border-slate-800 px-6 py-4 flex justify-end bg-slate-900">
              <button
                type="button"
                onClick={() => {
                  setSelectedAppointmentDetails(null);
                  setExtraPartId('');
                  setExtraServiceId('');
                }}
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
