import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Car,
  User,
  Clock,
  DollarSign,
  Wrench,
  ChevronRight,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { WorkOrder, WorkOrderStatus, PriorityLevel } from '../../types';

interface WorkOrderListProps {
  onOpenAddModal: () => void;
}

export const WorkOrderList: React.FC<WorkOrderListProps> = ({ onOpenAddModal }) => {
  const {
    workOrders,
    viewWorkOrderDetail,
    deleteWorkOrder,
    openConfirmDialog,
    addToast,
    currentRole
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');

  const filteredWorkOrders = workOrders.filter((wo) => {
    const matchesSearch =
      wo.workOrderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.vehicleInfo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.vehiclePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wo.reportedProblem.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || wo.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleDelete = (wo: WorkOrder) => {
    openConfirmDialog({
      title: `Delete Work Order #${wo.workOrderNumber}?`,
      message: `Are you sure you want to delete this repair order for ${wo.vehicleInfo}? All associated tasks will be removed.`,
      variant: 'danger',
      confirmText: 'Delete Order',
      onConfirm: () => {
        deleteWorkOrder(wo.id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Repair Work Orders</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {workOrders.length} Orders
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Repair jobs for the workshop. Mechanic task cards live on the Task board.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Work Orders Exported', message: 'Report generated as CSV.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
          {currentRole !== 'TECHNICIAN' && (
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Work Order</span>
          </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by WO#, customer, vehicle plate, or problem..."
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
            <option value="PENDING">Pending</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="QUALITY_CHECK">Quality Check</option>
            <option value="COMPLETED">Completed</option>
            <option value="DELIVERED">Delivered / Handed Over</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
      </div>

      {/* Work Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">WO Number</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Vehicle</th>
                <th className="py-3.5 px-4">Technician & Bay</th>
                <th className="py-3.5 px-4">Priority</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Est. Cost</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredWorkOrders.map((wo) => (
                <tr key={wo.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => viewWorkOrderDetail(wo.id)}
                      className="font-mono font-bold text-xs text-blue-600 hover:underline hover:text-blue-800"
                    >
                      #{wo.workOrderNumber}
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono">{wo.createdAt}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-slate-900">{wo.customerName}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{wo.reportedProblem}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-900">{wo.vehicleInfo}</p>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {wo.vehiclePlate}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-medium text-slate-800">{wo.assignedTechnicianName}</p>
                    <span className="text-[10px] text-indigo-600 font-bold">Bay {wo.cctvBayId ? '#02' : '#01'}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge priority={wo.priority} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={wo.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    ${wo.estimatedCost}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => viewWorkOrderDetail(wo.id)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 rounded-lg text-xs font-bold transition-colors inline-flex items-center gap-1"
                    >
                      <span>Open Workspace</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(wo)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete Order"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
