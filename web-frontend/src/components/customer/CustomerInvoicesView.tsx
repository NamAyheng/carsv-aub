import React, { useMemo, useState } from 'react';
import { Receipt, Download, Printer, CreditCard, CheckCircle2, AlertCircle, X, QrCode, Package, Wrench } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { invoiceKind, isPartsSaleInvoice } from '../../utils/invoices';
import { invoiceRemaining, validatePaymentAmount } from '../../utils/garageLogic';
import { Invoice } from '../../types';
import { InvoiceDocument, InvoiceKindBadge } from '../invoices/InvoiceDocument';

export const CustomerInvoicesView: React.FC = () => {
  const { invoices, payments, paymentReceipts, currentUser, recordPayment, addToast } = useApp();

  const customerInvoices = (invoices || []).filter((inv) => belongsToCurrentCustomer(currentUser, inv));
  const [kindFilter, setKindFilter] = useState<'ALL' | 'PARTS_SALE' | 'SERVICE_REPAIR'>('ALL');
  const visible = useMemo(
    () => customerInvoices.filter((inv) => kindFilter === 'ALL' || invoiceKind(inv) === kindFilter),
    [customerInvoices, kindFilter]
  );

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(visible[0] || customerInvoices[0]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ABA_PAY' | 'CREDIT_CARD' | 'CASH' | 'BANK'>('ABA_PAY');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [receiptToView, setReceiptToView] = useState<(typeof paymentReceipts)[number] | null>(null);

  const active = visible.find((i) => i.id === selectedInvoice?.id) || visible[0] || selectedInvoice;
  const customerPayments = (payments || []).filter(
    (p) => p.customerId === 'cust-1' || customerInvoices.some((i) => i.id === p.invoiceId)
  );

  const handleDownload = (invNumber: string) => {
    addToast({
      type: 'success',
      title: 'Invoice Download Started',
      message: `${invNumber}.pdf is being downloaded to your device.`
    });
  };

  const handleExecutePayment = () => {
    if (!active) return;
    const due = invoiceRemaining(active);
    const amount = parseFloat(payAmount || String(due));
    const error = validatePaymentAmount(amount, due);
    if (error) {
      addToast({ type: 'error', title: 'Invalid Payment', message: error });
      return;
    }
    setIsProcessingPayment(true);
    setTimeout(() => {
      const method =
        paymentMethod === 'ABA_PAY'
          ? 'ABA PayWay'
          : paymentMethod === 'CASH'
            ? 'Cash'
            : paymentMethod === 'BANK'
              ? 'Bank Transfer'
              : 'Credit Card';
      const recorded = recordPayment({
        paymentIdNumber: 'PAY-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        invoiceId: active.id,
        invoiceNumber: active.invoiceNumber,
        customerId: currentUser.id === 'user-customer-demo' ? 'cust-1' : currentUser.id,
        customerName: currentUser.name,
        amount,
        paymentMethod: method,
        paymentDate: new Date().toISOString().split('T')[0],
        transactionRef: 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        status: 'COMPLETED',
        receivedBy: 'Online Customer Portal Gateway'
      });
      setIsProcessingPayment(false);
      setShowPayModal(false);
      if (recorded) {
        const updatedDue = Math.max(0, due - amount);
        setSelectedInvoice({
          ...active,
          amountPaid: active.amountPaid + amount,
          balanceDue: updatedDue,
          status: updatedDue === 0 ? 'PAID' : 'PARTIAL'
        });
      }
    }, 800);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Receipt className="w-6 h-6 text-blue-500" />
              <span>Invoices</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Parts-counter sales and workshop service invoices are separate documents. Extra parts bought after a booking stay on
              the service invoice.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'ALL', label: 'All invoices', icon: Receipt },
              { id: 'PARTS_SALE', label: 'Parts / equipment only', icon: Package },
              { id: 'SERVICE_REPAIR', label: 'Service & repair jobs', icon: Wrench }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setKindFilter(tab.id);
                const next = customerInvoices.filter((inv) => tab.id === 'ALL' || invoiceKind(inv) === tab.id);
                if (next[0]) setSelectedInvoice(next[0]);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                kindFilter === tab.id
                  ? tab.id === 'PARTS_SALE'
                    ? 'bg-slate-800 text-amber-300 border-slate-600'
                    : tab.id === 'SERVICE_REPAIR'
                      ? 'bg-slate-800 text-blue-300 border-slate-600'
                      : 'bg-slate-700 text-white border-slate-600'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-4 space-y-2">
          {visible.length === 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm text-slate-400">
              No invoices in this group.
            </div>
          )}
          {visible.map((inv) => {
            const parts = isPartsSaleInvoice(inv);
            const selected = active?.id === inv.id;
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelectedInvoice(inv)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selected
                    ? parts
                      ? 'bg-slate-900 border-slate-600 shadow-[inset_3px_0_0_0_rgb(245,158,11)]'
                      : 'bg-slate-900 border-slate-600 shadow-[inset_3px_0_0_0_rgb(59,130,246)]'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-mono text-sm font-black text-white">{inv.invoiceNumber}</span>
                  <InvoiceKindBadge invoice={inv} />
                </div>
                <p className="text-xs text-slate-300 truncate">
                  {parts ? fulfillmentLabelSafe(inv) : inv.workOrderNumber || 'Workshop job'}
                  {inv.vehiclePlate ? ` · ${inv.vehiclePlate}` : ''}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="font-mono text-sm font-bold text-white">${inv.totalAmount.toFixed(2)}</span>
                    <span
                      className={`text-[10px] font-semibold ${
                        inv.status === 'PAID' ? 'text-slate-300' : 'text-slate-400'
                      }`}
                    >
                    {inv.status}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="xl:col-span-8">
          {active ? (
            <div className="rounded-3xl overflow-hidden border border-slate-700/80">
              <div className="bg-slate-900 p-4 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-2">
                  {active.status === 'PAID' ? (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Paid
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                      {active.status}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDownload(active.invoiceNumber)}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                  {active.status !== 'PAID' && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayAmount(invoiceRemaining(active).toFixed(2));
                        setShowPayModal(true);
                      }}
                      className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay ${invoiceRemaining(active).toFixed(2)}
                    </button>
                  )}
                </div>
              </div>
              <InvoiceDocument invoice={active} theme="dark" />
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 space-y-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-blue-500" />
          Payment history
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="p-3">Payment #</th>
                <th className="p-3">Invoice</th>
                <th className="p-3">Type</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Method</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {customerPayments.map((p) => {
                const linked = customerInvoices.find((i) => i.id === p.invoiceId || i.invoiceNumber === p.invoiceNumber);
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-white">{p.paymentIdNumber || p.id}</td>
                    <td className="p-3 font-mono text-slate-300">{p.invoiceNumber}</td>
                    <td className="p-3">{linked ? <InvoiceKindBadge invoice={linked} /> : '—'}</td>
                    <td className="p-3 font-mono font-semibold text-white">${p.amount.toFixed(2)}</td>
                    <td className="p-3">{p.paymentMethod}</td>
                    <td className="p-3 text-slate-400">{p.paymentDate}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">{p.status}</span>
                    </td>
                    <td className="p-3">
                      {p.receiptNumber ? (
                        <button
                          type="button"
                          onClick={() => {
                            const r = (paymentReceipts || []).find((x) => x.receiptNumber === p.receiptNumber || x.paymentId === p.id);
                            if (r) setReceiptToView(r);
                            else addToast({ type: 'info', title: 'Receipt', message: `Receipt ${p.receiptNumber}` });
                          }}
                          className="text-blue-400 font-semibold hover:underline"
                        >
                          {p.receiptNumber}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showPayModal && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Pay {active.invoiceNumber}</h3>
              </div>
              <button type="button" onClick={() => setShowPayModal(false)} className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <InvoiceKindBadge invoice={active} size="md" />
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="text-slate-500">Grand total</div>
                <div className="font-mono font-bold text-white">${active.totalAmount.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="text-slate-500">Paid</div>
                <div className="font-mono font-bold text-white">${active.amountPaid.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="text-slate-500">Remaining</div>
                <div className="font-mono font-bold text-white">${invoiceRemaining(active).toFixed(2)}</div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment amount</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max={invoiceRemaining(active)}
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setPayAmount(Math.min(50, invoiceRemaining(active)).toFixed(2))}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Pay $50
                </button>
                <button
                  type="button"
                  onClick={() => setPayAmount(invoiceRemaining(active).toFixed(2))}
                  className="text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
                >
                  Pay remaining
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPaymentMethod('ABA_PAY')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                  paymentMethod === 'ABA_PAY' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <QrCode className="w-4 h-4" />
                ABA KHQR
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CREDIT_CARD')}
                className={`p-3 rounded-xl border font-bold flex items-center justify-center gap-2 ${
                  paymentMethod === 'CREDIT_CARD' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Card
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`p-3 rounded-xl border font-bold ${
                  paymentMethod === 'CASH' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Cash
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK')}
                className={`p-3 rounded-xl border font-bold ${
                  paymentMethod === 'BANK' ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                Bank transfer
              </button>
            </div>
            <button
              type="button"
              onClick={handleExecutePayment}
              disabled={isProcessingPayment}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessingPayment ? (
                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm payment
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {receiptToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Payment receipt</h3>
              <button type="button" onClick={() => setReceiptToView(null)} className="p-1 text-slate-400 rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-400">Receipt #</span><span className="font-mono text-white">{receiptToView.receiptNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Payment ID</span><span className="font-mono text-white">{receiptToView.paymentId}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Invoice</span><span className="font-mono text-white">{receiptToView.invoiceNumber}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Customer</span><span className="text-white">{receiptToView.customerName}</span></div>
              {receiptToView.vehicleInfo && (
                <div className="flex justify-between"><span className="text-slate-400">Vehicle</span><span className="text-white">{receiptToView.vehicleInfo}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-400">Method</span><span className="text-white">{receiptToView.paymentMethod}</span></div>
              <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="text-white">{receiptToView.paymentDate}</span></div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Amount</span>
                <span className="font-mono font-bold text-white">${receiptToView.amount.toFixed(2)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                addToast({ type: 'success', title: 'Receipt download', message: `${receiptToView.receiptNumber}.pdf started.` });
                setReceiptToView(null);
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-xs font-bold"
            >
              Download PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

function fulfillmentLabelSafe(inv: Invoice) {
  if (inv.fulfillment === 'DELIVERY') return 'Express delivery';
  if (inv.fulfillment === 'WORKSHOP_INSTALL') return 'Counter fitting';
  return 'Counter pickup';
}
