import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Filter,
  Phone,
  Mail,
  Car,
  MoreVertical,
  Edit,
  Trash2,
  Calendar,
  Eye,
  FileSpreadsheet,
  Star,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Customer } from '../../types';

interface CustomerListProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (customer: Customer) => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  onOpenAddModal,
  onOpenEditModal
}) => {
  const {
    customers,
    deleteCustomer,
    viewCustomerDetail,
    vehicles,
    workOrders,
    openConfirmDialog,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'VIP' | 'INACTIVE'>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  const filteredCustomers = customers.filter((cust) => {
    const matchesSearch =
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phone.includes(searchQuery) ||
      cust.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || cust.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (cust: Customer) => {
    openConfirmDialog({
      title: `Delete Customer ${cust.name}?`,
      message: `This will remove the customer record and disassociate their ${cust.vehicleIds?.length || 0} registered vehicles. Are you sure?`,
      variant: 'danger',
      confirmText: 'Delete Record',
      onConfirm: () => {
        deleteCustomer(cust.id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Customer Management</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Directory of clients, contact profiles, vehicle ownership, and billing records.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Export Generated', message: 'Customer directory exported as CSV.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by customer name, telephone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {(['ALL', 'ACTIVE', 'VIP', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                viewMode === 'TABLE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('CARDS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                viewMode === 'CARDS' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Customer Content Display */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">Customer Name</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Vehicles</th>
                  <th className="py-3.5 px-4">Total Spent</th>
                  <th className="py-3.5 px-4">Last Visit</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={cust.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                          alt=""
                          className="w-9 h-9 rounded-xl object-cover ring-2 ring-slate-100"
                        />
                        <div>
                          <p
                            onClick={() => viewCustomerDetail(cust.id)}
                            className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer text-xs"
                          >
                            {cust.name}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono">ID: #{cust.id.toUpperCase()}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-800">{cust.phone}</p>
                      <p className="text-[11px] text-slate-500">{cust.email}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={cust.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <Car className="w-3.5 h-3.5 text-blue-600" />
                        {cust.vehicleIds?.length || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      ${cust.totalSpent.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {cust.lastServiceDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => viewCustomerDetail(cust.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Full Profile"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenEditModal(cust)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Customer"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(cust)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Customer"
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((cust) => (
            <div
              key={cust.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-blue-400 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={cust.avatar}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-slate-100"
                  />
                  <div>
                    <h3
                      onClick={() => viewCustomerDetail(cust.id)}
                      className="text-sm font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer"
                    >
                      {cust.name}
                    </h3>
                    <StatusBadge status={cust.status} size="sm" className="mt-1" />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-600">
                <p className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{cust.phone}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span className="truncate">{cust.email}</span>
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Vehicles: <strong className="text-slate-900 font-mono">{cust.vehicleIds?.length || 0}</strong></span>
                <span className="text-slate-500">Total Spent: <strong className="text-emerald-600 font-mono">${cust.totalSpent}</strong></span>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => viewCustomerDetail(cust.id)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-lg transition-colors"
                >
                  View Dossier →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
