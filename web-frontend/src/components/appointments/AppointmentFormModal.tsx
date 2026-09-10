import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PriorityLevel } from '../../types';
import { Modal } from '../common/Modal';

interface AppointmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AppointmentFormModal: React.FC<AppointmentFormModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addAppointment, customers, vehicles, services, currentUser } = useApp();

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [vehiclePlate, setVehiclePlate] = useState(vehicles[0]?.licensePlate || '');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00 AM');
  const [priority, setPriority] = useState<PriorityLevel>('MEDIUM');
  const [notes, setNotes] = useState('');

  const customerVehicles = vehicles.filter((v) => v.customerId === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selCust = customers.find((c) => c.id === customerId);
    const selVeh = vehicles.find((v) => v.licensePlate === vehiclePlate);
    const selServ = services.find((s) => s.id === serviceId);

    addAppointment({
      customerId,
      customerName: selCust?.name || 'Customer',
      customerPhone: selCust?.phone || '+855 12 000 000',
      vehicleId: selVeh?.id || 'v1',
      vehicleInfo: selVeh ? `${selVeh.brand} ${selVeh.model} (${selVeh.licensePlate})` : vehiclePlate,
      serviceId,
      serviceName: selServ?.name || 'Standard Maintenance',
      date,
      time,
      status: 'SCHEDULED',
      priority,
      notes,
      assignedStaffName: currentUser.name
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Book Service Appointment"
      subtitle="Schedule intake slot and assign preliminary service"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Customer *
          </label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const v = vehicles.find((veh) => veh.customerId === e.target.value);
              if (v) setVehiclePlate(v.licensePlate);
            }}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Customer Vehicle *
          </label>
          <select
            value={vehiclePlate}
            onChange={(e) => setVehiclePlate(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {customerVehicles.length > 0 ? (
              customerVehicles.map((v) => (
                <option key={v.id} value={v.licensePlate}>
                  {v.licensePlate} — {v.brand} {v.model} ({v.year})
                </option>
              ))
            ) : (
              <option value="PP-9999">Custom / Temporary Plate</option>
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Primary Requested Service *
          </label>
          <select
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — ${s.basePrice} ({s.estimatedDurationHours} hrs)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Time Slot *
            </label>
            <select
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="08:00 AM">08:00 AM</option>
              <option value="09:00 AM">09:00 AM</option>
              <option value="10:30 AM">10:30 AM</option>
              <option value="01:30 PM">01:30 PM</option>
              <option value="03:00 PM">03:00 PM</option>
              <option value="04:30 PM">04:30 PM</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Priority Level
          </label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityLevel)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium (Standard)</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent (Breakdown / Tow-in)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Customer Description / Symptoms
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reported noises, warning lights, vibrations, or specific customer requests..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Schedule Booking
          </button>
        </div>
      </form>
    </Modal>
  );
};
