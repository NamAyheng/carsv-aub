import React from 'react';
import { useApp } from '../../context/AppContext';
import { Technician } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { Award, Phone, Mail, Clock, DollarSign, Star, Wrench, CheckCircle } from 'lucide-react';

interface TechnicianDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician?: Technician | null;
}

export const TechnicianDetailModal: React.FC<TechnicianDetailModalProps> = ({
  isOpen,
  onClose,
  technician
}) => {
  const { workOrders, viewWorkOrderDetail } = useApp();

  if (!technician) return null;

  const techWorkOrders = workOrders.filter((w) => w.assignedTechnicianId === technician.id);
  const completedJobs = techWorkOrders.filter((w) => w.status === 'COMPLETED' || w.status === 'DELIVERED').length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Mechanic & Technician Profile"
      subtitle="Credentials, bay assignments, and repair efficiency metrics"
    >
      <div className="space-y-5">
        {/* Header Profile */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <img
            src={technician.avatar}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500 shadow-xs"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">{technician.name}</h3>
              <StatusBadge status={technician.status} size="sm" />
            </div>
            <p className="text-xs font-bold text-blue-600 mt-0.5">{technician.specialization} Specialist</p>
            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
              <span>Grade: <strong className="text-slate-900">{technician.level}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-500 font-bold">
                <Star className="w-3 h-3 fill-amber-400" />
                {technician.rating} / 5.0
              </span>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Jobs Handled</span>
            <span className="text-base font-bold font-mono text-slate-900">{techWorkOrders.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed</span>
            <span className="text-base font-bold font-mono text-emerald-600">{completedJobs}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Shop Labor Rate</span>
            <span className="text-base font-bold font-mono text-blue-600">${technician.hourlyRate}/h</span>
          </div>
        </div>

        {/* Contact info */}
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1.5">
          <p className="flex items-center justify-between">
            <span className="text-slate-500">Contact Number</span>
            <span className="font-bold text-slate-900">{technician.phone}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-slate-500">Email Address</span>
            <span className="font-bold text-slate-900">{technician.email}</span>
          </p>
          <p className="flex items-center justify-between">
            <span className="text-slate-500">ASE / OEM Certification</span>
            <span className="font-bold text-emerald-600">ASE Master Tech Certified</span>
          </p>
        </div>

        {/* Recent Work Orders List */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Assigned Work Orders</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {techWorkOrders.map((wo) => (
              <div
                key={wo.id}
                onClick={() => {
                  onClose();
                  viewWorkOrderDetail(wo.id);
                }}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 cursor-pointer transition-all flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-mono font-bold text-blue-600">#{wo.workOrderNumber}</span>
                  <p className="text-slate-800 font-medium">{wo.vehicleInfo} ({wo.vehiclePlate})</p>
                </div>
                <StatusBadge status={wo.status} size="sm" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Close Profile
          </button>
        </div>
      </div>
    </Modal>
  );
};
