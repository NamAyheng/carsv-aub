import React, { useState } from 'react';
import {
  DollarSign,
  Calendar,
  Wrench,
  CheckSquare,
  Boxes,
  Car,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowRight,
  UserCheck,
  Zap,
  BarChart2,
  FileSpreadsheet
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { RoleDeskBanner } from '../common/RoleDeskBanner';

export const ManagerDashboard: React.FC = () => {
  const {
    appointments,
    workOrders,
    tasks,
    inventory,
    technicians,
    invoices,
    setCurrentView,
    viewWorkOrderDetail
  } = useApp();

  const [revenuePeriod, setRevenuePeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');

  const todayDate = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter((a) => a.date === todayDate);
  const vehiclesInRepair = workOrders.filter((w) => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED');
  const pendingTasks = tasks.filter((t) => t.status === 'PENDING' || t.status === 'ASSIGNED');
  const completedRepairs = workOrders.filter((w) => w.status === 'COMPLETED' || w.status === 'DELIVERED');
  const lowStockParts = inventory.filter((p) => p.status === 'LOW_STOCK' || p.status === 'OUT_OF_STOCK');
  const urgentTasks = tasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH');

  // Revenue calculation
  const totalRevenue = invoices
    .filter((i) => i.status === 'PAID' || i.amountPaid > 0)
    .reduce((acc, curr) => acc + curr.amountPaid, 0) + 14850;

  // Work Order Status counts
  const woStats = {
    PENDING: workOrders.filter((w) => w.status === 'PENDING').length,
    ASSIGNED: workOrders.filter((w) => w.status === 'ASSIGNED').length,
    IN_PROGRESS: workOrders.filter((w) => w.status === 'IN_PROGRESS').length,
    COMPLETED: workOrders.filter((w) => w.status === 'COMPLETED' || w.status === 'DELIVERED').length
  };

  // SVG Chart data for Monthly revenue
  const revenueTrend = [
    { label: 'Aug 01', val: 850 },
    { label: 'Aug 07', val: 1420 },
    { label: 'Aug 14', val: 2100 },
    { label: 'Aug 21', val: 1890 },
    { label: 'Aug 28', val: 2450 }
  ];
  const maxRev = 3000;

  return (
    <div className="space-y-6">
      <RoleDeskBanner />
      {/* 1. TOP BENTO ROW: 4 Metric Bento Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>MTD Revenue</span>
            <span className="text-green-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +14.2%
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">${totalRevenue.toLocaleString()}</div>
          <div className="text-xs text-gray-400">Target: 112% Achieved</div>
        </div>

        <div
          onClick={() => setCurrentView('WorkOrders')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Active Repairs</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Car className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(vehiclesInRepair.length).padStart(2, '0')}</div>
          <div className="text-xs text-blue-600 font-semibold">4 / 6 bays occupied</div>
        </div>

        <div
          onClick={() => setCurrentView('Appointments')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Today's Bookings</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(todayAppointments.length).padStart(2, '0')}</div>
          <div className="text-xs text-gray-400">100% capacity scheduled</div>
        </div>

        <div
          onClick={() => setCurrentView('Inventory')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Low Stock Parts</span>
            <div className="p-1 rounded bg-red-50 text-red-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 my-2">{String(lowStockParts.length).padStart(2, '0')}</div>
          <div className="text-xs text-red-500 font-semibold">{lowStockParts.length} critical OEM parts</div>
        </div>
      </div>

      {/* 2. MIDDLE BENTO ROW: Revenue Overview & Repair Pipeline Funnel */}
      <div className="grid grid-cols-12 gap-6">
        {/* Revenue Velocity Chart Card */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Revenue Velocity & Billing Telemetry
                </h3>
                <p className="text-xs text-gray-400">Service labor hours billed and OEM spare parts turnover</p>
              </div>

              <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs font-semibold">
                {(['WEEK', 'MONTH', 'YEAR'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setRevenuePeriod(p)}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      revenuePeriod === p ? 'bg-white text-gray-800 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Visual Bar & Line Chart */}
            <div className="h-56 w-full pt-2">
              <div className="flex items-end justify-between h-40 gap-4 px-2 border-b border-gray-100">
                {revenueTrend.map((item, idx) => {
                  const pct = Math.round((item.val / maxRev) * 100);
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                      <span className="text-[10px] font-mono font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        ${item.val}
                      </span>
                      <div className="w-full max-w-[48px] bg-gray-100 rounded-t-lg overflow-hidden h-full flex items-end">
                        <div
                          className="w-full bg-blue-600 rounded-t-lg group-hover:bg-blue-700 transition-all duration-300"
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-gray-500">{item.label}</span>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 mt-3 px-2">
                <span>Total Labor Hours: <strong className="text-gray-800 font-mono">148.5 hrs</strong></span>
                <span>Average Repair Ticket: <strong className="text-gray-800 font-mono">$242.50</strong></span>
                <span className="text-green-600 font-bold">112% Target Achieved</span>
              </div>
            </div>
          </div>
        </div>

        {/* Repair Pipeline Funnel Bento Box */}
        <div className="col-span-12 lg:col-span-4 bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-600" />
                Repair Pipeline Funnel
              </h3>
              <span className="text-xs font-mono font-bold text-gray-600">{workOrders.length} Total</span>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Pending Assessment', count: woStats.PENDING, color: 'bg-amber-500', bar: 'w-[25%]' },
                { label: 'Assigned to Tech', count: woStats.ASSIGNED, color: 'bg-blue-500', bar: 'w-[40%]' },
                { label: 'Active In-Progress', count: woStats.IN_PROGRESS, color: 'bg-blue-600', bar: 'w-[65%]' },
                { label: 'Completed & QC', count: woStats.COMPLETED, color: 'bg-green-500', bar: 'w-[90%]' }
              ].map((st, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">{st.label}</span>
                    <span className="font-mono font-bold text-gray-900">{st.count}</span>
                  </div>
                  <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                    <div className={`h-full ${st.color} ${st.bar} rounded-full`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2 text-xs text-blue-900">
            <Zap className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Average turnaround time per repair: <strong>3.2 Hours</strong></span>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BENTO ROW: Technician Productivity & Quick Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bento 1: Technician Performance */}
        <div className="col-span-1 md:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4 border-b border-gray-50 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-blue-600" />
                Technician Performance & Workload
              </h3>
              <p className="text-xs text-gray-400">Active tasks vs. completed repairs and efficiency ratings</p>
            </div>
            <button
              onClick={() => setCurrentView('Technicians')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              All Techs →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {technicians.map((tech) => (
              <div key={tech.id} className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={tech.avatar} alt="" className="w-9 h-9 rounded-lg object-cover ring-2 ring-gray-200" />
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{tech.name}</h4>
                      <p className="text-[10px] text-gray-500 truncate max-w-[130px]">{tech.specialization}</p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tech.availability === 'AVAILABLE'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {tech.availability}
                  </span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-gray-200/60 grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 block">Active Tasks</span>
                    <span className="font-bold text-gray-900 font-mono">{tech.activeTaskCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Completed</span>
                    <span className="font-bold text-gray-900 font-mono">{tech.completedTaskCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-400 block">Rating</span>
                    <span className="font-bold text-amber-600 font-mono">★ {tech.rating}</span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                    <span>Job Completion Rate</span>
                    <span className="font-bold font-mono">{tech.completionRatePercent}%</span>
                  </div>
                  <ProgressBar progress={tech.completionRatePercent} size="sm" color="emerald" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bento 2: Urgent Deadlines & Alerts */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
              <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Critical Inventory Alerts
              </h4>
              <button
                onClick={() => setCurrentView('Inventory')}
                className="text-[11px] text-blue-600 hover:underline font-semibold"
              >
                Reorder →
              </button>
            </div>

            <div className="space-y-2">
              {lowStockParts.slice(0, 3).map((part) => (
                <div key={part.id} className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-xs font-medium text-red-800">
                  <div className="min-w-0">
                    <p className="font-bold truncate">{part.name}</p>
                    <p className="text-[10px] text-red-600">SKU: {part.sku}</p>
                  </div>
                  <span className="font-bold font-mono px-2 py-0.5 rounded bg-red-200 text-red-800 text-[10px]">
                    {part.stockQuantity} left
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              Urgent Task Deadlines
            </h4>
            <div className="space-y-2">
              {urgentTasks.slice(0, 2).map((tsk) => (
                <div key={tsk.id} className="p-2 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{tsk.title}</p>
                    <p className="text-[10px] text-gray-500 truncate">{tsk.vehicleInfo}</p>
                  </div>
                  <StatusBadge priority={tsk.priority} size="sm" />
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setCurrentView('Reports')}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
          >
            Export Operations Report (PDF)
          </button>
        </div>
      </div>
    </div>
  );
};
