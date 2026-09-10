import React, { useState } from 'react';
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Car,
  Calendar,
  FileSpreadsheet,
  Receipt,
  Star,
  FileText,
  Plus,
  Edit,
  CarFront,
  CalendarPlus,
  Clock,
  ShieldCheck,
  Download
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { InvoiceKindBadge } from '../invoices/InvoiceDocument';
import { Customer } from '../../types';

interface CustomerDetailViewProps {
  onBack: () => void;
  onEditCustomer: (customer: Customer) => void;
  onAddVehicle: () => void;
  onAddAppointment: () => void;
  onAddWorkOrder: () => void;
}

export const CustomerDetailView: React.FC<CustomerDetailViewProps> = ({
  onBack,
  onEditCustomer,
  onAddVehicle,
  onAddAppointment,
  onAddWorkOrder
}) => {
  const {
    customers,
    selectedCustomerId,
    vehicles,
    appointments,
    workOrders,
    invoices,
    feedbackList,
    documents,
    viewWorkOrderDetail,
    viewVehicleDetail,
    addToast
  } = useApp();

  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'VEHICLES' | 'APPOINTMENTS' | 'WORK_ORDERS' | 'INVOICES' | 'FEEDBACK' | 'DOCS'
  >('OVERVIEW');

  const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0];

  if (!customer) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-600">Customer record not found.</p>
        <button onClick={onBack} className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
          Return to Customers
        </button>
      </div>
    );
  }

  const customerVehicles = vehicles.filter((v) => v.customerId === customer.id);
  const customerAppointments = appointments.filter((a) => a.customerId === customer.id);
  const customerWorkOrders = workOrders.filter((w) => w.customerId === customer.id);
  const customerInvoices = invoices.filter((i) => i.customerId === customer.id);
  const customerFeedback = feedbackList.filter((f) => f.customerId === customer.id);
  const customerDocs = documents.filter((d) => d.category === 'VEHICLE' || d.category === 'INVOICE');

  return (
    <div className="space-y-6">
      {/* Back Button and Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onEditCustomer(customer)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200 shadow-2xs transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
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

      {/* Customer Profile Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <img
            src={customer.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200'}
            alt=""
            className="w-16 h-16 rounded-2xl object-cover ring-4 ring-slate-100 shadow-xs shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900">{customer.name}</h1>
              <StatusBadge status={customer.status} size="sm" />
            </div>
            <p className="text-xs text-slate-500 font-mono mt-0.5">Customer ID: #{customer.id.toUpperCase()}</p>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                {customer.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-600" />
                {customer.email}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {customer.address}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats Block */}
        <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicles</span>
            <span className="text-lg font-bold font-mono text-slate-900">{customerVehicles.length}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Spend</span>
            <span className="text-lg font-bold font-mono text-emerald-600">${customer.totalSpent}</span>
          </div>
          <div className="text-center px-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Repairs</span>
            <span className="text-lg font-bold font-mono text-indigo-600">{customerWorkOrders.length}</span>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs overflow-x-auto">
        {[
          { id: 'OVERVIEW', label: 'Overview', icon: FileText },
          { id: 'VEHICLES', label: 'Vehicles', icon: Car, count: customerVehicles.length },
          { id: 'APPOINTMENTS', label: 'Appointments', icon: Calendar, count: customerAppointments.length },
          { id: 'WORK_ORDERS', label: 'Work Orders', icon: FileSpreadsheet, count: customerWorkOrders.length },
          { id: 'INVOICES', label: 'Invoices & Billing', icon: Receipt, count: customerInvoices.length },
          { id: 'FEEDBACK', label: 'Feedback', icon: Star, count: customerFeedback.length },
          { id: 'DOCS', label: 'Documents', icon: FileText, count: customerDocs.length }
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

      {/* TAB CONTENT: OVERVIEW */}
      {activeTab === 'OVERVIEW' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Demographic & Contact Details</h3>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Full Name</span>
                <span className="font-bold text-slate-900">{customer.name}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Phone Number</span>
                <span className="font-bold text-slate-900">{customer.phone}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Email Address</span>
                <span className="font-bold text-slate-900">{customer.email}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Home / Business Address</span>
                <span className="font-bold text-slate-900 text-right">{customer.address}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-500">Preferred Language</span>
                <span className="font-bold text-slate-900">English, Khmer</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Special Notes & Preferences</h3>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 leading-relaxed">
              {customer.notes || 'Prefers OEM parts for all maintenance. Contact via WhatsApp before starting any additional repairs.'}
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Customer loyalty program: Tier 2 (Gold Status - 5% Labor Discount)</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: VEHICLES */}
      {activeTab === 'VEHICLES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Registered Vehicles ({customerVehicles.length})</h3>
            <button
              onClick={onAddVehicle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-xs"
            >
              <CarFront className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customerVehicles.map((veh) => (
              <div
                key={veh.id}
                onClick={() => viewVehicleDetail(veh.id)}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                      {veh.licensePlate}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">
                      {veh.brand} {veh.model} ({veh.year})
                    </h4>
                  </div>
                  <StatusBadge status={veh.status} size="sm" />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
                  <p>Mileage: <strong className="font-mono">{veh.mileage.toLocaleString()} km</strong></p>
                  <p>Color: <strong>{veh.color}</strong></p>
                  <p>VIN: <strong className="font-mono text-[10px]">{veh.vin}</strong></p>
                  <p>Fuel: <strong>{veh.fuelType}</strong></p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: APPOINTMENTS */}
      {activeTab === 'APPOINTMENTS' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Service Appointments</h3>
            <button
              onClick={onAddAppointment}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-xs"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>Book Appointment</span>
            </button>
          </div>

          <div className="space-y-3">
            {customerAppointments.map((apt) => (
              <div key={apt.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex flex-col items-center justify-center font-mono font-bold">
                    <span>{apt.time}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{apt.serviceName}</h4>
                    <p className="text-slate-500 font-mono">{apt.date} • {apt.vehicleInfo}</p>
                  </div>
                </div>
                <StatusBadge status={apt.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: WORK ORDERS */}
      {activeTab === 'WORK_ORDERS' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Repair History & Work Orders</h3>
          <div className="space-y-3">
            {customerWorkOrders.map((wo) => (
              <div
                key={wo.id}
                onClick={() => viewWorkOrderDetail(wo.id)}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-indigo-700">#{wo.workOrderNumber}</span>
                    <span className="font-bold text-slate-900">{wo.vehicleInfo}</span>
                    <StatusBadge status={wo.status} size="sm" />
                  </div>
                  <p className="text-slate-600 mt-1">{wo.reportedProblem}</p>
                </div>
                <div className="text-right sm:self-center">
                  <span className="font-mono font-bold text-sm text-slate-900">${wo.estimatedCost}</span>
                  <span className="block text-[10px] text-slate-500">Tech: {wo.assignedTechnicianName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: INVOICES */}
      {activeTab === 'INVOICES' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Billing Records & Invoices</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Vehicle</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {customerInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-blue-600">#{inv.invoiceNumber}</td>
                    <td className="py-2.5 px-3">
                      <InvoiceKindBadge invoice={inv} theme="light" />
                    </td>
                    <td className="py-2.5 px-3 font-mono">{inv.issueDate}</td>
                    <td className="py-2.5 px-3 font-semibold">{inv.vehicleInfo || 'Parts counter'}</td>
                    <td className="py-2.5 px-3 font-mono font-bold">${inv.totalAmount}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={inv.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => addToast({ type: 'success', title: 'Invoice Exported', message: 'PDF generated.' })}
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

      {/* TAB CONTENT: FEEDBACK */}
      {activeTab === 'FEEDBACK' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Submitted Ratings</h3>
          <div className="space-y-3">
            {customerFeedback.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    {'★'.repeat(fb.rating)}
                    <span className="text-slate-400 font-normal ml-2 font-mono">{fb.date}</span>
                  </div>
                  <StatusBadge status={fb.status} size="sm" />
                </div>
                <p className="text-slate-700 italic">"{fb.comment}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTS */}
      {activeTab === 'DOCS' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Stored Files & IDs</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {customerDocs.map((doc) => (
              <div key={doc.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{doc.title}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{doc.fileSize} • {doc.uploadDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => addToast({ type: 'info', title: 'File Downloaded', message: doc.title })}
                  className="p-1.5 text-slate-600 hover:text-blue-600 rounded-md"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
