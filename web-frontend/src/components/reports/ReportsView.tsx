import React, { useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  Wrench,
  Users,
  Calendar,
  Download,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  ShieldCheck
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';

export const ReportsView: React.FC = () => {
  const { invoices, workOrders, customers, addToast } = useApp();
  const [timeRange, setTimeRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');

  const monthlyRevenueData = [
    { month: 'Jan', revenue: 14200, labor: 7800, parts: 6400 },
    { month: 'Feb', revenue: 18500, labor: 10200, parts: 8300 },
    { month: 'Mar', revenue: 16900, labor: 9400, parts: 7500 },
    { month: 'Apr', revenue: 22400, labor: 12100, parts: 10300 },
    { month: 'May', revenue: 28900, labor: 15600, parts: 13300 },
    { month: 'Jun', revenue: 31200, labor: 17000, parts: 14200 },
    { month: 'Jul', revenue: 34500, labor: 19200, parts: 15300 }
  ];

  const categoryDistribution = [
    { name: 'Maintenance', value: 38, color: '#3b82f6' },
    { name: 'Brake System', value: 24, color: '#ef4444' },
    { name: 'Engine Repair', value: 18, color: '#f59e0b' },
    { name: 'Diagnostics', value: 12, color: '#6366f1' },
    { name: 'A/C & Climate', value: 8, color: '#10b981' }
  ];

  const techEfficiencyData = [
    { name: 'Dara Pich', jobs: 28, revenue: 6400 },
    { name: 'Sophea Som', jobs: 24, revenue: 5200 },
    { name: 'Rithy Chea', jobs: 22, revenue: 4900 },
    { name: 'Vireak Chan', jobs: 19, revenue: 3800 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Analytics & Financial Reports</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              Q3 Performance
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive workshop financial telemetry, technician billable hours, and category profitability.</p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            {(['WEEK', 'MONTH', 'YEAR'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  timeRange === range ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                {range}
              </button>
            ))}
          </div>

          <button
            onClick={() => addToast({ type: 'success', title: 'Report Generated', message: 'Full P&L statement exported as PDF.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export P&L</span>
          </button>
        </div>
      </div>

      {/* Top Stat KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Workshop Revenue"
          value="$166,600"
          subtitle="Year-to-date billed"
          trend={{ value: 16.4, isPositive: true }}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Completed Repair Orders"
          value="482"
          subtitle="Average $345 / ticket"
          trend={{ value: 9.8, isPositive: true }}
          icon={Wrench}
          color="blue"
        />
        <StatCard
          title="Customer Retention Rate"
          value="84.6%"
          subtitle="Repeat garage visits"
          trend={{ value: 4.2, isPositive: true }}
          icon={Users}
          color="indigo"
        />
        <StatCard
          title="Spare Parts Margin"
          value="42.8%"
          subtitle="Markup over wholesale cost"
          trend={{ value: 2.1, isPositive: true }}
          icon={TrendingUp}
          color="amber"
        />
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend Over Time */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monthly Revenue & Labor vs Parts</h3>
              <p className="text-xs text-slate-500">Gross repair billing breakdown by month</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyRevenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `$${val / 1000}k`} />
                <Tooltip
                  formatter={(value: any) => [`$${value}`, '']}
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '11px' }}
                />
                <Bar dataKey="labor" name="Labor Labor" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="parts" name="Parts Billing" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Service Category Pie Breakdown */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Service Category Share</h3>
            <p className="text-xs text-slate-500">Repair volume distribution</p>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                >
                  {categoryDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs">
            {categoryDistribution.map((cat) => (
              <div key={cat.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-slate-700">{cat.name}</span>
                </span>
                <span className="font-mono font-bold text-slate-900">{cat.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Technician Productivity Ranking */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900">Lead Technician Productivity & Labor Generated</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {techEfficiencyData.map((tech) => (
            <div key={tech.name} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 text-sm block">{tech.name}</span>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Completed Orders:</span>
                <strong className="font-mono text-slate-900">{tech.jobs}</strong>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Revenue Generated:</span>
                <strong className="font-mono text-emerald-600">${tech.revenue}</strong>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
