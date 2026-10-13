import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  Sparkles,
  Fuel,
  Camera,
  Package
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { CustomerPartRequestRow, listCustomerPartRequests } from '../../api/garage';

function trackingStatusTone(status?: string) {
  switch (status) {
    case 'PENDING':
      return {
        bar: 'bg-orange-700',
        text: 'text-orange-700',
        badge: 'bg-orange-50 text-orange-800 border-orange-200',
        dot: 'bg-orange-600',
      };
    case 'WAITING_APPROVAL':
    case 'QUALITY_CHECK':
    case 'WAITING_PARTS':
      return {
        bar: 'bg-amber-600',
        text: 'text-amber-700',
        badge: 'bg-amber-50 text-amber-800 border-amber-200',
        dot: 'bg-amber-600',
      };
    case 'READY_FOR_PICKUP':
    case 'COMPLETED':
    case 'DELIVERED':
      return {
        bar: 'bg-emerald-600',
        text: 'text-emerald-700',
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-600',
      };
    case 'CANCELLED':
      return {
        bar: 'bg-rose-600',
        text: 'text-rose-700',
        badge: 'bg-rose-50 text-rose-800 border-rose-200',
        dot: 'bg-rose-600',
      };
    default:
      return {
        bar: 'bg-blue-600',
        text: 'text-blue-700',
        badge: 'bg-blue-50 text-blue-800 border-blue-200',
        dot: 'bg-blue-600',
      };
  }
}

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

function StaffFace({ name, photo, light }: { name: string; photo?: string; light?: boolean }) {
  if (photo) {
    return <img src={photo} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />;
  }
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  return (
    <span
      className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
        light ? 'bg-slate-200 text-slate-700' : 'bg-slate-800 text-slate-200'
      }`}
    >
      {letter}
    </span>
  );
}

export const CustomerWorkOrderTracking: React.FC<CustomerWorkOrderTrackingProps> = ({
  defaultWorkOrderId,
  onNavigateToParts
}) => {
  const { workOrders, vehicles, estimates, invoices, currentUser, theme, approveEstimate, rejectEstimate } = useApp();
  const isDark = theme === 'dark';
  const navigate = useNavigate();

  // Pick customer work orders
  const customerWorkOrders = (workOrders || []).filter((wo) => belongsToCurrentCustomer(currentUser, wo));

  const [jobParams, setJobParams] = useSearchParams();
  const jobQuery = jobParams.get('job');
  const [selectedWOId, setSelectedWOId] = useState<string>(defaultWorkOrderId || '');
  const [listTab, setListTab] = useState<'ACTIVE' | 'WAITING' | 'READY' | 'FINISHED' | 'ALL'>('ALL');
  const [partRequests, setPartRequests] = useState<CustomerPartRequestRow[]>([]);
  const [partsExpanded, setPartsExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  useEffect(() => {
    if (!jobQuery) {
      if (!defaultWorkOrderId) setSelectedWOId('');
      return;
    }
    const match = customerWorkOrders.find((wo) => wo.workOrderNumber === jobQuery || wo.id === jobQuery);
    setSelectedWOId(match ? match.id : '');
    setPartsExpanded(false);
    setServicesExpanded(false);
  }, [jobQuery, workOrders, defaultWorkOrderId]);

  useEffect(() => {
    let cancelled = false;
    listCustomerPartRequests()
      .then((rows) => {
        if (!cancelled) setPartRequests(rows);
      })
      .catch(() => {
        if (!cancelled) setPartRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [workOrders]);

  const openVisit = (workOrderId: string, workOrderNumber: string) => {
    setSelectedWOId(workOrderId);
    setJobParams({ job: workOrderNumber || workOrderId });
  };

  // Active work order. The list stays up until a visit is chosen.
  const currentWO = customerWorkOrders.find((w) => w.id === selectedWOId);

  // Associated vehicle
  const currentVehicle = (vehicles || []).find((v) => v.id === currentWO?.vehicleId);

  // Active tab within the work order tracking screen
  const [activeTrackingTab, setActiveTrackingTab] = useState<'OVERVIEW' | 'TASKS' | 'INSPECTION' | 'PARTS' | 'CCTV'>(
    jobParams.get('tab') === 'PARTS' ? 'PARTS' : 'OVERVIEW'
  );

  const partsUsed = currentWO?.partsUsed || [];
  const visitPartRequests = useMemo(
    () =>
      partRequests.filter(
        (row) =>
          currentWO?.bookingId &&
          row.bookingId === currentWO.bookingId &&
          row.fulfillment === 'INSTALL_IN_WORKSHOP'
      ),
    [partRequests, currentWO?.bookingId]
  );

  const totalPartsCost = partsUsed.reduce((acc, p) => acc + ((p as { total?: number; totalPrice?: number }).total ?? p.totalPrice ?? 0), 0);
  // Hide quote requests already covered by issued stock (same SKU/name × qty) so totals are not double-counted.
  const openPartRequests = useMemo(() => {
    const issuedQty = new Map<string, number>();
    for (const part of partsUsed) {
      const qty = Math.max(1, Number(part.quantity) || 1);
      for (const value of [part.partNumber, part.partName]) {
        const key = (value || '').trim().toLowerCase();
        if (!key) continue;
        issuedQty.set(key, (issuedQty.get(key) || 0) + qty);
      }
    }
    return visitPartRequests.filter((row) => {
      if (row.issued || row.status === 'CANCELLED') return false;
      const keys = [row.sku, row.productName]
        .map((value) => (value || '').trim().toLowerCase())
        .filter(Boolean);
      for (const key of keys) {
        const left = issuedQty.get(key) || 0;
        if (left > 0) {
          issuedQty.set(key, left - 1);
          return false;
        }
      }
      return true;
    });
  }, [visitPartRequests, partsUsed]);
  const groupedOpenPartRequests = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        productName: string;
        sku: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        numbers: string[];
        status: string;
      }
    >();
    for (const row of openPartRequests) {
      const key = `${(row.sku || '').trim().toLowerCase()}|${(row.productName || '').trim().toLowerCase()}`;
      const existing = groups.get(key);
      if (existing) {
        existing.quantity += 1;
        existing.lineTotal += row.price || 0;
        existing.numbers.push(row.number);
      } else {
        groups.set(key, {
          key,
          productName: row.productName,
          sku: row.sku,
          quantity: 1,
          unitPrice: row.price || 0,
          lineTotal: row.price || 0,
          numbers: [row.number],
          status: row.status,
        });
      }
    }
    return [...groups.values()];
  }, [openPartRequests]);
  const requestedPartsCost = openPartRequests.reduce((sum, row) => sum + (row.price || 0), 0);
  const partsLineTotal = totalPartsCost + requestedPartsCost;

  const tasks: ClientRepairTask[] = (currentWO?.tasks || []).map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status === 'COMPLETED' ? 'COMPLETED' : task.status === 'PENDING' ? 'PENDING' : 'IN_PROGRESS',
    priority: task.priority,
    assignedToName: task.technicianName,
    assignedToId: task.technicianId,
    estimatedHours: task.estimatedHours,
    actualHours: task.actualHours || 0,
    completedAt: task.completedAt,
  }));

  const report = currentWO?.beforeInspection;

  const linkedQuote = (estimates || []).find(
    (e) => e.workOrderId === currentWO?.id && (e.status === 'WAITING_APPROVAL' || e.status === 'SENT')
  );
  const jobQuote = (estimates || []).find((e) => e.workOrderId === currentWO?.id);
  const jobInvoice = (invoices || []).find((bill) => bill.workOrderId === currentWO?.id);
  const visitServiceTotal = (currentWO?.visitServices || []).reduce((sum, row) => sum + (row.price || 0), 0);
  const laborAmount = currentWO?.laborCost || jobInvoice?.items?.filter((i) => i.type === 'LABOR').reduce((s, i) => s + (i.totalPrice || 0), 0) || 0;
  const serviceAmount =
    currentWO?.serviceCost ||
    visitServiceTotal ||
    jobInvoice?.items?.filter((i) => i.type === 'SERVICE').reduce((s, i) => s + (i.totalPrice || 0), 0) ||
    0;
  // Tracking summary must match the lines shown: services + labor + issued + still-requested parts.
  const lineQuoteTotal =
    laborAmount +
    serviceAmount +
    partsLineTotal -
    (currentWO?.discountAmount || 0) +
    (currentWO?.taxAmount || 0);
  const quotedAmount =
    lineQuoteTotal > 0
      ? lineQuoteTotal
      : jobQuote?.estimatedTotal ||
        currentWO?.estimatedCost ||
        currentWO?.invoiceTotal ||
        jobInvoice?.totalAmount ||
        0;
  const progress = Math.max(0, Math.min(100, currentWO?.tasks?.[0]?.progress ?? 0));
  const dueDate = currentWO?.tasks?.[0]?.dueDate || '';
  const visitServices = currentWO?.visitServices || [];
  const serviceLines = useMemo(() => {
    if (visitServices.length > 0) {
      return visitServices.map((row, index) => ({
        key: String(row.id ?? `${row.name}-${index}`),
        name: row.name,
        price: row.price || 0,
        detail: row.primary ? 'primary' : 'added',
      }));
    }
    return (jobInvoice?.items || [])
      .filter((item) => item.type === 'SERVICE')
      .map((item, index) => ({
        key: `inv-service-${item.id ?? index}`,
        name: item.description || 'Service',
        price: item.totalPrice || 0,
        detail: '',
      }));
  }, [visitServices, jobInvoice]);
  const canExpandServices = serviceLines.length > 1;

  const statusLabel = (status?: string) => {
    switch (status) {
      case 'PENDING':
        return 'Waiting';
      case 'ASSIGNED':
        return 'Inspection';
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
    { title: 'Waiting', key: 'PENDING' },
    { title: 'Inspection', key: 'ASSIGNED' },
    { title: 'Quote approval', key: 'WAITING_APPROVAL' },
    { title: 'Repairing', key: 'IN_PROGRESS' },
    { title: 'Quality check', key: 'QUALITY_CHECK' },
    { title: 'Ready for pickup', key: 'READY_FOR_PICKUP' },
  ].map((step) => {
    const order = [
      'PENDING',
      'ASSIGNED',
      'WAITING_APPROVAL',
      'IN_PROGRESS',
      'WAITING_PARTS',
      'QUALITY_CHECK',
      'READY_FOR_PICKUP',
      'COMPLETED',
      'DELIVERED',
    ];
    const current = currentWO?.status || 'IN_PROGRESS';
    const cIdx = order.indexOf(current);
    const sIdx = order.indexOf(step.key);
    let status: 'completed' | 'current' | 'upcoming' = 'upcoming';
    if (current === 'COMPLETED' || current === 'DELIVERED') {
      status = 'completed';
      if (step.key === 'READY_FOR_PICKUP') status = 'completed';
    } else if (current === 'READY_FOR_PICKUP') {
      status = sIdx < order.indexOf('READY_FOR_PICKUP') ? 'completed' : step.key === 'READY_FOR_PICKUP' ? 'current' : 'upcoming';
    } else if (sIdx < cIdx || (current === 'WAITING_PARTS' && sIdx <= order.indexOf('IN_PROGRESS'))) {
      status = 'completed';
    } else if (step.key === current || (current === 'WAITING_PARTS' && step.key === 'IN_PROGRESS')) {
      status = 'current';
    }
    return { title: step.title, status };
  });

  const visitCards = useMemo(() => {
    const openStatuses = [
      'PENDING',
      'ASSIGNED',
      'IN_PROGRESS',
      'WAITING_APPROVAL',
      'WAITING_PARTS',
      'QUALITY_CHECK',
      'READY_FOR_PICKUP',
    ];
    const filtered = customerWorkOrders.filter((wo) => {
      // Waiting (0%) and every other open workshop stage stay on Tracking.
      if (listTab === 'ACTIVE') {
        return openStatuses.includes(wo.status) && wo.status !== 'READY_FOR_PICKUP' && wo.status !== 'WAITING_APPROVAL';
      }
      if (listTab === 'WAITING') return wo.status === 'WAITING_APPROVAL';
      if (listTab === 'READY') return wo.status === 'READY_FOR_PICKUP';
      if (listTab === 'FINISHED') return wo.status === 'COMPLETED' || wo.status === 'DELIVERED';
      return true;
    });
    return [...filtered].sort((left, right) => {
      const parked = (status?: string) => (status === 'COMPLETED' || status === 'DELIVERED' || status === 'CANCELLED' ? 1 : 0);
      const rank = parked(left.status) - parked(right.status);
      if (rank !== 0) return rank;
      // Newer / earlier-stage (including 0% Waiting) first.
      return (left.tasks?.[0]?.progress ?? 0) - (right.tasks?.[0]?.progress ?? 0);
    });
  }, [customerWorkOrders, listTab]);
  const vehicleCount = new Set(customerWorkOrders.map((wo) => wo.vehicleId).filter(Boolean)).size;

  if (!currentWO) {
    return (
      <div className="space-y-5">
        <div className={`rounded-3xl border p-6 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h2 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Tracking</h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {customerWorkOrders.length === 0
              ? 'When a car is booked into the workshop, its repair shows up here.'
              : `${vehicleCount} ${vehicleCount === 1 ? 'vehicle' : 'vehicles'} · ${customerWorkOrders.length} ${customerWorkOrders.length === 1 ? 'repair' : 'repairs'}. Open one to follow the work.`}
          </p>
        </div>

        <div
          className={`flex flex-wrap p-1.5 rounded-2xl gap-2 border ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-slate-100/80 border-slate-200'
          }`}
        >
          {(
            [
              { id: 'ACTIVE', label: 'In workshop' },
              { id: 'WAITING', label: 'Needs approval' },
              { id: 'READY', label: 'Ready' },
              { id: 'FINISHED', label: 'Finished' },
              { id: 'ALL', label: 'All' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setListTab(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                listTab === tab.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isDark
                    ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {visitCards.length === 0 ? (
          <div
            className={`rounded-3xl border p-10 text-center text-sm ${
              isDark ? 'bg-slate-900/40 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            No repairs in this group.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {visitCards.map((wo) => {
              const car = (vehicles || []).find((item) => item.id === wo.vehicleId);
              const photo = car?.imageUrl || car?.image || '';
              const progressValue = Math.max(0, Math.min(100, wo.tasks?.[0]?.progress ?? 0));
              const tone = trackingStatusTone(wo.status);
              return (
                <button
                  key={wo.id}
                  type="button"
                  onClick={() => openVisit(wo.id, wo.workOrderNumber)}
                  className={`text-left rounded-3xl border overflow-hidden flex transition-all hover:-translate-y-0.5 ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-blue-500/40' : 'bg-white border-slate-200 hover:border-blue-300 shadow-sm'
                  }`}
                >
                  <span className={`w-1.5 shrink-0 ${tone.bar}`} />
                  <span className="flex-1 p-4 space-y-3">
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className={`block text-[11px] font-mono font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                          {wo.workOrderNumber || 'Repair'}
                        </span>
                        <span className={`block text-base font-black truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {wo.vehicleInfo || 'Vehicle'}
                        </span>
                      </span>
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border shrink-0 ${
                          isDark
                            ? 'bg-slate-950 text-white border-slate-700'
                            : 'bg-slate-100 text-slate-800 border-slate-200'
                        }`}
                      >
                        {wo.vehiclePlate || 'No plate'}
                      </span>
                    </span>
                    {photo ? (
                      <img src={photo} alt="" className="h-24 w-full object-cover rounded-2xl" />
                    ) : null}
                    <span className={`block text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {wo.reportedProblem || 'No problem notes yet.'}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold ${tone.text}`}>{wo.statusLabel || statusLabel(wo.status)}</span>
                      <span className={`text-[11px] font-mono shrink-0 ${tone.text}`}>{progressValue}%</span>
                    </span>
                    <span className={`block h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <span className={`block h-full ${tone.bar}`} style={{ width: `${progressValue}%` }} />
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => {
          setSelectedWOId('');
          setJobParams({});
        }}
        className={`inline-flex items-center gap-2 text-xs font-bold ${isDark ? 'text-slate-300 hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
      >
        <ArrowLeft className="w-4 h-4" />
        All tracking
      </button>

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

      {currentWO?.status === 'WAITING_APPROVAL' && (
        <div
          className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isDark ? 'border-amber-500/30 bg-amber-950/30' : 'border-amber-200 bg-amber-50'
          }`}
        >
          <div className="text-sm">
            <div className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Quote ready for {currentWO.workOrderNumber}
            </div>
            <p className={`text-xs mt-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Inspection is done. Open Quotes to review the planned services, extras, parts, and total before repair continues.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              navigate(`/quotes?job=${encodeURIComponent(currentWO.workOrderNumber || currentWO.id)}`)
            }
            className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
          >
            Open quote
          </button>
        </div>
      )}

      {linkedQuote && currentWO?.status !== 'WAITING_APPROVAL' && (
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
                {currentWO?.workOrderNumber || 'No job'}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${trackingStatusTone(currentWO?.status).badge}`}>
                <span className={`w-2 h-2 rounded-full ${trackingStatusTone(currentWO?.status).dot} ${currentWO?.status === 'COMPLETED' || currentWO?.status === 'CANCELLED' || currentWO?.status === 'DELIVERED' ? '' : 'animate-pulse'}`} />
                <span>{currentWO?.statusLabel || statusLabel(currentWO?.status)}</span>
              </span>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
                Priority: {currentWO?.priority || 'HIGH'}
              </span>
            </div>

            <h2 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {currentWO?.vehicleInfo || 'No vehicle on this job'}
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
                {currentWO?.reportedProblem || currentWO?.problemDescription || 'Not recorded'}
              </p>
            </div>
            {(visitServices.length > 0 || partsUsed.length > 0 || openPartRequests.length > 0) && (
              <div
                className={`p-3.5 rounded-2xl border text-xs ${
                  isDark ? 'bg-slate-950/70 border-slate-800 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span className="text-slate-500 block text-[10px] font-bold uppercase tracking-wider mb-2">
                  On this visit
                </span>
                {visitServices.length > 0 && (
                  <div className="space-y-1.5">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Services
                    </span>
                    <ul className="space-y-1.5">
                      {visitServices.map((row, index) => (
                        <li key={`${row.name}-${index}`} className="flex justify-between gap-3 font-medium">
                          <span>
                            {row.name}
                            {!row.primary && (
                              <span className="ml-1.5 text-[10px] uppercase text-slate-500">extra</span>
                            )}
                          </span>
                          <span className="font-mono shrink-0">${(row.price || 0).toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(partsUsed.length > 0 || openPartRequests.length > 0) && (
                  <div
                    className={`space-y-1.5 ${
                      visitServices.length > 0
                        ? `mt-3 pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200'}`
                        : ''
                    }`}
                  >
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      Parts
                    </span>
                    <ul className="space-y-1.5">
                      {groupedOpenPartRequests.map((row) => (
                        <li key={`req-${row.key}`} className="flex justify-between gap-3 font-medium">
                          <span>
                            {row.productName}
                            {row.quantity > 1 ? ` ×${row.quantity}` : ''}
                            <span className="ml-1.5 text-[10px] uppercase text-amber-600">
                              {row.status === 'CONFIRMED' ? 'confirmed' : row.status === 'NOTED' ? 'noted' : 'requested'}
                            </span>
                          </span>
                          <span className="font-mono shrink-0">${row.lineTotal.toFixed(2)}</span>
                        </li>
                      ))}
                      {partsUsed.map((part) => (
                        <li key={`issued-${part.partId}`} className="flex justify-between gap-3 font-medium">
                          <span>
                            {part.partName}
                            {part.quantity > 1 ? ` ×${part.quantity}` : ''}
                            <span className="ml-1.5 text-[10px] uppercase text-emerald-600">issued</span>
                          </span>
                          <span className="font-mono shrink-0">
                            ${((part as { total?: number; totalPrice?: number }).total ?? part.totalPrice ?? 0).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
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
              <span className="text-slate-500 text-[10px] block font-semibold">Estimated cost</span>
              <span className="font-black text-emerald-600 font-mono text-sm mt-0.5 block">
                {quotedAmount > 0 ? `$${quotedAmount.toFixed(2)}` : 'Not quoted'}
              </span>
            </div>

            <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-500 text-[10px] block font-semibold">Est. completion</span>
              <span className={`font-bold mt-0.5 block ${isDark ? 'text-white' : 'text-slate-900'}`}>{dueDate || 'Not set'}</span>
            </div>

            <div className={`p-3 rounded-xl border col-span-2 sm:col-span-3 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-slate-500 text-[10px] block font-semibold">Work order intake date</span>
              <span className={`font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {currentWO?.createdAt || 'Not recorded'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 relative z-10">
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <StaffFace
              name={currentWO?.beforeInspection?.inspectorName || ''}
              photo={currentWO?.beforeInspection?.inspectorPhoto}
              light={!isDark}
            />
            <div>
              <span className="text-slate-500 text-[10px] block font-semibold">Inspected by</span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentWO?.beforeInspection?.inspectorName || 'Not recorded'}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl border flex items-center gap-3 ${isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <StaffFace
              name={currentWO?.assignedTechnicianName || ''}
              photo={currentWO?.assignedTechnicianPhoto}
              light={!isDark}
            />
            <div>
              <span className="text-slate-500 text-[10px] block font-semibold">Repaired by</span>
              <span className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {currentWO?.assignedTechnicianName || 'Unassigned'}
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
              <span className={`text-sm font-black font-mono ${trackingStatusTone(currentWO?.status).text}`}>{progress}% complete</span>
            </div>

            <div className={`w-full h-3 rounded-full overflow-hidden p-0.5 border ${isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
              <div
                className={`h-full rounded-full transition-all duration-500 ${trackingStatusTone(currentWO?.status).bar}`}
                style={{ width: `${progress}%` }}
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
      <div
        className={`flex flex-wrap p-1.5 rounded-2xl gap-2 overflow-x-auto border ${
          isDark ? 'border-slate-800 bg-slate-900/60' : 'border-slate-200 bg-slate-100/80'
        }`}
      >
        <button
          onClick={() => setActiveTrackingTab('OVERVIEW')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeTrackingTab === 'OVERVIEW'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
          }`}
        >
          Detailed Summary
        </button>

        <button
          onClick={() => setActiveTrackingTab('TASKS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'TASKS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Repair Tasks ({tasks.length})</span>
        </button>

        <button
          onClick={() => setActiveTrackingTab('INSPECTION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'INSPECTION'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Vehicle Inspection Report</span>
        </button>

        <button
          onClick={() => setActiveTrackingTab('PARTS')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
            activeTrackingTab === 'PARTS'
              ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
              : isDark
                ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                : 'text-slate-500 hover:text-slate-900 hover:bg-white'
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
              : isDark
                ? 'text-red-400 hover:bg-red-950/40'
                : 'text-red-600 hover:bg-red-50'
          }`}
        >
          <Video className="w-3.5 h-3.5 animate-pulse" />
          <span>Bay camera</span>
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
                <span className="font-bold text-white">Bay camera</span>
              </div>
              <span className="px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold text-[10px] border border-slate-700">
                No feed
              </span>
            </div>

            <div className="relative aspect-video bg-slate-950 flex items-center justify-center overflow-hidden">
              <p className="text-sm text-slate-400 px-6 text-center">No camera is connected to this repair.</p>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Camera Overlays */}
              <div className="absolute top-4 left-4 text-xs font-mono text-emerald-400 bg-black/75 px-3 py-1 rounded-lg border border-emerald-500/30">
                No camera
              </div>

              <div className="absolute top-4 right-4 text-xs font-mono text-slate-300 bg-black/75 px-3 py-1 rounded-lg border border-slate-700">
                {new Date().toLocaleTimeString()}
              </div>

              <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 text-xs text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <div className="font-bold">{currentWO?.reportedProblem || 'No live operation'}</div>
                  <div className="text-[11px] text-slate-400">
                    {currentWO?.assignedTechnicianName || 'No mechanic is assigned on camera.'}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-bold text-xs">
                  No feed
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>The garage has not connected a camera to this job.</span>
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
                    Job status
                  </div>
                  <span className={`font-bold ${trackingStatusTone(currentWO?.status).text}`}>
                    {currentWO?.statusLabel || statusLabel(currentWO?.status)}
                  </span>
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
                <div>
                  <button
                    type="button"
                    onClick={() => setPartsExpanded((open) => !open)}
                    disabled={partsUsed.length === 0 && openPartRequests.length === 0}
                    className="w-full flex items-center justify-between gap-2 text-left disabled:cursor-default"
                  >
                    <span className="text-slate-400 inline-flex items-center gap-1.5">
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          partsExpanded ? 'rotate-0' : '-rotate-90'
                        } ${partsUsed.length === 0 && openPartRequests.length === 0 ? 'opacity-30' : ''}`}
                      />
                      Parts ({partsUsed.length} issued
                      {openPartRequests.length ? ` · ${openPartRequests.length} requested` : ''}):
                    </span>
                    <span className="font-mono text-white">${partsLineTotal.toFixed(2)}</span>
                  </button>
                  {partsExpanded && (partsUsed.length > 0 || openPartRequests.length > 0) && (
                    <ul className="mt-2 space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                      {groupedOpenPartRequests.map((row) => (
                        <li key={row.key} className="flex justify-between gap-3 text-[11px]">
                          <span className="min-w-0 text-slate-300">
                            {row.productName}
                            {row.quantity > 1 ? ` (x${row.quantity})` : ''}
                            <span className="block font-mono text-[10px] text-amber-400/90">
                              {row.quantity > 1
                                ? `${row.numbers[0]}… · requested`
                                : `${row.numbers[0]} · requested`}
                            </span>
                          </span>
                          <span className="font-mono text-slate-200 shrink-0">${row.lineTotal.toFixed(2)}</span>
                        </li>
                      ))}
                      {partsUsed.map((part) => (
                        <li key={part.partId} className="flex justify-between gap-3 text-[11px]">
                          <span className="min-w-0 text-slate-300">
                            {part.partName}
                            <span className="block font-mono text-[10px] text-emerald-400/90">
                              {part.partNumber || '—'} · issued ×{part.quantity}
                            </span>
                          </span>
                          <span className="font-mono text-slate-200 shrink-0">
                            ${((part as { total?: number; totalPrice?: number }).total ?? part.totalPrice ?? 0).toFixed(2)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setServicesExpanded((open) => !open)}
                    disabled={!canExpandServices}
                    className="w-full flex items-center justify-between gap-2 text-left disabled:cursor-default"
                  >
                    <span className="text-slate-400 inline-flex items-center gap-1.5">
                      <ChevronDown
                        className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                          servicesExpanded && canExpandServices ? 'rotate-0' : '-rotate-90'
                        } ${canExpandServices ? '' : 'opacity-30'}`}
                      />
                      Approved services ({serviceLines.length}):
                    </span>
                    <span className="font-mono text-white">${serviceAmount.toFixed(2)}</span>
                  </button>
                  {servicesExpanded && canExpandServices && (
                    <ul className="mt-2 space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-2.5">
                      {serviceLines.map((row) => (
                        <li key={row.key} className="flex justify-between gap-3 text-[11px]">
                          <span className="min-w-0 text-slate-300">
                            {row.name}
                            {row.detail ? (
                              <span className="block font-mono text-[10px] text-blue-400/90">{row.detail}</span>
                            ) : null}
                          </span>
                          <span className="font-mono text-slate-200 shrink-0">${row.price.toFixed(2)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mechanic labor:</span>
                  <span className="font-mono text-white">${laborAmount.toFixed(2)}</span>
                </div>
                {(currentWO?.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-emerald-300">
                    <span>Discount</span>
                    <span className="font-mono">−${(currentWO?.discountAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                {(currentWO?.taxAmount || 0) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax</span>
                    <span className="font-mono text-white">${(currentWO?.taxAmount || 0).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-slate-800 font-bold text-sm">
                  <span className="text-white">Approved quote total:</span>
                  <span className="text-emerald-400 font-mono">
                    {quotedAmount > 0 ? `$${quotedAmount.toFixed(2)}` : 'Not quoted'}
                  </span>
                </div>
                {jobInvoice && (
                  <div className="flex justify-between items-center pt-1 text-[11px]">
                    <span className="text-slate-500">
                      Invoice {jobInvoice.invoiceNumber}
                      {jobInvoice.status ? ` · ${jobInvoice.status}` : ''}
                      {jobInvoice.amountPaid > 0 ? ` · paid $${jobInvoice.amountPaid.toFixed(2)}` : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/invoices?invoice=${encodeURIComponent(jobInvoice.invoiceNumber)}`)
                      }
                      className="font-semibold text-blue-400 hover:text-blue-300"
                    >
                      Open invoice
                    </button>
                  </div>
                )}
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">Check-in inspection</h3>
                <p className="text-xs text-slate-400">
                  Recorded when the car arrived: {currentWO?.vehicleInfo}
                </p>
              </div>
              {report ? (
                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <StaffFace name={report.inspectorName} photo={report.inspectorPhoto} />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Inspected by</span>
                    <strong className="text-sm text-white">{report.inspectorName || 'Not recorded'}</strong>
                    {report.inspectionDate && (
                      <span className="block text-[11px] text-slate-400">{report.inspectionDate}</span>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {report ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                      Intake mileage
                    </span>
                    <span className="text-lg font-black text-white font-mono mt-1 block">
                      {report.mileage.toLocaleString()} km
                    </span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                      Fuel level
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <Fuel className="w-4 h-4 text-amber-400" />
                      <span className="text-lg font-black text-white font-mono">{report.fuelLabel || 'Not recorded'}</span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 sm:col-span-2">
                    <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">
                      Condition
                    </span>
                    <span className="text-sm font-medium text-white mt-1 block">
                      {report.conditionSummary || 'No condition note.'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wide">Damage noted</h4>
                    <p className="text-slate-300 leading-relaxed">{report.damageSummary || 'No damage recorded.'}</p>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                    <h4 className="font-bold text-white uppercase text-[11px] tracking-wide">Complaint</h4>
                    <p className="text-slate-300 leading-relaxed">{report.complaint || 'No complaint recorded.'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <StaffFace name={currentWO?.assignedTechnicianName || ''} photo={currentWO?.assignedTechnicianPhoto} />
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 block">Repaired by</span>
                    <strong className="text-sm text-white">{currentWO?.assignedTechnicianName || 'Unassigned'}</strong>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">No inspection has been recorded for this job yet.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB D: PARTS INSTALLED */}
      {activeTrackingTab === 'PARTS' && (
        <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 sm:p-8 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-white">Parts on this visit</h3>
              <p className="text-xs text-slate-400">
                Requested on the quote and issued from the shelf for this repair.
              </p>
            </div>
            <span className="text-sm font-mono font-black text-emerald-400">
              Total: ${partsLineTotal.toFixed(2)}
            </span>
          </div>

          {groupedOpenPartRequests.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Requested on quote</h4>
              <ul className="space-y-1.5">
                {groupedOpenPartRequests.map((row) => (
                  <li
                    key={row.key}
                    className="flex justify-between gap-3 text-xs text-slate-200 bg-slate-950 rounded-xl px-3 py-2.5 border border-slate-800"
                  >
                    <span>
                      {row.productName}
                      {row.quantity > 1 ? ` (x${row.quantity})` : ''}
                      <span className="block text-[10px] font-mono text-slate-500">
                        {row.quantity > 1
                          ? `${row.numbers.join(' · ')} · ${row.status}`
                          : `${row.numbers[0]} · ${row.status}`}
                        {row.quantity > 1 ? ` · $${row.unitPrice.toFixed(2)} each` : ''}
                      </span>
                    </span>
                    <span className="font-mono text-slate-300">${row.lineTotal.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto">
            <h4 className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Issued from stock</h4>
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
                {partsUsed.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-slate-500">
                      No parts issued from stock yet. Quote requests stay listed above until the garage issues them.
                    </td>
                  </tr>
                )}
                {partsUsed.map((part) => (
                  <tr key={part.partId} className="hover:bg-slate-800/40">
                    <td className="p-3 font-bold text-white">{part.partName}</td>
                    <td className="p-3 font-mono text-slate-400">{part.partNumber}</td>
                    <td className="p-3 text-center">{part.quantity}</td>
                    <td className="p-3 text-right font-mono">${(part.unitPrice || 0).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      ${(part.totalPrice || 0).toFixed(2)}
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

    </div>
  );
};
