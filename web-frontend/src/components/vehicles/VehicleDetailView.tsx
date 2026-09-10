import React, { useState } from 'react';
import {
  ArrowLeft,
  Car,
  Calendar,
  Wrench,
  FileSpreadsheet,
  Receipt,
  FileText,
  Edit,
  Plus,
  ShieldCheck,
  CheckCircle2,
  Gauge,
  Fuel,
  Activity,
  AlertTriangle,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Vehicle } from '../../types';

interface VehicleDetailViewProps {
  onBack: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  onAddWorkOrder: () => void;
  onAddAppointment: () => void;
}

export const VehicleDetailView: React.FC<VehicleDetailViewProps> = ({
  onBack,
  onEditVehicle,
  onAddWorkOrder,
  onAddAppointment
}) => {
  const {
    vehicles,
    selectedVehicleId,
    workOrders,
    appointments,
    invoices,
    viewWorkOrderDetail,
    viewCustomerDetail,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'SPECS' | 'REPAIRS' | 'APPOINTMENTS' | 'INSPECTION' | 'INVOICES' | 'DOCS'
  >('SPECS');

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  if (!vehicle) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-600">Vehicle dossier not found.</p>
        <button onClick={onBack} className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
          Return to Vehicles
        </button>
      </div>
    );
  }

  const vehicleWorkOrders = workOrders.filter((w) => w.vehicleId === vehicle.id);
  const vehicleAppointments = appointments.filter((a) => a.vehicleInfo.includes(vehicle.licensePlate));
  const vehicleInvoices = invoices.filter((i) => (i.vehicleInfo || i.vehiclePlate || '').includes(vehicle.licensePlate));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Vehicles</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditVehicle(vehicle)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200 shadow-2xs transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Vehicle</span>
          </button>
          <button
            onClick={onAddWorkOrder}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Work Order</span>
          </button>
        </div>
      </div>

      {/* Vehicle Hero Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl border border-blue-200 shadow-xs shrink-0">
            <Car className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-sm px-2.5 py-1 bg-slate-100 text-slate-900 rounded-lg border border-slate-200">
                {vehicle.licensePlate}
              </span>
              <StatusBadge status={vehicle.status} size="sm" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">
              {vehicle.brand} {vehicle.model} ({vehicle.year})
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-0.5">
              VIN: {vehicle.vin} • Owner:{' '}
              <strong
                onClick={() => viewCustomerDetail(vehicle.customerId)}
                className="text-blue-600 hover:underline cursor-pointer"
              >
                {vehicle.customerName}
              </strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Mileage</span>
            <span className="text-lg font-bold font-mono text-slate-900">{vehicle.mileage.toLocaleString()} km</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Repairs</span>
            <span className="text-lg font-bold font-mono text-indigo-600">{vehicleWorkOrders.length}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Next Due</span>
            <span className="text-xs font-bold font-mono text-blue-600">{vehicle.nextServiceDue}</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        {[
          { id: 'SPECS', label: 'Technical Specs', icon: FileText },
          { id: 'REPAIRS', label: 'Repair & Work Orders', icon: Wrench, count: vehicleWorkOrders.length },
          { id: 'APPOINTMENTS', label: 'Appointments', icon: Calendar, count: vehicleAppointments.length },
          { id: 'INSPECTION', label: 'Multi-Point Inspection', icon: ShieldCheck },
          { id: 'INVOICES', label: 'Invoices', icon: Receipt, count: vehicleInvoices.length }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SPECS */}
      {activeTab === 'SPECS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Factory Specifications & Identifiers</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Make / Manufacturer</span>
                <span className="font-bold text-slate-900">{vehicle.brand}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Model Name</span>
                <span className="font-bold text-slate-900">{vehicle.model}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Model Year</span>
                <span className="font-bold font-mono text-slate-900">{vehicle.year}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">License Plate</span>
                <span className="font-bold font-mono text-slate-900">{vehicle.licensePlate}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">VIN (Vehicle Identification No.)</span>
                <span className="font-bold font-mono text-slate-900">{vehicle.vin}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Fuel Type</span>
                <span className="font-bold text-slate-900">{vehicle.fuelType}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Body Color</span>
                <span className="font-bold text-slate-900">{vehicle.color}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Service Intervals & Fleet Notes</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Diagnostic Notes:</span>
                <p className="text-slate-600 leading-relaxed">
                  {vehicle.notes || 'Front right brake pad wear indicator triggered. Recommended brake pad replacement and rotor skimming.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                  <span className="text-[10px] text-blue-700 font-bold uppercase block">Last Service Date</span>
                  <span className="font-bold font-mono text-slate-900 text-xs">{vehicle.lastServiceDate}</span>
                </div>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase block">Next Service Target</span>
                  <span className="font-bold font-mono text-indigo-700 text-xs">{vehicle.nextServiceDue}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REPAIRS */}
      {activeTab === 'REPAIRS' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Repair History & Work Orders</h3>
            <button
              onClick={onAddWorkOrder}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              + Create Work Order
            </button>
          </div>

          <div className="space-y-3">
            {vehicleWorkOrders.map((wo) => (
              <div
                key={wo.id}
                onClick={() => viewWorkOrderDetail(wo.id)}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700">#{wo.workOrderNumber}</span>
                    <StatusBadge status={wo.status} size="sm" />
                    <StatusBadge priority={wo.priority} size="sm" />
                  </div>
                  <p className="text-slate-800 font-semibold mt-1">{wo.reportedProblem}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Assigned Tech: {wo.assignedTechnicianName} • Bay #{wo.bayNumber || 2}</p>
                </div>
                <div className="text-right sm:self-center">
                  <span className="font-mono font-bold text-sm text-slate-900">${wo.estimatedCost}</span>
                  <span className="block text-[10px] text-blue-600 font-bold">Inspect WO →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: APPOINTMENTS */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Service Appointments</h3>
            <button
              onClick={onAddAppointment}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              + Schedule Booking
            </button>
          </div>

          <div className="space-y-3">
            {vehicleAppointments.map((apt) => (
              <div key={apt.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex flex-col items-center justify-center font-mono font-bold">
                    <span>{apt.time}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{apt.serviceName}</h4>
                    <p className="text-slate-500 font-mono">{apt.date}</p>
                  </div>
                </div>
                <StatusBadge status={apt.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MULTI-POINT INSPECTION */}
      {activeTab === 'INSPECTION' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Multi-Point Safety Inspection Report</h3>
              <p className="text-xs text-slate-500">Digital vehicle condition scan logged upon workshop check-in</p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
              Status: PASSED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Fuel Tank Level</span>
              <p className="text-base font-mono font-bold text-slate-900">75% (3/4 Tank)</p>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1">
                <div className="bg-emerald-500 h-full w-3/4 rounded-full" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Front Brake Pads</span>
              <p className="text-base font-mono font-bold text-rose-600">2.5 mm (Worn)</p>
              <span className="text-[10px] text-rose-700 font-bold">⚠ Replacement Required</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Rear Brake Pads</span>
              <p className="text-base font-mono font-bold text-emerald-600">6.8 mm (Good)</p>
              <span className="text-[10px] text-emerald-700 font-bold">✓ Safe Operating Range</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-400 font-bold uppercase text-[10px]">Tire Tread Depth</span>
              <p className="text-base font-mono font-bold text-slate-900">5.2 mm Average</p>
              <span className="text-[10px] text-emerald-700 font-bold">✓ Good Traction</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Billing History for {vehicle.licensePlate}</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {vehicleInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-mono">{inv.issueDate}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">${inv.totalAmount}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => addToast({ type: 'success', title: 'PDF Exported', message: `Invoice #${inv.invoiceNumber}` })}
                        className="px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-bold text-[11px]"
                      >
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
