import React, { useState } from 'react';
import {
  Users,
  Car,
  Calendar,
  Wrench,
  FileSpreadsheet,
  CheckSquare,
  ShieldCheck,
  PlusCircle,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock,
  Server,
  UserPlus,
  CarFront,
  FilePlus,
  AlertCircle,
  Video,
  AlertTriangle,
  ChevronRight,
  Shield,
  Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { RoleDeskBanner } from '../common/RoleDeskBanner';

interface AdminDashboardProps {
  onOpenUserModal?: () => void;
  onOpenCustomerModal?: () => void;
  onOpenVehicleModal?: () => void;
  onOpenWorkOrderModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenUserModal,
  onOpenCustomerModal,
  onOpenVehicleModal,
  onOpenWorkOrderModal
}) => {
  const {
    users,
    customers,
    vehicles,
    technicians,
    appointments,
    workOrders,
    inventory,
    cctvCameras,
    cctvFeeds,
    activityLogs,
    setCurrentView,
    viewWorkOrderDetail
  } = useApp();

  const [activeCameraBay, setActiveCameraBay] = useState<number>(4);

  const feeds = cctvCameras || cctvFeeds || [];
  const todayDate = new Date().toISOString().split('T')[0];
  const todayAppointments = (appointments || []).filter((a) => a.date === todayDate);
  const activeWorkOrders = (workOrders || []).filter((w) => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED');
  const lowStockItems = (inventory || []).filter((i) => i.stockQuantity <= i.minStockLevel);
  const selectedCctv = feeds.find((c) => c.bayNumber.includes(String(activeCameraBay)) || c.id.includes(String(activeCameraBay))) || feeds[0];

  return (
    <div className="space-y-6">
      <RoleDeskBanner />
      {/* 1. TOP BENTO ROW: Key Performance Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* KPI 1: Total Revenue */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Total Revenue</span>
            <span className="text-green-600 font-bold flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" /> +12.5%
            </span>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">$42,850</div>
          <div className="text-xs text-gray-400">vs. last week ($38,100)</div>
        </div>

        {/* KPI 2: Active Repairs */}
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
          <div className="text-2xl font-bold text-gray-800 my-2">{String(activeWorkOrders.length).padStart(2, '0')}</div>
          <div className="text-xs text-blue-600 font-semibold">{workOrders.filter(w => w.status === 'IN_PROGRESS').length} currently on hoist</div>
        </div>

        {/* KPI 3: Appointments */}
        <div
          onClick={() => setCurrentView('Appointments')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Appointments</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(todayAppointments.length).padStart(2, '0')}</div>
          <div className="text-xs text-gray-400">{appointments.filter(a => a.status === 'CONFIRMED').length} confirmed for today</div>
        </div>

        {/* KPI 4: Low Stock Alert */}
        <div
          onClick={() => setCurrentView('Inventory')}
          className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between cursor-pointer hover:border-red-300 transition-colors"
        >
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Low Stock Items</span>
            <div className="p-1 rounded bg-red-50 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 my-2">{String(lowStockItems.length).padStart(2, '0')}</div>
          <div className="text-xs text-red-500 font-semibold">Requires reordering</div>
        </div>
      </div>

      {/* 2. MIDDLE BENTO ROW: Live Work Orders (8 Cols) & CCTV Monitoring (4 Cols) */}
      <div className="grid grid-cols-12 gap-6">
        {/* Live Work Orders Table Card */}
        <div className="col-span-12 lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 text-sm sm:text-base">Live Work Orders</h2>
            <button
              onClick={() => setCurrentView('WorkOrders')}
              className="text-blue-600 text-xs font-bold hover:underline"
            >
              View All ({workOrders.length})
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50 text-[10px] text-gray-500 uppercase font-semibold">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Vehicle</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Technician</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {workOrders.slice(0, 5).map((wo) => {
                  const getStatusBadgeClass = (status: string) => {
                    switch (status) {
                      case 'IN_PROGRESS':
                        return 'bg-blue-100 text-blue-700 font-bold';
                      case 'COMPLETED':
                      case 'DELIVERED':
                        return 'bg-green-100 text-green-700 font-bold';
                      case 'PENDING':
                      case 'ASSIGNED':
                        return 'bg-amber-100 text-amber-700 font-bold';
                      default:
                        return 'bg-gray-100 text-gray-700 font-bold';
                    }
                  };

                  return (
                    <tr key={wo.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-600">#{wo.workOrderNumber}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{wo.vehicleInfo}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{wo.vehiclePlate}</div>
                      </td>
                      <td className="p-3 text-gray-600 max-w-[140px] truncate">{wo.reportedProblem}</td>
                      <td className="p-3 text-gray-800 font-medium">{wo.assignedTechnicianName}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${getStatusBadgeClass(wo.status)}`}>
                          {wo.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => viewWorkOrderDetail(wo.id)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Details →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Showing 5 most recent garage active jobs</span>
            <span className="font-mono text-[10px]">Total Active: {activeWorkOrders.length}</span>
          </div>
        </div>

        {/* Live CCTV Bay Camera Bento Card */}
        <div className="col-span-12 lg:col-span-4 bg-gray-900 rounded-xl overflow-hidden shadow-lg border border-gray-800 flex flex-col justify-between">
          {/* Header */}
          <div className="p-3 bg-gray-800 text-white text-xs font-bold flex justify-between items-center border-b border-gray-700">
            <span className="flex items-center space-x-1.5">
              <Video className="w-4 h-4 text-blue-400" />
              <span>CCTV LIVE: BAY {selectedCctv?.bayNumber || 4}</span>
            </span>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="text-[10px] text-red-400 font-mono font-bold uppercase tracking-wider">REC</span>
            </div>
          </div>

          {/* Camera Video Viewport */}
          <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden group">
            <img
              src={selectedCctv?.thumbnailUrl || 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=600'}
              alt="Bay Feed"
              className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
            />
            {/* Scanline & HUD overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent pointer-events-none" />
            <div className="absolute top-2 left-2 text-[9px] font-mono text-green-400 bg-black/70 px-1.5 py-0.5 rounded border border-gray-800">
              CAM{String(selectedCctv?.bayNumber || 4).slice(0, 8)} • 1080p 30fps
            </div>
            <div className="absolute top-2 right-2 text-[9px] font-mono text-gray-300 bg-black/70 px-1.5 py-0.5 rounded">
              2026-08-28 14:32:08
            </div>

            <div className="absolute bottom-2 left-2 right-2 text-white text-xs flex justify-between items-center bg-black/75 px-2 py-1 rounded backdrop-blur-xs">
              <span className="truncate font-semibold text-[11px]">
                {selectedCctv?.currentVehicle || 'Toyota Camry (PP-1234)'}
              </span>
              <span className="text-[10px] text-blue-400 font-mono">
                Tech: {selectedCctv?.currentTechnician || 'Dara Kim'}
              </span>
            </div>
          </div>

          {/* CCTV Bay Switchers & Footer */}
          <div className="p-3 bg-gray-800/80 border-t border-gray-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-gray-300">
              <span className="text-gray-400">Select Bay Camera:</span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4].map((bay) => (
                  <button
                    key={bay}
                    onClick={() => setActiveCameraBay(bay)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                      activeCameraBay === bay
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    B{bay}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-gray-700/60">
              <span className="text-[10px] text-gray-400">Live AI Diagnostics Scan: Nominal</span>
              <button
                onClick={() => setCurrentView('CCTV')}
                className="text-[10px] font-bold text-blue-400 hover:text-blue-300"
              >
                Multi-View (6 Bays) →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM BENTO ROW: Technician Status (4), Inventory Alerts (4), Quick Action (4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bento 1: Technician Status */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Technician Status</h3>
              <button
                onClick={() => setCurrentView('Technicians')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Schedule
              </button>
            </div>

            <div className="space-y-2.5">
              {technicians.slice(0, 4).map((tech) => {
                const initials = tech.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                const isBusy = tech.availability === 'BUSY';
                return (
                  <div
                    key={tech.id}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{tech.name}</div>
                        <div className="text-[10px] text-gray-500 truncate">{tech.specialization}</div>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isBusy ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {isBusy ? `BUSY (${tech.activeJobsCount})` : 'IDLE'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-gray-50 text-[11px] text-gray-500 flex justify-between items-center">
            <span>On-Duty Mechanics</span>
            <span className="font-bold text-gray-700">{technicians.filter(t => t.availability === 'BUSY').length} active jobs</span>
          </div>
        </div>

        {/* Bento 2: Inventory Alerts */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 text-sm">Inventory Alerts</h3>
              <button
                onClick={() => setCurrentView('Inventory')}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                Stockroom
              </button>
            </div>

            <div className="space-y-2">
              {lowStockItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-2 bg-red-50 border border-red-100 rounded-lg flex items-center justify-between text-xs font-medium text-red-800"
                >
                  <div className="min-w-0">
                    <span className="font-bold block truncate">{item.name}</span>
                    <span className="text-[10px] text-red-600 block">SKU: {item.sku}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-red-200 text-red-800 rounded font-mono font-bold text-[10px] shrink-0">
                    {item.quantity} {item.unit} left
                  </span>
                </div>
              ))}

              {lowStockItems.length === 0 && (
                <div className="p-3 bg-green-50 rounded-lg text-center text-xs text-green-700 font-medium">
                  All warehouse inventory stock levels nominal.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => setCurrentView('Inventory')}
            className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg transition-colors"
          >
            Order Replacement Parts
          </button>
        </div>

        {/* Bento 3: Quick Action Card */}
        <div className="bg-blue-600 rounded-xl p-6 shadow-sm border border-blue-700 text-white flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-500/40 px-2 py-0.5 rounded">
              Dispatcher
            </span>
            <h3 className="font-bold text-lg text-white mt-2">Quick Action</h3>
            <p className="text-xs text-blue-100 mt-1 leading-relaxed">
              New service entry, customer check-in, or instant repair work order generation.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={() => {
                if (onOpenWorkOrderModal) onOpenWorkOrderModal();
                else setCurrentView('WorkOrders');
              }}
              className="w-full bg-white text-blue-600 font-bold py-3 rounded-lg text-sm shadow-md hover:bg-blue-50 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
            >
              <FilePlus className="w-4 h-4" />
              <span>+ CREATE WORK ORDER</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (onOpenCustomerModal) onOpenCustomerModal();
                  else setCurrentView('Customers');
                }}
                className="py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors"
              >
                + Add Customer
              </button>
              <button
                onClick={() => {
                  if (onOpenVehicleModal) onOpenVehicleModal();
                  else setCurrentView('Vehicles');
                }}
                className="py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold transition-colors"
              >
                + Add Vehicle
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
