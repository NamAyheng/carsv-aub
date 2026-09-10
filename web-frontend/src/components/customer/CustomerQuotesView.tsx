import React, { useMemo, useState } from 'react';
import { ClipboardList, CheckCircle2, XCircle, Wrench, Car, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { Estimate } from '../../types';
import { calcGrandTotal, calcSubtotal } from '../../utils/garageLogic';

interface CustomerQuotesViewProps {
  onTrackWorkOrder?: () => void;
}

export const CustomerQuotesView: React.FC<CustomerQuotesViewProps> = ({ onTrackWorkOrder }) => {
  const { estimates, currentUser, approveEstimate, rejectEstimate, showConfirmDialog } = useApp();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const mine = useMemo(
    () => (estimates || []).filter((e) => belongsToCurrentCustomer(currentUser, e)),
    [estimates, currentUser]
  );
  const waiting = mine.filter((e) => e.status === 'WAITING_APPROVAL' || e.status === 'SENT');
  const decided = mine.filter((e) => e.status !== 'WAITING_APPROVAL' && e.status !== 'SENT');

  const handleApprove = (est: Estimate) => {
    showConfirmDialog({
      title: `Approve ${est.estimateNumber}?`,
      message: `This authorizes recommended work on ${est.vehiclePlate} for $${est.estimatedTotal.toFixed(2)} (labor + service + parts − discount + tax).`,
      confirmText: 'Approve quotation',
      variant: 'primary',
      onConfirm: () => approveEstimate(est.id, 'Approved from customer portal.')
    });
  };

  const handleRejectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectId) return;
    rejectEstimate(rejectId, rejectNote || 'Declined from customer portal.');
    setRejectId(null);
    setRejectNote('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <ClipboardList className="w-6 h-6 text-blue-500" />
          <span>Estimates & quotations</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Review recommended services, labor, and parts before repair continues. Approve or reject each quotation.
        </p>
      </div>

      {waiting.length === 0 && decided.length === 0 && (
        <div className="bg-slate-900/40 rounded-3xl border border-slate-800 p-12 text-center text-sm text-slate-400">
          No quotations yet. After diagnosis, the workshop will send an estimate here.
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-amber-400">Waiting for your approval</h3>
          {waiting.map((est) => (
            <div key={est.id}>
              <QuoteCard
                estimate={est}
                onApprove={() => handleApprove(est)}
                onReject={() => {
                  setRejectId(est.id);
                  setRejectNote('');
                }}
                onTrack={onTrackWorkOrder}
              />
            </div>
          ))}
        </div>
      )}

      {decided.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">Previous quotations</h3>
          {decided.map((est) => (
            <div key={est.id}>
              <QuoteCard estimate={est} />
            </div>
          ))}
        </div>
      )}

      {rejectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form onSubmit={handleRejectSubmit} className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Reject quotation</h3>
            <p className="text-xs text-slate-400">Optional reason is stored with the decision.</p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              placeholder="e.g. I will wait until next visit"
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setRejectId(null)} className="px-4 py-2 text-xs text-slate-400">
                Back
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-red-600 text-white text-xs font-bold">
                Confirm reject
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

function QuoteCard({
  estimate,
  onApprove,
  onReject,
  onTrack
}: {
  estimate: Estimate;
  onApprove?: () => void;
  onReject?: () => void;
  onTrack?: () => void;
}): React.ReactElement {
  const pending = estimate.status === 'WAITING_APPROVAL' || estimate.status === 'SENT';
  const check = calcSubtotal(estimate.laborCost, estimate.serviceCost, estimate.partsCost);
  const grand = calcGrandTotal(check, estimate.discount, estimate.taxAmount);

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-sm font-black text-white">{estimate.estimateNumber}</span>
            <StatusPill status={estimate.status} />
          </div>
          <div className="text-xs text-slate-300 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5" />
            {estimate.vehicleInfo} · {estimate.vehiclePlate}
          </div>
          {estimate.workOrderNumber && (
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              Linked job {estimate.workOrderNumber}
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase text-slate-500">Estimated total</div>
          <div className="text-2xl font-black font-mono text-white">${estimate.estimatedTotal.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 flex items-center justify-end gap-1 mt-1">
            <Calendar className="w-3 h-3" />
            Valid until {estimate.validUntil}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-800">
        {estimate.notes || `Recommended: ${estimate.recommendedServices.join(', ')}`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="text-slate-500 uppercase text-[10px]">
            <tr>
              <th className="pb-2">Item</th>
              <th className="pb-2">Type</th>
              <th className="pb-2 text-right">Qty</th>
              <th className="pb-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {estimate.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2 text-white font-medium">{item.description}</td>
                <td className="py-2 capitalize">{item.type.toLowerCase()}</td>
                <td className="py-2 text-right font-mono">{item.quantity}</td>
                <td className="py-2 text-right font-mono text-white">${item.totalPrice.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <CostTile label="Labor" value={estimate.laborCost} />
        <CostTile label="Service" value={estimate.serviceCost} />
        <CostTile label="Parts" value={estimate.partsCost} />
        <CostTile label="Subtotal" value={check} />
      </div>
      <div className="flex justify-end text-xs text-slate-400 gap-6">
        <span>Discount −${estimate.discount.toFixed(2)}</span>
        <span>Tax +${estimate.taxAmount.toFixed(2)}</span>
        <span className="text-white font-bold">Grand ${grand.toFixed(2)}</span>
      </div>

      {estimate.customerDecisionNote && (
        <p className="text-[11px] text-slate-500">Decision: {estimate.customerDecisionNote}</p>
      )}

      {pending && (
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onApprove}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve
          </button>
          <button
            type="button"
            onClick={onReject}
            className="px-4 py-2.5 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          {onTrack && (
            <button type="button" onClick={onTrack} className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold">
              View repair
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function CostTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
      <div className="text-slate-500">{label}</div>
      <div className="font-mono font-bold text-white">${value.toFixed(2)}</div>
    </div>
  );
}

function StatusPill({ status }: { status: Estimate['status'] }) {
  const map: Record<Estimate['status'], string> = {
    DRAFT: 'bg-slate-800 text-slate-300',
    SENT: 'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    WAITING_APPROVAL: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    APPROVED: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
    REJECTED: 'bg-red-500/15 text-red-400 border border-red-500/30',
    EXPIRED: 'bg-slate-800 text-slate-400'
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${map[status]}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
