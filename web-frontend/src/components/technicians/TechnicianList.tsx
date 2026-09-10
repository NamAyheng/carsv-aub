import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Award,
  Wrench,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Technician } from '../../types';

interface TechnicianListProps {
  onOpenDetailModal: (tech: Technician) => void;
}

export const TechnicianList: React.FC<TechnicianListProps> = ({ onOpenDetailModal }) => {
  const { technicians, workOrders, updateTechnician, addToast } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch =
      tech.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tech.phone.includes(searchQuery);

    const matchesStatus = statusFilter === 'ALL' || tech.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (techId: string, newStatus: any) => {
    updateTechnician(techId, { status: newStatus });
    addToast({
      type: 'info',
      title: 'Technician Status Updated',
      message: `Status set to ${newStatus}.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Technicians & Mechanics</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {technicians.length} Specialists
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Workshop labor force, certifications, active bay assignments, and efficiency ratings.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Roster Exported', message: 'Staff roster exported as PDF.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Roster</span>
          </button>
          <button
            onClick={() => addToast({ type: 'info', title: 'New Hire Modal', message: 'Enter mechanic credentials.' })}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Technician</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by mechanic name, specialization (e.g. Engine, Brakes), or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Work Statuses</option>
            <option value="AVAILABLE">Available (Idle)</option>
            <option value="BUSY">Busy (In Bay)</option>
            <option value="OFF_DUTY">Off Duty / Leave</option>
          </select>
        </div>
      </div>

      {/* Technician Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTechnicians.map((tech) => {
          const activeJobs = workOrders.filter(
            (w) => w.assignedTechnicianId === tech.id && w.status === 'IN_PROGRESS'
          );

          return (
            <div
              key={tech.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-blue-400 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={tech.avatar}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover ring-2 ring-slate-100"
                    />
                    <div>
                      <h3
                        onClick={() => onOpenDetailModal(tech)}
                        className="text-sm font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        {tech.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                          {tech.level}
                        </span>
                        <span className="text-xs text-amber-500 font-bold flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-amber-400" />
                          {tech.rating}
                        </span>
                      </div>
                    </div>
                  </div>
                  <StatusBadge status={tech.status} size="sm" />
                </div>

                <div className="space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    <span>Specialty: <strong className="text-slate-900">{tech.specialization}</strong></span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{tech.phone}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Labor Rate: <strong className="font-mono text-emerald-600">${tech.hourlyRate}/hr</strong></span>
                  </p>
                </div>

                {/* Active Job status box */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Active Bay Jobs:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {activeJobs.length} In Progress
                    </span>
                  </div>
                  {activeJobs.length > 0 && (
                    <p className="text-[10px] text-blue-600 font-mono mt-1 truncate">
                      Current: #{activeJobs[0].workOrderNumber} ({activeJobs[0].vehiclePlate})
                    </p>
                  )}
                </div>
              </div>

              {/* Bottom Quick Action */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <select
                  value={tech.status}
                  onChange={(e) => handleStatusChange(tech.id, e.target.value)}
                  className="text-xs font-semibold px-2.5 py-1 bg-slate-50 rounded-lg border border-slate-200 focus:outline-hidden"
                >
                  <option value="AVAILABLE">Set Available</option>
                  <option value="BUSY">Set Busy</option>
                  <option value="OFF_DUTY">Set Off Duty</option>
                </select>

                <button
                  onClick={() => onOpenDetailModal(tech)}
                  className="px-3 py-1 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold transition-colors"
                >
                  Mechanic Profile →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
