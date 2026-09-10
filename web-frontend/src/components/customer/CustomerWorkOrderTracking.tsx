import React, { useState } from 'react';
import {
  Wrench,
  Car,
  Clock,
  CheckCircle2,
  AlertCircle,
  Video,
  Layers,
  FileText,
  DollarSign,
  User,
  ShieldCheck,
  ChevronRight,
  Maximize2,
  Sparkles,
  Fuel,
  Gauge,
  Camera,
  X,
  Package
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { WorkOrder, RepairTask, CCTVCamera } from '../../types';

interface ClientRepairTask {
  id: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PENDING';
  priority: string;
  assignedToName: string;
  assignedToId?: string;
  estimatedHours: number;
  actualHours: number;
  completedAt?: string;
}

interface CustomerWorkOrderTrackingProps {
  defaultWorkOrderId?: string;
  onNavigateToParts?: () => void;
}

export const CustomerWorkOrderTracking: React.FC<CustomerWorkOrderTrackingProps> = ({
  defaultWorkOrderId,
  onNavigateToParts
}) => {
  const { workOrders, vehicles, cctvCameras, estimates, currentUser, theme, approveEstimate, rejectEstimate } = useApp();
  const isDark = theme === 'dark';

  // Pick customer work orders
  const customerWorkOrders = (workOrders || []).filter((wo) => belongsToCurrentCustomer(currentUser, wo));

  const [selectedWOId, setSelectedWOId] = useState<string>(
    defaultWorkOrderId || customerWorkOrders[0]?.id || 'wo-1'
  );

  // Active work order
  const currentWO = (workOrders || []).find((w) => w.id === selectedWOId) || customerWorkOrders[0] || (workOrders || [])[0];

  // Associated vehicle
  const currentVehicle = (vehicles || []).find((v) => v.id === currentWO?.vehicleId);

  // Associated bay camera
  const bayCamera = (cctvCameras || []).find((c) => c.bayNumber?.includes('02')) || (cctvCameras || [])[0];

  // Photo Lightbox state
  const [lightboxPhoto, setLightboxPhoto] = useState<{ url: string; title: string; note: string } | null>(null);

  // Active tab within the work order tracking screen
  const [activeTrackingTab, setActiveTrackingTab] = useState<'OVERVIEW' | 'TASKS' | 'INSPECTION' | 'PARTS' | 'CCTV'>('OVERVIEW');

  // Realistic mock parts used if not on work order
  const partsUsed = currentWO?.partsUsed || [
    {
      partId: 'part-101',
      partName: 'Akebono Ceramic Front Brake Pads',
      partNumber: 'AK-BP-8902',
      quantity: 1,
      unitPrice: 85.00,
      total: 85.00
    },
    {
      partId: 'part-102',
      partName: 'Toyota Genuine Dot 4 Brake Fluid (1L)',
      partNumber: 'TOY-BF-4001',
      quantity: 2,
      unitPrice: 15.00,
      total: 30.00
    },
    {
      partId: 'part-103',
      partName: 'Brake Caliper Hardware Retainer Clips',
      partNumber: 'HW-CL-2200',
      quantity: 1,
      unitPrice: 20.00,
      total: 20.00
    }
  ];

  const totalPartsCost = partsUsed.reduce((acc, p) => acc + ((p as { total?: number; totalPrice?: number }).total ?? p.totalPrice ?? 0), 0);

  // Realistic individual tasks
  const tasks: ClientRepairTask[] = [
    {
      id: 'task-1',
      title: 'Digital Intake 60-Point Inspection',
      description: 'Check brake disc thickness, pad remaining life, fluid moisture content, and tire treads.',
      status: 'COMPLETED',
      priority: 'HIGH',
      assignedToName: 'Dara Kim',
      assignedToId: 'tech-1',
      estimatedHours: 0.5,
      actualHours: 0.5,
      completedAt: 'Today 09:15 AM'
    },
    {
      id: 'task-2',
      title: 'Replace Front Ceramic Brake Pads',
      description: 'Remove worn ceramic pads, clean caliper carrier slides, apply synthetic brake grease, and install Akebono ceramic pads.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      assignedToName: 'Dara Kim',
      assignedToId: 'tech-1',
      estimatedHours: 1.5,
      actualHours: 1.1,
      completedAt: undefined
    },
    {
      id: 'task-3',
      title: 'Resurface Front Brake Rotors on On-Car Lathe',
      description: 'Measure rotor runout tolerance with micrometer, lathe resurface to eliminate brake shudder and pulsation.',
      status: 'COMPLETED',
      priority: 'MEDIUM',
      assignedToName: 'Dara Kim',
      assignedToId: 'tech-1',
      estimatedHours: 1.0,
      actualHours: 0.8,
      completedAt: 'Today 10:45 AM'
    },
    {
      id: 'task-4',
      title: 'Road Test, ABS Calibration & Quality Inspection',
      description: 'Conduct dynamic highway stop test, bed-in new ceramic friction pads, and calibrate ABS wheel speed sensors.',
      status: 'PENDING',
      priority: 'HIGH',
      assignedToName: 'Sokha Heng',
      assignedToId: 'tech-2',
      estimatedHours: 0.8,
      actualHours: 0,
      completedAt: undefined
    }
  ];

  // Inspection Photos Gallery
  const inspectionPhotos = [
    {
      url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop&q=80',
      title: 'Front Brake Rotor Wear',
      note: 'Minor concentric grooving detected on front-left brake rotor surface.'
    },
    {
      url: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=800&auto=format&fit=crop&q=80',
      title: 'Brake Pad Lining Remaining',
      note: 'Friction material measured at 2.4mm (threshold limit is 3.0mm).'
    },
    {
      url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&auto=format&fit=crop&q=80',
      title: 'OBD-II Health Scan',
      note: 'No active fault codes in engine or transmission ECU modules.'
    },
    {
      url: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800&auto=format&fit=crop&q=80',
      title: 'Exterior Intake Walkaround',
      note: 'Minor pre-existing paint chip on front right bumper lip noted.'
    }
  ];

  const linkedQuote = (estimates || []).find(
    (e) => e.workOrderId === currentWO?.id && (e.status === 'WAITING_APPROVAL' || e.status === 'SENT')
  );

  const statusLabel = (status?: string) => {
    switch (status) {
      case 'READY_FOR_PICKUP':
        return 'Ready for pickup';
      case 'WAITING_APPROVAL':
        return 'Waiting for approval';
      case 'WAITING_PARTS':
        return 'Waiting for parts';
      case 'QUALITY_CHECK':
        return 'Quality check';
      case 'IN_PROGRESS':
        return 'In progress';
      case 'COMPLETED':
        return 'Completed';
      case 'DELIVERED':
        return 'Delivered';
      default:
        return (status || 'In progress').replace(/_/g, ' ');
    }
  };

  const milestones = [
    { title: 'Vehicle Received', key: 'PENDING' },
    { title: 'Inspection Completed', key: 'ASSIGNED' },
    { title: 'Diagnosis Completed', key: 'WAITING_APPROVAL' },
    { title: 'Repair In Progress', key: 'IN_PROGRESS' },
    { title: 'Quality Check', key: 'QUALITY_CHECK' },
    { title: 'Ready for Pickup', key: 'READY_FOR_PICKUP' }
  ].map((step) => {
    const order = ['PENDING', 'ASSIGNED', 'WAITING_APPROVAL', 'IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'READY_FOR_PICKUP', 'COMPLETED', 'DELIVERED'];
    const current = currentWO?.status || 'IN_PROGRESS';
    const cIdx = order.indexOf(current);
    const sIdx = order.indexOf(step.key);
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    if (current === 'READY_FOR_PICKUP' || current === 'COMPLETED' || current === 'DELIVERED') {
      status = step.key === 'READY_FOR_PICKUP' ? 'current' : 'completed';
      if (step.key === 'READY_FOR_PICKUP' && (current === 'COMPLETED' || current === 'DELIVERED')) status = 'completed';
    } else if (sIdx < cIdx) status = 'completed';
    else if (step.key === current || (current === 'WAITING_PARTS' && step.key === 'IN_PROGRESS')) status = 'current';
    return { title: step.title, status };
  });

  return (
    <div className="space-y-6">
      {/* Top Selector if customer has multiple active orders */}
      {customerWorkOrders.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider shrink-0">
            Select Work Order:
          </span>
          {customerWorkOrders.map((wo) => (
            <button
              key={wo.id}
              onClick={() => setSelectedWOId(wo.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedWOId === wo.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {wo.workOrderNumber || 'WO-1024'} • {wo.vehicleInfo}
            </button>
          ))}
        </div>
      )}

      {currentWO?.status === 'READY_FOR_PICKUP' && (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            isDark
              ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
              : 'border-emerald-200 bg-emerald-50 text-slate-600'
          }`}
        >
          <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Ready for pickup.</span>{' '}
          {currentWO.vehicleInfo} ({currentWO.vehiclePlate}) passed quality check. Please collect from the handover bay.
        </div>
      )}

      {linkedQuote && (
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark
              ? 'border-amber-500/30 bg-amber-950/30'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="text-sm">
            <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {linkedQuote.estimateNumber} needs your approval
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Extra recommended work: ${linkedQuote.estimatedTotal.toFixed(2)}. Repair of extra items waits until you approve.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => approveEstimate(linkedQuote.id, 'Approved from tracking screen.')}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => rejectEstimate(linkedQuote.id, 'Declined from tracking screen.')}
              className={`px-3 py-2 rounded-xl text-xs font-bold border ${
                isDark
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              Reject
            </button>
          </div>
        </div>
      )}

      {/* 1. MAIN WORK ORDER HEADER CARD */}
      <div
        className={`rounded-3xl border p-6 sm:p-8 relative overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
        }`}
      >
        {/* Ambient Top Light */}
        <div className="absolute top-0 right-0 w-96 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row justify-between lg:items-start gap-6 relative z-10">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-lg text-xs font-mono font-extrabold uppercase bg-blue-600/20 text-blue-400 border border-blue-500/30">
                {currentWO?.workOrderNumber || 'WO-1024'}
              </span>
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span>{statusLabel(currentWO?.status)}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                Priority: {currentWO?.priority || 'HIGH'}
              </span>
            </div>

            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentWO?.vehicleInfo || 'Toyota Camry Hybrid (2022)'}
            </h2>

            <div
              className={`p-3.5 rounded-2xl border text-xs ${
                isDark ? 'bg-slate-950/70 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-1">
                Reported problem / symptoms
              </span>
              <p className="font-medium leading-relaxed">
                {currentWO?.reportedProblem ||
                  currentWO?.problemDescription ||
                  'High-pitch squeal when coming to a halt at traffic lights. Steering wheel vibration during moderate braking from 60 km/h.'}
              </p>
            </div>
            {currentWO?.diagnosis && (
              <div
                className={`p-3.5 rounded-2xl border text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-1">Diagnosis</span>
                <p className="font-medium leading-relaxed">{currentWO.diagnosis}</p>
                {currentWO.recommendedRepair && (
                  <p className="mt-2 text-slate-400">Recommended: {currentWO.recommendedRepair}</p>
                )}
              </div>
            )}
          </div>

          {/* Quick Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs shrink-0 lg:w-96">
            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-500 text-[10px] block font-semibold">Assigned master tech</span>
              <span className={`font-bold flex items-center gap-1.5 mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <User className="w-3.5 h-3.5 text-blue-500" />
                {currentWO?.assignedTechnicianName || 'Dara Kim'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-500 text-[10px] block font-semibold">Estimated cost</span>
              <span className="font-black text-emerald-600 font-mono text-sm mt-0.5 block">
                ${(currentWO?.estimatedCost || 285).toFixed(2)}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-500 text-[10px] block font-semibold">Est. completion</span>
              <span className={`font-bold mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>Today, 04:30 PM</span>
            </div>

            <div className={`p-3 rounded-xl border col-span-2 sm:col-span-3 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-500 text-[10px] block font-semibold">Work order intake date</span>
              <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentWO?.createdAt || 'September 5, 2026 at 08:30 AM'}
              </span>
            </div>
          </div>
        </div>

        {/* 2. PROGRESS BAR & MILESTONE JOURNEY */}
        <div className={`mt-8 pt-8 space-y-6 ${isDark ? 'border-t border-slate-800' : 'border-t border-slate-200'}`}>
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <Wrench className="w-4 h-4 text-blue-500" />
                Live repair progress
              </span>
              <span className="text-sm font-black text-blue-600 font-mono">70% complete</span>
            </div>

            <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <div
                className="bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500 shadow-lg shadow-blue-500/25"
                style={{ width: `${currentWO?.progressPercentage || 70}%` }}
              />
            </div>
          </div>

          {/* Visual Milestone Journey */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {milestones.map((m, idx) => {
              const completed = m.status === 'completed';
              const current = m.status === 'current';
              return (
                <div
                  key={m.title}
                  className={`p-3 rounded-xl border text-center ${
                    completed
                      ? isDark
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : current
                        ? isDark
                          ? 'bg-blue-950/40 border-blue-500 text-blue-200 ring-1 ring-blue-500'
                          : 'bg-blue-50 border-blue-500 text-blue-800'
                        : isDark
                          ? 'bg-slate-950/50 border-slate-800 text-slate-500'
                          : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <div className="w-6 h-6 rounded-full mx-auto mb-1.5 flex items-center justify-center">
                    {completed && <CheckCircle2 className={`w-4 h-4 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />}
                    {current && <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                    {!completed && !current && (
                      <span className={`text-[10px] font-bold ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{idx + 1}</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold leading-snug">{m.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. SUB-TABS: TASKS, INSPECTION, PARTS, LIVE CCTV */}
      <div className="flex border-b border-slate-800 bg-slate-900/60 p-1.5 rounded-2xl gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTrackingTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTrackingTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Detailed Summary
        </button>

        <button
          onClick={() => setActiveTrackingTab('TASKS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'TASKS'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Repair Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTrackingTab('INSPECTION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'INSPECTION'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Vehicle Inspection Report</span>
        </button>

        <button
          onClick={() => setActiveTrackingTab('PARTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'PARTS'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Parts Installed (${totalPartsCost.toFixed(2)})</span>
        </button>

        <button
          onClick={() => setActiveTrackingTab('CCTV')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'CCTV'
              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
              : 'text-red-400 hover:bg-red-950/40'
          }`}
        >
          <Video className="w-3.5 h-3.5 animate-pulse" />
          <span>Live CCTV Bay #02</span>
        </button>
      </div>

      {/* CONTENT FOR SELECTED TAB */}

      {/* TAB A: OVERVIEW & LIVE STREAM COMBO */}
      {(activeTrackingTab === 'OVERVIEW' || activeTrackingTab === 'CCTV') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Live Bay CCTV Box */}
          <div className="lg:col-span-7 bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col justify-between">
            <div className="p-4 bg-slate-950 flex items-center justify-between border-b border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-bold text-white">CarSV Transparency Feed • Bay #02 (Hydraulic Lift 2)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-red-950 text-red-400 font-mono font-bold text-[10px] border border-red-800">
                LIVE 1080P • RECORDING
              </span>
            </div>

            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              <img
                src={
                  bayCamera?.thumbnailUrl ||
                  'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1000&auto=format&fit=crop&q=80'
                }
                alt="Bay 2 Camera Feed"
                className="w-full h-full object-cover opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Camera Overlays */}
              <div className="absolute top-4 left-4 text-xs font-mono text-emerald-400 bg-black/75 px-3 py-1 rounded-lg border border-emerald-500/30">
                CAM-02: {currentWO?.vehicleInfo}
              </div>

              <div className="absolute top-4 right-4 text-xs font-mono text-slate-300 bg-black/75 px-3 py-1 rounded-lg border border-slate-700">
                {new Date().toLocaleTimeString()}
              </div>

              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-xs text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="font-bold">Active Operation: Ceramic Brake Pad Installation</div>
                  <div className="text-[11px] text-slate-400">
                    Mechanic: Dara Kim • Torque wrench check in progress
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                  Bay Camera Active
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Encrypted customer video stream (TLS 1.3)</span>
              <span className="text-slate-300 font-medium">Auto-refreshes every 3 seconds</span>
            </div>
          </div>

          {/* Quick Health Summary & Technician Notes */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Technician Diagnostic Notes</span>
              </h3>

              <div className="space-y-3 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Intake Diagnosis by Master Tech Dara Kim:
                  </div>
                  Rotors showed 0.08mm lateral runout exceeding factory 0.04mm spec. Lathe resurfacing completed within 0.01mm tolerance. Installing fresh Akebono ceramic pads with molybdenum disulfide lubricant on sliding shims.
                </div>

                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-slate-300">
                  <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
                    Quality Inspection Roadmap:
                  </div>
                  Post-assembly road test scheduled for 03:30 PM. Vehicle will receive exterior foam wash and tire shine before handover.
                </div>
              </div>
            </div>

            {/* Quick Cost Breakdown */}
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-white">Estimated Invoice Summary</span>
                <span className="text-xs text-emerald-400 font-bold">Guaranteed Upfront Quote</span>
              </div>

              <div className="space-y-2 text-xs text-slate-300 border-t border-slate-800/80 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Genuine OEM Parts ({partsUsed.length} items):</span>
                  <span className="font-mono text-white">${totalPartsCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Certified Mechanic Labor:</span>
                  <span className="font-mono text-white">$120.00</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">60-Point Inspection & Digital Scan:</span>
                  <span className="font-mono text-emerald-400">FREE ($35.00 Value)</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-sm">
                  <span className="text-white">Estimated Total:</span>
                  <span className="text-emerald-400 font-mono">${(totalPartsCost + 120.0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB B: REPAIR TASKS (READ ONLY FOR CUSTOMER) */}
      {activeTrackingTab === 'TASKS' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Work Order Repair Tasks</h3>
              <p className="text-xs text-slate-400">Detailed line-by-line task checklist handled by certified technicians.</p>
            </div>
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
              Customer View (Verified Live)
            </span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-950 p-4 rounded-2xl border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 max-w-xl">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{task.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      task.priority === 'HIGH'
                        ? 'bg-red-500/15 text-red-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {task.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{task.description}</p>
                  <div className="text-[11px] text-slate-500">
                    Mechanic: <strong className="text-slate-300">{task.assignedToName}</strong> • Est: {task.estimatedHours}h
                  </div>
                </div>

                <div className="shrink-0 flex sm:flex-col items-end justify-between gap-1">
                  {task.status === 'COMPLETED' && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Completed</span>
                    </span>
                  )}
                  {task.status === 'IN_PROGRESS' && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                      <span>In Progress</span>
                    </span>
                  )}
                  {task.status === 'PENDING' && (
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700">
                      Pending
                    </span>
                  )}

                  {task.completedAt && (
                    <span className="text-[10px] text-slate-500 font-mono">{task.completedAt}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB C: VEHICLE INSPECTION REPORT (Pre-repair & Final Condition) */}
      {activeTrackingTab === 'INSPECTION' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Pre-Repair Digital Intake Inspection Report</h3>
                <p className="text-xs text-slate-400">
                  Recorded upon arrival: {currentWO?.vehicleInfo}
                </p>
              </div>

              <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                Customer Confirmation: Confirmed ✓
              </span>
            </div>

            {/* Gauge Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Intake Mileage
                </span>
                <span className="text-lg font-black text-white font-mono mt-1 block">42,500 km</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Fuel Level
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Fuel className="w-4 h-4 text-amber-400" />
                  <span className="text-lg font-black text-white font-mono">65%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
                  <div className="bg-amber-400 h-full rounded-full w-[65%]" />
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Exterior Condition
                </span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">Good (Clean)</span>
                <span className="text-[10px] text-slate-500">Minor chip on bumper</span>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                  Engine & Battery
                </span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block">Optimal Health</span>
                <span className="text-[10px] text-slate-500">12.6V resting charge</span>
              </div>
            </div>

            {/* Condition Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wide">
                  Existing Exterior & Interior Conditions
                </h4>
                <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Small 1.5cm surface scratch on front-right fender (no metal exposure).</li>
                  <li>Slight curb rash on front-left 18&quot; alloy rim outer edge.</li>
                  <li>Interior upholstery clean with factory floor mats in place.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wide">
                  Post-Repair Final Condition Guarantee
                </h4>
                <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
                  <li>Brake friction material renewed to 100% factory specifications.</li>
                  <li>Rotors polished and balanced, zero shudder at high speed.</li>
                  <li>Complimentary engine bay dust-clean and tire conditioning.</li>
                </ul>
              </div>
            </div>

            {/* Clickable Inspection Photos Gallery */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-400" />
                  <span>Inspection Photos (Click to Zoom Lightbox)</span>
                </h4>
                <span className="text-xs text-slate-400">4 high-resolution photos</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {inspectionPhotos.map((photo) => (
                  <div
                    key={photo.title}
                    onClick={() => setLightboxPhoto(photo)}
                    className="group bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 hover:border-blue-500 cursor-pointer transition-all relative"
                  >
                    <img
                      src={photo.url}
                      alt={photo.title}
                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="p-2.5">
                      <div className="text-xs font-bold text-white truncate">{photo.title}</div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">{photo.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB D: PARTS INSTALLED */}
      {activeTrackingTab === 'PARTS' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Parts Used & Inventory Allocation</h3>
              <p className="text-xs text-slate-400">
                100% serialized genuine components installed during this service.
              </p>
            </div>
            <span className="text-sm font-mono font-black text-emerald-400">
              Total Parts: ${totalPartsCost.toFixed(2)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3">Part Description</th>
                  <th className="p-3">Part Number</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {partsUsed.map((part) => (
                  <tr key={part.partId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{part.partName}</td>
                    <td className="p-3 font-mono text-slate-400">{part.partNumber}</td>
                    <td className="p-3 text-center">{part.quantity}</td>
                    <td className="p-3 text-right font-mono">${part.unitPrice.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      ${part.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-950 font-bold border-t border-slate-800">
                <tr>
                  <td colSpan={4} className="p-3 text-right text-slate-300">
                    Total Genuine Parts:
                  </td>
                  <td className="p-3 text-right font-mono text-emerald-400 text-sm">
                    ${totalPartsCost.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {onNavigateToParts && (
            <div className="mt-4 p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Need Additional Components or Consumables?</h4>
                  <p className="text-[11px] text-slate-400">
                    Browse certified OEM brake pads, fluids, or filters guaranteed to fit your vehicle.
                  </p>
                </div>
              </div>
              <button
                onClick={onNavigateToParts}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <span>Browse Parts & Products</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={lightboxPhoto.url}
              alt={lightboxPhoto.title}
              className="w-full h-96 object-cover"
            />

            <div className="p-6 bg-slate-900 space-y-2">
              <h4 className="text-lg font-bold text-white">{lightboxPhoto.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{lightboxPhoto.note}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
