import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  Car,
  Wrench,
  CheckCircle2,
  Package,
  Ban,
  Fuel,
  Gauge,
  DollarSign,
  Sparkles,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { WorkOrder } from '../../types';
import {
  addBookingService,
  confirmCustomerPartPurchase,
  confirmCustomerRepair,
  CustomerPartRequestRow,
  declineCustomerRepair,
  listCustomerPartRequests,
  removeBookingService,
  withdrawCustomerPartRequest,
} from '../../api/garage';

interface CustomerQuotesViewProps {
  onTrackWorkOrder?: () => void;
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function serviceLinesFor(order: WorkOrder) {
  if ((order.visitServices || []).length > 0) return order.visitServices || [];
  return order.services.map((name) => ({ name, price: 0, primary: true }));
}

function quoteTotals(order: WorkOrder, visitParts: CustomerPartRequestRow[]) {
  const serviceLines = serviceLinesFor(order);
  const serviceTotal = serviceLines.reduce((sum, row) => sum + (row.price || 0), 0);
  const partsTotal = visitParts.reduce((sum, row) => sum + (row.price || 0), 0);
  const labor = order.laborCost || 0;
  const discount = order.discountAmount || 0;
  const tax = order.taxAmount || 0;
  const billedParts = order.partsCost || 0;
  return {
    serviceLines,
    serviceTotal,
    partsTotal,
    labor,
    discount,
    tax,
    billedParts,
    quoteTotal: serviceTotal + partsTotal + labor + billedParts - discount + tax,
  };
}

export const CustomerQuotesView: React.FC<CustomerQuotesViewProps> = () => {
  const navigate = useNavigate();
  const [jobParams, setJobParams] = useSearchParams();
  const jobQuery = jobParams.get('job');
  const { workOrders, vehicles, services, currentUser, addToast, refreshCustomerPortal, showConfirmDialog } =
    useApp();
  const [requests, setRequests] = useState<CustomerPartRequestRow[]>([]);
  const [busyId, setBusyId] = useState('');
  const [cancelFor, setCancelFor] = useState<WorkOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [extraServiceId, setExtraServiceId] = useState('');
  const [addingService, setAddingService] = useState(false);
  const [listTab, setListTab] = useState<'VISIT' | 'PARTS' | 'CONFIRMED' | 'ALL'>('ALL');

  const waiting = useMemo(
    () =>
      (workOrders || []).filter(
        (order) => belongsToCurrentCustomer(currentUser, order) && order.status === 'WAITING_APPROVAL'
      ),
    [workOrders, currentUser]
  );

  const partsOnlyRequests = useMemo(
    () =>
      requests.filter(
        (row) => row.fulfillment === 'PICKUP_AT_COUNTER' || row.fulfillment === 'DELIVERY'
      ),
    [requests]
  );

  const purchaseQuotes = useMemo(
    () => partsOnlyRequests.filter((row) => row.status === 'PENDING'),
    [partsOnlyRequests]
  );

  const confirmedPurchases = useMemo(
    () => partsOnlyRequests.filter((row) => row.status === 'NOTED' || row.status === 'CONFIRMED'),
    [partsOnlyRequests]
  );

  const confirmedVisits = useMemo(
    () =>
      (workOrders || []).filter(
        (order) =>
          belongsToCurrentCustomer(currentUser, order) &&
          ['IN_PROGRESS', 'WAITING_PARTS', 'QUALITY_CHECK', 'READY_FOR_PICKUP', 'COMPLETED', 'DELIVERED'].includes(
            order.status
          )
      ),
    [workOrders, currentUser]
  );

  const showVisitQuotes = listTab === 'ALL' || listTab === 'VISIT';
  // Parts buy = every pickup/delivery purchase (pending + already confirmed), not only open ones.
  const showPartsBuy = listTab === 'ALL' || listTab === 'PARTS';
  const showConfirmedParts = listTab === 'CONFIRMED';
  const showConfirmedVisits = listTab === 'ALL' || listTab === 'CONFIRMED';
  const visibleVisitQuotes = showVisitQuotes ? waiting : [];
  const visiblePartsBuy = showPartsBuy ? partsOnlyRequests : [];
  const visibleConfirmedParts = showConfirmedParts ? confirmedPurchases : [];
  const visibleConfirmedVisits = showConfirmedVisits ? confirmedVisits : [];
  const listEmpty =
    visibleVisitQuotes.length === 0 &&
    visiblePartsBuy.length === 0 &&
    visibleConfirmedParts.length === 0 &&
    visibleConfirmedVisits.length === 0;

  const selected = useMemo(() => {
    if (!jobQuery) return null;
    return (
      waiting.find((order) => order.workOrderNumber === jobQuery || order.id === jobQuery) || null
    );
  }, [waiting, jobQuery]);

  useEffect(() => {
    let cancelled = false;
    listCustomerPartRequests()
      .then((rows) => {
        if (!cancelled) setRequests(rows);
      })
      .catch(() => {
        if (!cancelled) setRequests([]);
      });
    return () => {
      cancelled = true;
    };
  }, [waiting.length, confirmedVisits.length, workOrders?.length]);

  const openQuote = (order: WorkOrder) => {
    setJobParams({ job: order.workOrderNumber || order.id });
  };

  const closeQuote = () => {
    setJobParams({});
  };

  const reload = async () => {
    await refreshCustomerPortal();
    setRequests(await listCustomerPartRequests().catch(() => []));
  };

  const confirmRepair = (order: WorkOrder, total: number) => {
    showConfirmDialog({
      title: `Confirm repair for ${order.workOrderNumber}?`,
      message: `Approve this visit for ${order.vehiclePlate}. The workshop continues into Repairing. Estimated total ${money(total)}. Payment stays on the invoice.`,
      confirmText: 'Confirm repair',
      variant: 'primary',
      onConfirm: () => {
        setBusyId(order.id);
        void confirmCustomerRepair(order.id)
          .then(async () => {
            addToast({
              type: 'success',
              title: 'Repair confirmed',
              message: `${order.workOrderNumber} is now Repairing. Tracking is updated with the approved quote.`,
            });
            await reload();
            navigate(`/tracking?job=${encodeURIComponent(order.workOrderNumber || order.id)}`);
          })
          .catch((error: unknown) => {
            addToast({
              type: 'error',
              title: 'Could not confirm',
              message: error instanceof Error ? error.message : 'Request failed.',
            });
          })
          .finally(() => setBusyId(''));
      },
    });
  };

  const removePart = async (row: CustomerPartRequestRow) => {
    setBusyId(row.id);
    try {
      await withdrawCustomerPartRequest(row.id);
      setRequests((rows) => rows.filter((item) => item.id !== row.id));
      addToast({
        type: 'warning',
        title: 'Part removed from quote',
        message: `${row.productName} is off this visit.`,
      });
      await refreshCustomerPortal();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not remove part',
        message: error instanceof Error ? error.message : 'Request failed.',
      });
    } finally {
      setBusyId('');
    }
  };

  const removeExtra = async (order: WorkOrder, bookingServiceId: number, name: string) => {
    if (!order.bookingId) return;
    setBusyId(`${order.id}-svc-${bookingServiceId}`);
    try {
      await removeBookingService(order.bookingId, bookingServiceId);
      addToast({
        type: 'warning',
        title: 'Service removed from quote',
        message: `${name} is off this visit.`,
      });
      await reload();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not remove service',
        message: error instanceof Error ? error.message : 'Request failed.',
      });
    } finally {
      setBusyId('');
    }
  };

  const addExtraService = async (order: WorkOrder) => {
    if (!order.bookingId || !extraServiceId || addingService) return;
    setAddingService(true);
    try {
      await addBookingService(order.bookingId, extraServiceId);
      const added = (services || []).find((item) => item.id === extraServiceId);
      addToast({
        type: 'success',
        title: 'Service added to quote',
        message: added
          ? `${added.name} is on this visit estimate.`
          : 'The extra service is on this visit estimate.',
      });
      setExtraServiceId('');
      setShowAddService(false);
      await reload();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not add service',
        message: error instanceof Error ? error.message : 'Request failed.',
      });
    } finally {
      setAddingService(false);
    }
  };

  const confirmPurchase = async (row: CustomerPartRequestRow) => {
    setBusyId(row.id);
    try {
      const saved = await confirmCustomerPartPurchase(row.id);
      setRequests((rows) => rows.map((item) => (item.id === saved.id ? saved : item)));
      addToast({
        type: 'success',
        title: 'Purchase confirmed',
        message: `${saved.productName} is noted. The garage prepares the invoice and handoff.`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not confirm purchase',
        message: error instanceof Error ? error.message : 'Request failed.',
      });
    } finally {
      setBusyId('');
    }
  };

  const goAddPart = (order: WorkOrder) => {
    const params = new URLSearchParams();
    if (order.vehicleId) params.set('vehicle', order.vehicleId);
    if (order.bookingId) params.set('booking', order.bookingId);
    if (order.workOrderNumber) params.set('job', order.workOrderNumber);
    params.set('fulfillment', 'INSTALL_IN_WORKSHOP');
    navigate(`/parts?${params.toString()}`);
  };

  const submitCancel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!cancelFor) return;
    setBusyId(cancelFor.id);
    try {
      await declineCustomerRepair(cancelFor.id, cancelReason);
      addToast({
        type: 'warning',
        title: 'Visit cancelled',
        message: `${cancelFor.workOrderNumber} and its booking are cancelled. The inspection stays on file.`,
      });
      setCancelFor(null);
      setCancelReason('');
      closeQuote();
      await reload();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not cancel',
        message: error instanceof Error ? error.message : 'Request failed.',
      });
    } finally {
      setBusyId('');
    }
  };

  if (!selected) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <ClipboardList className="w-6 h-6 text-blue-600" />
              <span>Quotes</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              {waiting.length === 0 && purchaseQuotes.length === 0
                ? 'After inspection, visit estimates land here for approval. Parts-only purchases show up too.'
                : `${waiting.length} visit quote${waiting.length === 1 ? '' : 's'}${
                    purchaseQuotes.length
                      ? ` · ${purchaseQuotes.length} parts purchase${purchaseQuotes.length === 1 ? '' : 's'}`
                      : ''
                  }. Open one for the full estimate.`}
            </p>
          </div>
          <div className="px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-right shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Awaiting you</div>
            <div className="font-mono text-lg font-black text-slate-900">
              {waiting.length + purchaseQuotes.length}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap border border-slate-200 bg-slate-100/80 p-1.5 rounded-2xl gap-2">
          {(
            [
              { id: 'VISIT', label: 'Visit quotes' },
              { id: 'PARTS', label: 'Parts buy' },
              { id: 'CONFIRMED', label: 'Confirmed' },
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
                  : 'text-slate-500 hover:text-slate-900 hover:bg-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {listEmpty ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-400 mx-auto" />
            <h4 className="text-base font-bold text-slate-900">No quotes in this group</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              When inspection finishes, the visit estimate appears here for your approval.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {[...visiblePartsBuy, ...visibleConfirmedParts].map((row) => {
              const awaitingConfirm = row.status === 'PENDING';
              return (
                <article
                  key={row.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 hover:border-slate-300 shadow-sm transition-all"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-700">{row.number}</span>
                        {awaitingConfirm ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                            Needs confirm
                          </span>
                        ) : row.status === 'CANCELLED' ? (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-200">
                            Cancelled
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {row.status === 'NOTED' ? 'Noted' : 'Confirmed'}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {row.fulfillment === 'DELIVERY' ? 'Delivery' : 'Pickup'}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900">{row.productName}</h3>
                      <p className="text-xs text-slate-500">
                        {row.carBrand}
                        {row.vehiclePlate ? ` · ${row.vehiclePlate}` : ''} · parts only
                      </p>
                      {row.status === 'CANCELLED' && row.cancelReason ? (
                        <p className="text-xs text-rose-600">Cancelled: {row.cancelReason}</p>
                      ) : null}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xl font-black text-slate-900">{money(row.price)}</div>
                      <div className="text-[11px] text-slate-500">
                        {awaitingConfirm
                          ? 'Confirm purchase'
                          : row.status === 'CANCELLED'
                            ? 'Not available'
                            : 'Garage prepares handoff'}
                      </div>
                    </div>
                  </div>
                  {awaitingConfirm && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void confirmPurchase(row)}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold disabled:opacity-60"
                      >
                        Confirm purchase
                      </button>
                      {row.canWithdraw && (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={() => void removePart(row)}
                          className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200"
                        >
                          Cancel request
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}

            {visibleConfirmedVisits.map((order) => {
              const visitParts = requests.filter((row) => order.bookingId && row.bookingId === order.bookingId);
              const { serviceLines, quoteTotal } = quoteTotals(order, visitParts);
              const serviceLabel =
                serviceLines.map((row) => row.name).filter(Boolean).join(' · ') || 'Service on this visit';
              const car = (vehicles || []).find((item) => item.id === order.vehicleId);
              const photo = car?.imageUrl || car?.image || '';
              const total = order.invoiceTotal || quoteTotal || order.estimatedCost || 0;
              return (
                <button
                  key={`confirmed-${order.id}`}
                  type="button"
                  onClick={() =>
                    navigate(`/tracking?job=${encodeURIComponent(order.workOrderNumber || order.id)}`)
                  }
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-blue-700">{order.workOrderNumber}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {order.vehiclePlate || 'No plate'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Confirmed · {order.statusLabel || 'Repairing'}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Approved total</div>
                      <div className="font-mono text-xl font-black text-slate-900">{money(total)}</div>
                    </div>
                  </div>
                  <div className="flex gap-4 items-start">
                    <div className="w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-[4/3]">
                      {photo ? (
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-400">
                          <Car className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base font-bold text-slate-900">{order.vehicleInfo || 'Vehicle'}</h3>
                      <p className="text-xs text-slate-600 line-clamp-1">{serviceLabel}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {order.reportedProblem || 'No complaint recorded.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        <span>
                          {order.bookingId ? `Booking BK-${order.bookingId.padStart(4, '0')}` : 'Booking'}
                          {order.invoiceNumber ? ` · ${order.invoiceNumber}` : ''}
                        </span>
                        <span className="text-emerald-700 font-bold">Open tracking →</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            {visibleVisitQuotes.map((order) => {
              const visitParts = requests.filter((row) => order.bookingId && row.bookingId === order.bookingId);
              const { serviceLines, quoteTotal } = quoteTotals(order, visitParts);
              const serviceLabel =
                serviceLines.map((row) => row.name).filter(Boolean).join(' · ') || 'Service on this visit';
              const car = (vehicles || []).find((item) => item.id === order.vehicleId);
              const photo = car?.imageUrl || car?.image || '';
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => openQuote(order)}
                  className="w-full text-left bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-300 shadow-sm transition-all space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="font-mono text-xs font-bold text-blue-700">{order.workOrderNumber}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-800 border border-slate-200">
                        {order.vehiclePlate || 'No plate'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                        Waiting for approval
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase tracking-wider text-slate-500">Estimate</div>
                      <div className="font-mono text-xl font-black text-slate-900">{money(quoteTotal)}</div>
                    </div>
                  </div>

                  <div className="flex gap-4 items-start">
                    <div className="w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 aspect-[4/3]">
                      {photo ? (
                        <img src={photo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-slate-600">
                          <Car className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <h3 className="text-base font-bold text-slate-900">{order.vehicleInfo || 'Vehicle'}</h3>
                      <p className="text-xs text-slate-600 line-clamp-1">{serviceLabel}</p>
                      <p className="text-xs text-slate-500 line-clamp-2">
                        {order.reportedProblem || 'No complaint recorded.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                        <span>
                          {order.bookingId ? `Booking BK-${order.bookingId.padStart(4, '0')}` : 'Booking'}
                          {order.invoiceNumber ? ` · ${order.invoiceNumber}` : ''}
                          {visitParts.length > 0
                            ? ` · ${visitParts.length} part${visitParts.length === 1 ? '' : 's'}`
                            : ''}
                        </span>
                        <span className="text-blue-400 font-bold">Open quote →</span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const order = selected;
  const inspection = order.beforeInspection;
  const visitParts = requests.filter((row) => order.bookingId && row.bookingId === order.bookingId);
  const {
    serviceLines,
    serviceTotal,
    partsTotal,
    labor,
    discount,
    tax,
    billedParts,
    quoteTotal,
  } = quoteTotals(order, visitParts);
  const primaryServices = serviceLines.filter((row) => row.primary);
  const extraServices = serviceLines.filter((row) => !row.primary);
  const bookedServices =
    primaryServices.length > 0 ? primaryServices : extraServices.length === 0 ? serviceLines : [];

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={closeQuote}
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        All quotes
      </button>

      <article className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-wrap justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-black text-slate-900">{order.workOrderNumber}</span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                {order.statusLabel || 'Waiting for approval'}
              </span>
            </div>
            <div className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5" />
              {order.vehicleInfo} · {order.vehiclePlate}
            </div>
            {order.bookingId && (
              <div className="text-[11px] text-slate-500 mt-1">
                Booking BK-{order.bookingId.padStart(4, '0')}
                {order.invoiceNumber ? ` · ${order.invoiceNumber}` : ''}
              </div>
            )}
          </div>
          <div className="text-xs text-slate-500 text-right space-y-1">
            <div className="flex items-center justify-end gap-1">
              <Wrench className="w-3.5 h-3.5" />
              {order.assignedTechnicianName || 'Unassigned'}
            </div>
            <div>{order.createdAt || '—'}</div>
            <div className="font-mono text-2xl font-black text-slate-900">{money(quoteTotal)}</div>
          </div>
        </div>

        <div className="p-6 space-y-4 bg-slate-50/40">
          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Planned work
            </h3>
            <p className="text-sm text-slate-800">
              {order.reportedProblem || inspection?.complaint || 'No complaint recorded.'}
            </p>
            <div className="space-y-2">
              <div className="text-[10px] uppercase text-slate-500">Booked service</div>
              {bookedServices.length === 0 ? (
                <p className="text-xs text-slate-500">No service on this booking yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {bookedServices.map((row, index) => (
                    <li
                      key={`${row.name}-primary-${index}`}
                      className="flex justify-between gap-3 text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100"
                    >
                      <span>{row.name}</span>
                      <span className="font-mono text-slate-500">{money(row.price || 0)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-[10px] uppercase text-slate-500">Extra services on this visit</div>
              {extraServices.length === 0 ? (
                <p className="text-xs text-slate-500">No extra service added yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {extraServices.map((row, index) => (
                    <li
                      key={`${row.name}-extra-${index}`}
                      className="flex justify-between gap-3 text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2 border border-slate-100"
                    >
                      <span>{row.name}</span>
                      <span className="flex items-center gap-2">
                        <span className="font-mono text-slate-500">{money(row.price || 0)}</span>
                        {row.id != null && (
                          <button
                            type="button"
                            disabled={busyId === `${order.id}-svc-${row.id}`}
                            onClick={() => void removeExtra(order, row.id as number, row.name)}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200"
                          >
                            Remove
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700">Inspection</h3>
            {inspection?.inspectorName && (
              <p className="text-[11px] text-slate-500">Checked by {inspection.inspectorName}</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
              <Metric
                icon={<Gauge className="w-3 h-3" />}
                label="Mileage"
                value={inspection ? `${inspection.mileage.toLocaleString()} km` : '—'}
              />
              <Metric icon={<Fuel className="w-3 h-3" />} label="Fuel" value={inspection?.fuelLabel || '—'} />
              <Metric label="Front brakes" value={inspection?.frontBrakeMm ? `${inspection.frontBrakeMm} mm` : '—'} />
              <Metric label="Rear brakes" value={inspection?.rearBrakeMm ? `${inspection.rearBrakeMm} mm` : '—'} />
              <Metric label="Tire tread" value={inspection?.treadMm ? `${inspection.treadMm} mm` : '—'} />
              <Metric label="Check" value={inspection?.inspectionStatus || '—'} />
            </div>
            {(inspection?.conditionSummary || inspection?.damageSummary || inspection?.inspectorNote) && (
              <div className="grid sm:grid-cols-3 gap-2 text-xs">
                <Finding label="Condition" text={inspection?.conditionSummary} />
                <Finding label="Damage" text={inspection?.damageSummary} />
                <Finding label="Inspector note" text={inspection?.inspectorNote} />
              </div>
            )}
            {inspection?.photos && inspection.photos.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {inspection.photos.map((photo) => (
                  <img
                    key={photo}
                    src={photo}
                    alt=""
                    className="h-24 w-32 object-cover rounded-xl border border-slate-200"
                  />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wide text-blue-700 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              Parts on this visit
            </h3>
            {visitParts.length === 0 ? (
              <p className="text-xs text-slate-500">
                No shelf part on this booking yet. Use Add a part to open the Parts page — Workshop Install stays on this
                quote.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {visitParts.map((row) => (
                  <li
                    key={row.id}
                    className="flex items-center justify-between gap-3 text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100"
                  >
                    <span className="min-w-0">
                      {row.productName}
                      <span className="block text-[10px] text-slate-500 font-mono">
                        {row.number} · {row.status}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-slate-500">{money(row.price || 0)}</span>
                      {row.canWithdraw ? (
                        <button
                          type="button"
                          disabled={busyId === row.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void removePart(row);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400" title="Already issued — ask the garage">
                          Locked
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {billedParts > 0 && (
              <p className="text-[11px] text-slate-500">Issued parts already on the invoice: {money(billedParts)}.</p>
            )}
          </section>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-emerald-800 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              Estimated total for this visit
            </h3>
            <div className="space-y-1.5 text-xs text-slate-700">
              <div className="flex justify-between gap-3">
                <span>Services</span>
                <span className="font-mono">{money(serviceTotal)}</span>
              </div>
              {labor > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Mechanic labor</span>
                  <span className="font-mono">{money(labor)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <span>Parts requested</span>
                <span className="font-mono">{money(partsTotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between gap-3 text-emerald-800">
                  <span>Discount</span>
                  <span className="font-mono">−{money(discount)}</span>
                </div>
              )}
              {tax > 0 && (
                <div className="flex justify-between gap-3">
                  <span>Tax</span>
                  <span className="font-mono">{money(tax)}</span>
                </div>
              )}
              <div className="flex justify-between gap-3 pt-2 border-t border-emerald-200 text-sm font-black text-slate-900">
                <span>Total</span>
                <span className="font-mono text-emerald-800">{money(quoteTotal)}</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              Confirming this quote lets the workshop continue. Pay the balance later on the invoice
              {order.invoiceNumber ? (
                <>
                  {' '}
                  (
                  <button
                    type="button"
                    onClick={() => navigate(`/invoices?invoice=${encodeURIComponent(order.invoiceNumber!)}`)}
                    className="font-semibold text-blue-600 hover:text-blue-500"
                  >
                    {order.invoiceNumber}
                  </button>
                  ).
                </>
              ) : (
                '.'
              )}
            </p>
          </section>

          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busyId === order.id}
                onClick={() => confirmRepair(order, quoteTotal)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm repair
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!order.bookingId) {
                    addToast({
                      type: 'error',
                      title: 'No booking on this quote',
                      message: 'This work order is not linked to a booking, so a service cannot be added here.',
                    });
                    return;
                  }
                  const available = (services || []).filter(
                    (item) =>
                      item.status === 'ACTIVE' && !serviceLines.some((row) => row.name === item.name)
                  );
                  if (available.length === 0) {
                    addToast({
                      type: 'info',
                      title: 'No more services to add',
                      message: 'Every active service is already on this visit quote.',
                    });
                    return;
                  }
                  setShowAddService(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              >
                <Plus className="w-4 h-4" />
                Add a service
              </button>
              <button
                type="button"
                onClick={() => goAddPart(order)}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-bold flex items-center gap-1.5 border border-slate-200"
              >
                <Package className="w-4 h-4" />
                Add a part
              </button>
              <button
                type="button"
                onClick={() => {
                  setCancelFor(order);
                  setCancelReason('');
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200 flex items-center gap-1.5"
              >
                <Ban className="w-4 h-4" />
                Cancel booking
              </button>
              <button
                type="button"
                onClick={() => navigate(`/tracking?job=${encodeURIComponent(order.workOrderNumber)}`)}
                className="px-4 py-2.5 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200"
              >
                View work order
              </button>
            </div>

            {showAddService && order.bookingId && (
              <form
                className="rounded-2xl border border-blue-200 bg-blue-50/60 p-3 flex flex-col sm:flex-row gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  void addExtraService(order);
                }}
              >
                <select
                  value={extraServiceId}
                  onChange={(event) => setExtraServiceId(event.target.value)}
                  className="flex-1 p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800"
                >
                  <option value="">Choose a service</option>
                  {(services || [])
                    .filter((item) => item.status === 'ACTIVE')
                    .filter((item) => !serviceLines.some((row) => row.name === item.name))
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {money(item.basePrice || 0)}
                      </option>
                    ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={addingService || !extraServiceId}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold disabled:opacity-60"
                  >
                    {addingService ? 'Adding…' : 'Add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddService(false);
                      setExtraServiceId('');
                    }}
                    className="px-3 py-2 rounded-xl bg-white text-slate-700 text-xs font-bold border border-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </article>

      {cancelFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <form
            onSubmit={submitCancel}
            className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-slate-900">Cancel {cancelFor.workOrderNumber}</h3>
            <p className="text-xs text-slate-500">
              This cancels the booking and stops the repair. The inspection stays. Parts already issued, or a payment
              already recorded, have to be closed by the garage.
            </p>
            <textarea
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              rows={3}
              placeholder="Reason, if you want to leave one"
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setCancelFor(null)} className="px-4 py-2 text-xs text-slate-500">
                Back
              </button>
              <button
                type="submit"
                disabled={busyId === cancelFor.id}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold"
              >
                Cancel visit
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
      <div className="text-slate-500 flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-mono font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function Finding({ label, text }: { label: string; text?: string }) {
  if (!text) return null;
  return (
    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
      <div className="text-[10px] uppercase text-slate-500">{label}</div>
      <p className="text-slate-700 mt-1 whitespace-pre-wrap">{text}</p>
    </div>
  );
}
