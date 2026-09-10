import React from 'react';
import {
  Car,
  Calendar,
  Wrench,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Plus,
  Clock,
  Video,
  FileText,
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Package,
  Camera
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { invoiceRemaining, remindersFromVehicles } from '../../utils/garageLogic';

import brakePadsImg from '../../assets/images/ceramic_brake_pads_1788665394851.jpg';
import engineOilImg from '../../assets/images/synthetic_motor_oil_1788665411205.jpg';
import carBatteryImg from '../../assets/images/car_battery_agm_1788665425187.jpg';
import sparkPlugsImg from '../../assets/images/spark_plugs_set_1788665439858.jpg';

interface CustomerDashboardHomeProps {
  onNavigateTab: (tab: 'VEHICLES' | 'APPOINTMENTS' | 'TRACKING' | 'QUOTES' | 'PARTS_PRODUCTS' | 'INVOICES' | 'DOCUMENTS' | 'FEEDBACK' | 'PROFILE') => void;
  onOpenBookAppointment: () => void;
  onOpenAddVehicle: () => void;
}

export const CustomerDashboardHome: React.FC<CustomerDashboardHomeProps> = ({
  onNavigateTab,
  onOpenBookAppointment,
  onOpenAddVehicle
}) => {
  const { vehicles, appointments, workOrders, invoices, estimates, currentUser, theme } = useApp();
  const isDark = theme === 'dark';

  // Filter for current customer
  const myVehicles = (vehicles || []).filter((v) => belongsToCurrentCustomer(currentUser, v));
  const myAppointments = (appointments || []).filter((a) => belongsToCurrentCustomer(currentUser, a));
  const myWorkOrders = (workOrders || []).filter((wo) => belongsToCurrentCustomer(currentUser, wo));
  const myInvoices = (invoices || []).filter((i) => belongsToCurrentCustomer(currentUser, i));

  const myEstimates = (estimates || []).filter((e) => belongsToCurrentCustomer(currentUser, e));
  const pendingQuotes = myEstimates.filter((e) => e.status === 'WAITING_APPROVAL' || e.status === 'SENT');
  const pickupJobs = myWorkOrders.filter((w) => w.status === 'READY_FOR_PICKUP');
  const reminders = remindersFromVehicles(myVehicles).filter((r) => r.status !== 'DONE');

  const activeWO =
    myWorkOrders.find((w) => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED' || w.status === 'WAITING_APPROVAL') ||
    pickupJobs[0] ||
    myWorkOrders[0];

  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingAppointments = myAppointments.filter(
    (a) => a.date >= todayStr && a.status !== 'CANCELLED' && a.status !== 'COMPLETED'
  );
  const nextAppointment =
    upcomingAppointments.find((a) => a.status === 'SCHEDULED' || a.status === 'CONFIRMED') || upcomingAppointments[0];

  const outstandingInvoices = myInvoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED');
  const totalOutstanding = outstandingInvoices.reduce((sum, inv) => sum + invoiceRemaining(inv), 0);

  const completedServicesCount = myWorkOrders.filter((w) => w.status === 'COMPLETED' || w.status === 'DELIVERED').length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-950/70 via-slate-900 to-indigo-950/70 p-6 sm:p-8 rounded-3xl border border-blue-900/40 shadow-xl flex flex-col md:flex-row justify-between md:items-center gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 text-blue-400 text-xs font-semibold border border-blue-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Welcome Back to CarSV Care</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Hello, {currentUser?.name || 'John Doe'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            {pickupJobs[0]
              ? `${pickupJobs[0].vehicleInfo} is ready for pickup.`
              : pendingQuotes[0]
                ? `${pendingQuotes[0].estimateNumber} is waiting for your approval before extra repair continues.`
                : activeWO
                  ? `${activeWO.vehicleInfo} is in the workshop. Track live progress or review quotations.`
                  : 'Book a service, add a vehicle, or review invoices from this portal.'}
          </p>
        </div>

        {/* Quick Top CTAs */}
        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <button
            onClick={onOpenBookAppointment}
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Service</span>
          </button>

          <button
            onClick={() => onNavigateTab('TRACKING')}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2"
          >
            <Video className="w-4 h-4 text-red-400 animate-pulse" />
            <span>Watch Bay #02</span>
          </button>

          <button
            onClick={() => onNavigateTab('PARTS_PRODUCTS')}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Package className="w-4 h-4 text-blue-400" />
            <span>Parts & Products</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300">
              Brand Fit
            </span>
          </button>
        </div>
      </div>

      {(pickupJobs.length > 0 || pendingQuotes.length > 0 || reminders.some((r) => r.status === 'DUE' || r.status === 'OVERDUE')) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pickupJobs.slice(0, 1).map((wo) => (
            <button
              key={wo.id}
              type="button"
              onClick={() => onNavigateTab('TRACKING')}
              className={`text-left rounded-2xl p-4 border ${
                isDark
                  ? 'bg-emerald-950/40 border-emerald-500/30'
                  : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
              }`}
            >
              <div className={`text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                Ready for pickup
              </div>
              <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{wo.vehicleInfo}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {wo.workOrderNumber} passed quality check.
              </div>
            </button>
          ))}
          {pendingQuotes.slice(0, 1).map((est) => (
            <button
              key={est.id}
              type="button"
              onClick={() => onNavigateTab('QUOTES')}
              className={`text-left rounded-2xl p-4 border ${
                isDark
                  ? 'bg-amber-950/40 border-amber-500/30'
                  : 'bg-amber-50 border-amber-200 hover:border-amber-300'
              }`}
            >
              <div className={`text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
                Quotation to approve
              </div>
              <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{est.estimateNumber}</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {est.vehiclePlate} · ${est.estimatedTotal.toFixed(2)}
              </div>
            </button>
          ))}
          {reminders
            .filter((r) => r.status === 'DUE' || r.status === 'OVERDUE')
            .slice(0, 1)
            .map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onNavigateTab('VEHICLES')}
                className={`text-left rounded-2xl p-4 border ${
                  isDark
                    ? 'bg-blue-950/40 border-blue-500/30'
                    : 'bg-blue-50 border-blue-200 hover:border-blue-300'
                }`}
              >
                <div className={`text-[10px] uppercase font-bold mb-1 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                  Maintenance reminder
                </div>
                <div className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>{r.title}</div>
                <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {r.vehicleInfo}
                  {r.dueMileage ? ` · due ${r.dueMileage.toLocaleString()} km` : ''}
                </div>
              </button>
            ))}
        </div>
      )}

      {/* Parts & Recommendations Callout Banner */}
      <div
        onClick={() => onNavigateTab('PARTS_PRODUCTS')}
        className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-slate-900 border border-blue-500/30 hover:border-blue-400/60 rounded-2xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer transition-all hover:shadow-lg group"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-110 transition-transform">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors">
                Company Parts & Products Catalog
              </h4>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Car Brand Fitment
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Explore workshop stock with genuine studio photography. Filter guaranteed fitment for Toyota, Honda, Lexus, BMW & more.
            </p>
          </div>
        </div>

        {/* Real Product Thumbnails Preview */}
        <div className="flex items-center gap-3 self-end lg:self-auto">
          <div className="hidden sm:flex items-center -space-x-2.5">
            {[
              { img: brakePadsImg, label: 'Brake Pads' },
              { img: engineOilImg, label: 'Synthetic Oil' },
              { img: carBatteryImg, label: 'AGM Battery' },
              { img: sparkPlugsImg, label: 'Iridium Plugs' }
            ].map((item, idx) => (
              <div
                key={idx}
                className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-900 shadow-md bg-slate-950"
                title={item.label}
              >
                <img
                  src={item.img}
                  alt={item.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-blue-400 shrink-0">
            <span>Browse Catalog</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* 5 KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: My Vehicles */}
        <div
          onClick={() => onNavigateTab('VEHICLES')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">My Vehicles</span>
            <Car className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">{myVehicles.length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active in Garage</div>
        </div>

        {/* KPI 2: Upcoming Appointments */}
        <div
          onClick={() => onNavigateTab('APPOINTMENTS')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Appointments</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{upcomingAppointments.length}</div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {nextAppointment ? `${nextAppointment.date} ${nextAppointment.time}` : 'None scheduled'}
          </div>
        </div>

        {/* KPI 3: Active Repairs */}
        <div
          onClick={() => onNavigateTab('TRACKING')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:-translate-y-0.5 ring-1 ring-blue-500/30"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Active Repairs</span>
            <Wrench className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {myWorkOrders.filter((w) => !['COMPLETED', 'DELIVERED'].includes(w.status)).length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {pickupJobs.length > 0 ? `${pickupJobs.length} ready for pickup` : 'In workshop'}
          </div>
        </div>

        {/* KPI 4: Completed Services */}
        <div
          onClick={() => onNavigateTab('VEHICLES')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:-translate-y-0.5"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white">{completedServicesCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Lifetime Services</div>
        </div>

        {/* KPI 5: Outstanding Balance */}
        <div
          onClick={() => onNavigateTab('INVOICES')}
          className="bg-slate-900 p-5 rounded-2xl border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all hover:-translate-y-0.5 col-span-2 sm:col-span-1"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold">Due Balance</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            ${totalOutstanding.toFixed(2)}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            {outstandingInvoices.length} unpaid invoice{outstandingInvoices.length === 1 ? '' : 's'}
          </div>
        </div>
      </div>

      {/* Main Grid: Active Work Order Spotlight + Upcoming Appointment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Active Work Order Spotlight Card */}
        <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  {activeWO?.workOrderNumber || 'WO-1024'}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <span>In Progress</span>
                </span>
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                {activeWO?.vehicleInfo || 'Toyota Camry Hybrid (PP-1234)'}
              </h3>
            </div>

            <button
              onClick={() => onNavigateTab('TRACKING')}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Track Live</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bay Camera & Progress Mini Box */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-950 p-4 rounded-2xl border border-slate-800">
            <div className="sm:col-span-5 relative rounded-xl overflow-hidden aspect-video border border-slate-800 group">
              <img
                src="https://images.unsplash.com/photo-1563720223185-11003d516935?w=500&auto=format&fit=crop&q=80"
                alt="Bay 2 Cam"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2 text-[10px] font-mono text-white bg-black/75 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Video className="w-3 h-3 text-red-500 animate-pulse" />
                <span>Bay #02</span>
              </div>
            </div>

            <div className="sm:col-span-7 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Task:</span>
                <span className="font-bold text-white">Brake Rotor Resurfacing</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Master Tech:</span>
                <span className="font-bold text-blue-400">Dara Kim</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Est. Completion:</span>
                <span className="font-bold text-emerald-400">Today 04:30 PM</span>
              </div>

              {/* Progress Bar */}
              <div className="pt-1">
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Progress</span>
                  <span className="text-blue-400 font-bold font-mono">70%</span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div className="bg-gradient-to-r from-blue-600 to-emerald-400 h-full rounded-full w-[70%]" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            &quot;Pre-repair inspection completed with 4 photo logs. Brake friction material replaced with Akebono genuine ceramics.&quot;
          </p>
        </div>

        {/* Right: Upcoming Appointment & Quick Actions */}
        <div className="lg:col-span-5 space-y-6">
          {/* Upcoming Appointment Card */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Upcoming Appointment</span>
              </h3>
              <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                Confirmed
              </span>
            </div>

            {nextAppointment ? (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-white text-sm">
                  {nextAppointment.serviceName || 'Scheduled Maintenance'}
                </div>
                <div className="text-slate-300 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-slate-400" />
                  <span>{nextAppointment.vehicleInfo}</span>
                </div>
                <div className="text-slate-400 flex items-center gap-2 font-mono pt-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{nextAppointment.date} at {nextAppointment.time}</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => onNavigateTab('APPOINTMENTS')}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onNavigateTab('APPOINTMENTS')}
                    className="flex-1 py-2 rounded-xl bg-blue-600/15 hover:bg-blue-600 text-blue-400 hover:text-white text-xs font-semibold border border-blue-500/30 transition-colors"
                  >
                    Reschedule
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">No scheduled appointments.</p>
            )}
          </div>

          {/* Quick Action Shortcuts */}
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
              Quick Garage Actions
            </h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button
                onClick={onOpenBookAppointment}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <Calendar className="w-4 h-4 text-blue-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-white">Book Service</div>
                <div className="text-[10px] text-slate-400">Schedule check-in</div>
              </button>

              <button
                onClick={onOpenAddVehicle}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <Plus className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-white">Add Vehicle</div>
                <div className="text-[10px] text-slate-400">Register new car</div>
              </button>

              <button
                onClick={() => onNavigateTab('QUOTES')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <FileText className="w-4 h-4 text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-white">Quotations</div>
                <div className="text-[10px] text-slate-400">Approve or reject</div>
              </button>

              <button
                onClick={() => onNavigateTab('INVOICES')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <FileText className="w-4 h-4 text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-white">View Invoices</div>
                <div className="text-[10px] text-slate-400">Bills & receipts</div>
              </button>

              <button
                onClick={() => onNavigateTab('FEEDBACK')}
                className="p-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-left transition-all group"
              >
                <MessageSquare className="w-4 h-4 text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
                <div className="font-bold text-white">Rate Service</div>
                <div className="text-[10px] text-slate-400">Leave review</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
