import React, { useState } from 'react';
import {
  Car,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Wrench,
  Fuel,
  Gauge,
  User,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Vehicle } from '../../types';

interface VehicleListProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (vehicle: Vehicle) => void;
}

export const VehicleList: React.FC<VehicleListProps> = ({
  onOpenAddModal,
  onOpenEditModal
}) => {
  const {
    vehicles,
    deleteVehicle,
    viewVehicleDetail,
    viewCustomerDetail,
    openConfirmDialog,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [brandFilter, setBrandFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');

  const uniqueBrands = Array.from(new Set(vehicles.map((v) => v.brand)));

  const filteredVehicles = vehicles.filter((veh) => {
    const matchesSearch =
      veh.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      veh.customerName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBrand = brandFilter === 'ALL' || veh.brand === brandFilter;
    const matchesStatus = statusFilter === 'ALL' || veh.status === statusFilter;

    return matchesSearch && matchesBrand && matchesStatus;
  });

  const handleDelete = (veh: Vehicle) => {
    openConfirmDialog({
      title: `Delete Vehicle ${veh.licensePlate}?`,
      message: `Are you sure you want to remove the ${veh.year} ${veh.brand} ${veh.model} from garage records?`,
      variant: 'danger',
      confirmText: 'Delete Vehicle',
      onConfirm: () => {
        deleteVehicle(veh.id);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Vehicle Fleet & Registry</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {vehicles.length} Vehicles
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive dossier of customer vehicles, specs, mileage, and active repairs.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Export Generated', message: 'Vehicle registry exported as CSV.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Registry</span>
          </button>
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by license plate (e.g. PP-1234), brand, VIN, or owner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Makes / Brands</option>
            {uniqueBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="READY">Ready / Normal</option>
            <option value="IN_PROGRESS">In Repair (Bay)</option>
            <option value="INSPECTION">Inspection</option>
          </select>

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

      {/* Vehicles Table or Grid */}
      {viewMode === 'TABLE' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">License Plate</th>
                  <th className="py-3.5 px-4">Vehicle Make & Model</th>
                  <th className="py-3.5 px-4">Owner / Customer</th>
                  <th className="py-3.5 px-4">Mileage</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Next Service</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVehicles.map((veh) => (
                  <tr key={veh.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        onClick={() => viewVehicleDetail(veh.id)}
                        className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg border border-slate-200 hover:border-blue-500 hover:text-blue-600 cursor-pointer"
                      >
                        {veh.licensePlate}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{veh.brand} {veh.model} ({veh.year})</p>
                      <p className="text-[10px] text-slate-400 font-mono">VIN: {veh.vin}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <p
                        onClick={() => viewCustomerDetail(veh.customerId)}
                        className="font-semibold text-slate-900 hover:text-blue-600 cursor-pointer"
                      >
                        {veh.customerName}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800">
                      {veh.mileage.toLocaleString()} km
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={veh.status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      {veh.nextServiceDue}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => viewVehicleDetail(veh.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Dossier"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenEditModal(veh)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Vehicle"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(veh)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Vehicle"
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
          {filteredVehicles.map((veh) => (
            <div
              key={veh.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 hover:border-blue-400 transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono font-bold text-xs px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg border border-slate-200">
                    {veh.licensePlate}
                  </span>
                  <h3
                    onClick={() => viewVehicleDetail(veh.id)}
                    className="text-base font-bold text-slate-900 group-hover:text-blue-600 cursor-pointer mt-2"
                  >
                    {veh.brand} {veh.model} ({veh.year})
                  </h3>
                </div>
                <StatusBadge status={veh.status} size="sm" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                <p>Owner: <strong className="text-slate-900">{veh.customerName}</strong></p>
                <p>Mileage: <strong className="font-mono">{veh.mileage.toLocaleString()} km</strong></p>
                <p>Color: <strong>{veh.color}</strong></p>
                <p>Fuel: <strong>{veh.fuelType}</strong></p>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                <button
                  onClick={() => viewVehicleDetail(veh.id)}
                  className="px-3 py-1.5 bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Vehicle Dossier →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
