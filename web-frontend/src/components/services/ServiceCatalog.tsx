import React, { useState } from 'react';
import {
  Wrench,
  Search,
  Plus,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  CheckCircle,
  Tag,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ServiceItem } from '../../types';

interface ServiceCatalogProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (service: ServiceItem) => void;
}

export const ServiceCatalog: React.FC<ServiceCatalogProps> = ({
  onOpenAddModal,
  onOpenEditModal
}) => {
  const {
    services,
    deleteService,
    updateService,
    openConfirmDialog,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const categories = Array.from(new Set(services.map((s) => s.category)));

  const filteredServices = services.filter((serv) => {
    const matchesSearch =
      serv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      serv.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || serv.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  const handleDelete = (serv: ServiceItem) => {
    openConfirmDialog({
      title: `Delete Service "${serv.name}"?`,
      message: `Are you sure you want to remove this service from the active repair catalog?`,
      variant: 'danger',
      confirmText: 'Delete Service',
      onConfirm: () => {
        deleteService(serv.id);
      }
    });
  };

  const handleToggleActive = (serv: ServiceItem) => {
    const newStatus = serv.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    updateService(serv.id, { status: newStatus });
    addToast({
      type: 'info',
      title: 'Service Catalog Updated',
      message: `${serv.name} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Disabled'}.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Service & Labor Catalog</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {services.length} Services
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Standardized repair rates, labor hours, maintenance packages, and diagnostic pricing.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Catalog Exported', message: 'Price sheet exported as PDF.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Rate Sheet</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by service title, diagnostic type, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((serv) => (
          <div
            key={serv.id}
            className={`bg-white rounded-2xl p-5 border shadow-xs transition-all flex flex-col justify-between ${
              serv.status === 'ACTIVE' ? 'border-slate-200 hover:border-blue-400' : 'border-slate-200 opacity-60 bg-slate-50/50'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {serv.category}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  serv.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                }`}>
                  {serv.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{serv.name}</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{serv.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Est. Labor Time</span>
                  <span className="font-mono font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {serv.estimatedDurationHours} hrs
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Standard Labor Rate</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm flex items-center gap-0.5 mt-0.5">
                    ${serv.basePrice}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={serv.isActive}
                  onChange={() => handleToggleActive(serv)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                />
                <span>Offered in Shop</span>
              </label>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onOpenEditModal(serv)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Edit Service"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(serv)}
                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete Service"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
