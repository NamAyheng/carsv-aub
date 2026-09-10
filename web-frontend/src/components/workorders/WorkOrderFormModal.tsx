import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PriorityLevel, WorkOrderStatus } from '../../types';
import { Modal } from '../common/Modal';

interface WorkOrderFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WorkOrderFormModal: React.FC<WorkOrderFormModalProps> = ({
  isOpen,
  onClose
}) => {
  const { addWorkOrder, customers, vehicles, technicians } = useApp();

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id || '');
  const [technicianId, setTechnicianId] = useState(technicians[0]?.id || '');
  const [reportedProblem, setReportedProblem] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('MEDIUM');
  const [bayNumber, setBayNumber] = useState<number>(1);
  const [laborCost, setLaborCost] = useState<number>(120);

  const customerVehicles = vehicles.filter((v) => v.customerId === customerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selCust = customers.find((c) => c.id === customerId);
    const selVeh = vehicles.find((v) => v.id === vehicleId) || customerVehicles[0] || vehicles[0];
    const selTech = technicians.find((t) => t.id === technicianId);

    const newWONumber = `WO-${Math.floor(1000 + Math.random() * 9000)}`;

    addWorkOrder({
      workOrderNumber: newWONumber,
      customerId,
      customerName: selCust?.name || 'Customer',
      customerPhone: selCust?.phone || '+855 12 345 678',
      vehicleId: selVeh?.id || 'v1',
      vehicleInfo: `${selVeh?.brand} ${selVeh?.model} (${selVeh?.year})`,
      vehiclePlate: selVeh?.licensePlate || 'PP-1234',
      assignedTechnicianId: technicianId,
      assignedTechnicianName: selTech?.name || 'Lead Technician',
      status: 'ASSIGNED',
      priority,
      reportedProblem: reportedProblem || 'Standard Checkup & Service',
      startDate: new Date().toISOString().split('T')[0],
      estimatedCompletionDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      bayNumber,
      estimatedCost: laborCost,
      actualCost: laborCost,
      laborCost,
      partsCost: 0,
      tasks: [
        {
          id: `t1-${Date.now()}`,
          title: 'Initial Computer Diagnostics Scan',
          description: 'OBD-II full electronic module check',
          estimatedMinutes: 25,
          isCompleted: false,
          status: 'PENDING'
        },
        {
          id: `t2-${Date.now()}`,
          title: 'Safety Inspection & Brake Check',
          description: 'Check brake pads, rotors, and fluid boiling point',
          estimatedMinutes: 30,
          isCompleted: false,
          status: 'PENDING'
        }
      ],
      partsUsed: []
    });

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Repair Work Order"
      subtitle="Dispatch vehicle into workshop bay and assign technician"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Customer Account *
          </label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              const v = vehicles.find((veh) => veh.customerId === e.target.value);
              if (v) setVehicleId(v.id);
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
            Vehicle *
          </label>
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {customerVehicles.length > 0 ? (
              customerVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} — {v.brand} {v.model} ({v.year})
                </option>
              ))
            ) : (
              vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate} — {v.brand} {v.model} ({v.customerName})
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Lead Technician *
            </label>
            <select
              value={technicianId}
              onChange={(e) => setTechnicianId(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.specialization} - {t.level})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Workshop Bay
            </label>
            <select
              value={bayNumber}
              onChange={(e) => setBayNumber(parseInt(e.target.value))}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value={1}>Bay #1 (Heavy Lift)</option>
              <option value={2}>Bay #2 (General Lift)</option>
              <option value={3}>Bay #3 (Alignment & Tires)</option>
              <option value={4}>Bay #4 (Diagnostics & Electrical)</option>
              <option value={5}>Bay #5 (Quick Lube & Detailing)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <option value="HIGH">High Priority</option>
              <option value="URGENT">Urgent (Breakdown / Tow-in)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Initial Labor Estimate ($)
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={laborCost}
              onChange={(e) => setLaborCost(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Reported Problem & Symptoms *
          </label>
          <textarea
            rows={3}
            required
            value={reportedProblem}
            onChange={(e) => setReportedProblem(e.target.value)}
            placeholder="Describe the defect, customer complaints, warning codes, or requested repair tasks..."
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
            Dispatch Work Order
          </button>
        </div>
      </form>
    </Modal>
  );
};
