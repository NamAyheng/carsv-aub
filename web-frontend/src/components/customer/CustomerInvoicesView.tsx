import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, Download, Printer, CreditCard, CheckCircle2, AlertCircle, X, QrCode, Package, Wrench, Upload, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { invoiceKind, isPartsSaleInvoice } from '../../utils/invoices';
import { invoiceRemaining, validatePaymentAmount } from '../../utils/garageLogic';
import { Invoice, InvoicePaymentState, PaymentRecord } from '../../types';
import { InvoiceDocument, InvoiceKindBadge } from '../invoices/InvoiceDocument';

function invoicePayState(inv: Invoice): InvoicePaymentState {
  if (inv.paymentState) return inv.paymentState;
  if (inv.status === 'PAID') return 'PAID';
  if (inv.status === 'PENDING' || (inv.amountPending || 0) > 0) return 'PENDING';
  return 'UNPAID';
}

function payStateLabel(state: InvoicePaymentState) {
  if (state === 'PAID') return 'Paid';
  if (state === 'PENDING') return 'Pending';
  return 'Unpaid';
}

function payStateHint(state: InvoicePaymentState) {
  if (state === 'PAID') return 'Payment verified. The work order can move to Ready for pickup.';
  if (state === 'PENDING') return 'Wait for the garage to verify your payment.';
  return 'Pay this invoice, then wait for verification.';
}

/** Soft badge style like Tracking: light fill + dark text + matching border. */
function payStateTone(state: InvoicePaymentState) {
  if (state === 'PAID') {
    return {
      text: 'text-emerald-400',
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      cardSelected: 'bg-slate-900 border-emerald-500/50 shadow-[inset_3px_0_0_0_rgb(16,185,129)]',
      cardIdle: 'bg-slate-900/80 border-slate-800 hover:border-emerald-500/40',
      button: 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100',
      alert: 'border-emerald-600 bg-emerald-600 text-white',
      filterOn: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
  }
  if (state === 'PENDING') {
    return {
      text: 'text-orange-400',
      badge: 'bg-orange-50 text-orange-800 border-orange-200',
      cardSelected: 'bg-slate-900 border-orange-500 shadow-[inset_3px_0_0_0_rgb(249,115,22)]',
      cardIdle: 'bg-slate-900/80 border-slate-800 hover:border-orange-500/50',
      button: 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100',
      alert: 'border-orange-500 bg-orange-500 text-white',
      filterOn: 'bg-orange-50 text-orange-800 border-orange-200',
    };
  }
  return {
    text: 'text-red-400',
    badge: 'bg-red-50 text-red-800 border-red-200',
    cardSelected: 'bg-slate-900 border-red-500 shadow-[inset_3px_0_0_0_rgb(239,68,68)]',
    cardIdle: 'bg-slate-900/80 border-slate-800 hover:border-red-500/50',
    button: 'bg-red-600 text-white border border-red-600 hover:bg-red-700',
    alert: 'border-red-600 bg-red-600 text-white',
    filterOn: 'bg-red-50 text-red-800 border-red-200',
  };
}

export const CustomerInvoicesView: React.FC = () => {
  const {
    invoices,
    payments,
    paymentReceipts,
    currentUser,
    recordPayment,
    submitPaymentClaim,
    withdrawPaymentClaim,
    addToast,
    liveCustomer,
  } = useApp();

  const customerInvoices = (invoices || []).filter((inv) => belongsToCurrentCustomer(currentUser, inv));
  const [invoiceParams] = useSearchParams();
  const invoiceQuery = invoiceParams.get('invoice');
  const [kindFilter, setKindFilter] = useState<'ALL' | 'PARTS_SALE' | 'SERVICE_REPAIR'>('ALL');
  const [payFilter, setPayFilter] = useState<'ALL' | 'UNPAID' | 'PARTIAL' | 'PAID' | 'PENDING'>('ALL');
  const visible = useMemo(
    () =>
      customerInvoices.filter((inv) => {
        if (kindFilter !== 'ALL' && invoiceKind(inv) !== kindFilter) return false;
        if (payFilter === 'ALL') return true;
        const state = invoicePayState(inv);
        if (payFilter === 'UNPAID') return state === 'UNPAID' || inv.status === 'DRAFT' || inv.status === 'OVERDUE';
        if (payFilter === 'PENDING') return state === 'PENDING';
        if (payFilter === 'PARTIAL') return inv.status === 'PARTIAL';
        return state === 'PAID' || inv.status === 'PAID';
      }),
    [customerInvoices, kindFilter, payFilter]
  );

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>(visible[0] || customerInvoices[0]);
  useEffect(() => {
    if (!invoiceQuery) return;
    const match = customerInvoices.find((inv) => inv.invoiceNumber === invoiceQuery);
    if (match) setSelectedInvoice(match);
  }, [invoiceQuery, invoices]);
  useEffect(() => {
    if (!selectedInvoice) return;
    if (!visible.some((inv) => inv.id === selectedInvoice.id)) {
      setSelectedInvoice(visible[0]);
    }
  }, [visible, selectedInvoice]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'ABA_PAY' | 'CREDIT_CARD' | 'CASH' | 'BANK'>('ABA_PAY');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payReference, setPayReference] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [proofInputKey, setProofInputKey] = useState(0);
  const [receiptToView, setReceiptToView] = useState<(typeof paymentReceipts)[number] | null>(null);
  const [showPendingView, setShowPendingView] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);

  useEffect(() => {
    if (!proofFile) {
      setProofPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(proofFile);
    setProofPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [proofFile]);

  const active = visible.find((i) => i.id === selectedInvoice?.id) || visible[0] || selectedInvoice;
  const activeState = active ? invoicePayState(active) : 'UNPAID';
  const pendingForActive: PaymentRecord[] = useMemo(() => {
    if (!active) return [];
    return (payments || []).filter(
      (p) =>
        belongsToCurrentCustomer(currentUser, p) &&
        p.status === 'PENDING' &&
        (p.invoiceId === active.id || p.invoiceNumber === active.invoiceNumber)
    );
  }, [payments, active, currentUser]);
  const customerPayments = (payments || []).filter((p) => {
    if (!belongsToCurrentCustomer(currentUser, p)) return false;
    if (kindFilter === 'ALL' && payFilter === 'ALL') return true;
    const linked = customerInvoices.find((i) => i.id === p.invoiceId || i.invoiceNumber === p.invoiceNumber);
    if (!linked) return payFilter === 'ALL' && kindFilter === 'ALL';
    if (kindFilter !== 'ALL' && invoiceKind(linked) !== kindFilter) return false;
    if (payFilter === 'ALL') return true;
    const state = invoicePayState(linked);
    if (payFilter === 'UNPAID') return state === 'UNPAID' || linked.status === 'DRAFT' || linked.status === 'OVERDUE';
    if (payFilter === 'PENDING') return state === 'PENDING' || p.status === 'PENDING';
    if (payFilter === 'PARTIAL') return linked.status === 'PARTIAL';
    return state === 'PAID' || linked.status === 'PAID';
  });

  const handleDownload = (invNumber: string) => {
    document.title = invNumber;
    window.print();
  };

  const resetPayForm = (invoice?: Invoice) => {
    const target = invoice || active;
    setPayAmount(target ? invoiceRemaining(target).toFixed(2) : '');
    setPayReference('');
    setProofFile(null);
    setProofPreviewUrl(null);
    setProofInputKey((k) => k + 1);
    setPaymentMethod('ABA_PAY');
  };

  const openPayModal = () => {
    if (!active) return;
    if (activeState === 'PAID') return;
    resetPayForm(active);
    setShowPayModal(true);
  };

  const requestRepay = async (payment: PaymentRecord) => {
    setWithdrawingId(payment.id);
    try {
      const ok = await withdrawPaymentClaim(payment.id);
      if (ok) {
        setShowPendingView(false);
        // Portal reload already cleared the pending claim on the server (row + proof image).
        resetPayForm(active);
        setSelectedInvoice((prev) =>
          prev
            ? {
                ...prev,
                paymentState: 'UNPAID',
                status: prev.amountPaid > 0 ? 'PARTIAL' : 'UNPAID',
                amountPending: 0,
              }
            : prev
        );
        setShowPayModal(true);
      }
    } finally {
      setWithdrawingId(null);
    }
  };

  const apiMethod = (): 'CASH' | 'BANK' | 'CARD' | 'QR' => {
    if (paymentMethod === 'CASH') return 'CASH';
    if (paymentMethod === 'BANK') return 'BANK';
    if (paymentMethod === 'CREDIT_CARD') return 'CARD';
    return 'QR';
  };

  const handleExecutePayment = async () => {
    if (!active) return;
    const due = invoiceRemaining(active);
    const amount = parseFloat(payAmount || String(due));
    const error = validatePaymentAmount(amount, due);
    if (error) {
      addToast({ type: 'error', title: 'Invalid Payment', message: error });
      return;
    }
    const method = apiMethod();
    // Card / bank panels are display-only UI. Real claims use KHQR (+ proof) or cash at counter.
    if (method === 'CARD' || method === 'BANK') {
      addToast({
        type: 'info',
        title: 'Use ABA KHQR',
        message: 'Card and bank forms are for display only. Pay with ABA KHQR, then upload your proof.',
      });
      setPaymentMethod('ABA_PAY');
      return;
    }
    const needsProof = method !== 'CASH';
    if (needsProof && !proofFile && liveCustomer) {
      addToast({
        type: 'error',
        title: 'Proof required',
        message: 'Upload your KHQR payment screenshot after you pay.',
      });
      return;
    }

    setIsProcessingPayment(true);
    try {
      if (liveCustomer) {
        const recorded = await submitPaymentClaim({
          invoiceId: active.id,
          amount,
          method,
          reference: payReference.trim() || undefined,
          proofFile,
        });
        if (recorded) {
          setShowPayModal(false);
          setProofFile(null);
          setSelectedInvoice({
            ...active,
            paymentState: 'PENDING',
            status: 'PENDING',
            amountPending: (active.amountPending || 0) + amount,
          });
          setShowPendingView(true);
        }
        return;
      }

      const uiMethod =
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
        customerId: currentUser.id,
        customerName: currentUser.name,
        amount,
        paymentMethod: uiMethod,
        paymentDate: new Date().toISOString().split('T')[0],
        transactionRef: payReference || 'TXN-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        status: 'PENDING',
        receivedBy: 'Customer portal (demo)',
      });
      setShowPayModal(false);
      if (recorded) {
        setSelectedInvoice({
          ...active,
          paymentState: 'PENDING',
          status: 'PENDING',
          amountPending: (active.amountPending || 0) + amount,
        });
        setShowPendingView(true);
        addToast({
          type: 'success',
          title: 'Payment submitted',
          message: 'Demo mode: marked pending. Live mode waits for garage verification.',
        });
      }
    } finally {
      setIsProcessingPayment(false);
    }
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
              Unpaid → pay and upload proof. Pending → wait for verification. Paid → Ready for pickup (90%).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'ALL', label: 'All invoices', icon: Receipt },
              { id: 'PARTS_SALE', label: 'Parts / equipment only', icon: Package },
              { id: 'SERVICE_REPAIR', label: 'Service & repair jobs', icon: Wrench },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setKindFilter(tab.id)}
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

        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'ALL', label: 'All payments', on: 'bg-slate-700 text-white border-slate-600' },
              { id: 'UNPAID', label: 'Unpaid', on: payStateTone('UNPAID').filterOn },
              { id: 'PENDING', label: 'Pending', on: payStateTone('PENDING').filterOn },
              { id: 'PARTIAL', label: 'Partial', on: 'bg-slate-700 text-white border-slate-600' },
              { id: 'PAID', label: 'Paid', on: payStateTone('PAID').filterOn },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setPayFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                payFilter === tab.id
                  ? tab.on
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-600'
              }`}
            >
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
            const state = invoicePayState(inv);
            const tone = payStateTone(state);
            return (
              <button
                key={inv.id}
                type="button"
                onClick={() => setSelectedInvoice(inv)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selected ? tone.cardSelected : tone.cardIdle
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
                  <span className={`text-[10px] font-semibold ${tone.text}`}>
                    {payStateLabel(state).toUpperCase()}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="xl:col-span-8">
          {active ? (
            <div
              className={`bg-slate-900 rounded-3xl border overflow-hidden ${
                activeState === 'PAID'
                  ? 'border-emerald-500/40'
                  : activeState === 'PENDING'
                    ? 'border-orange-500/40'
                    : 'border-red-500/40'
              }`}
            >
              <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${
                        payStateTone(activeState).badge
                      }`}
                    >
                      {payStateLabel(activeState)}
                    </span>
                    <span className="text-xs text-slate-400">{payStateHint(activeState)}</span>
                  </div>
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
                  {activeState === 'PENDING' ? (
                    <button
                      type="button"
                      onClick={() => setShowPendingView(true)}
                      className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        payStateTone('PENDING').button
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View payment
                    </button>
                  ) : activeState !== 'PAID' && invoiceRemaining(active) > 0 ? (
                    <button
                      type="button"
                      onClick={openPayModal}
                      className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        payStateTone('UNPAID').button
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      Pay ${invoiceRemaining(active).toFixed(2)}
                    </button>
                  ) : activeState === 'PAID' ? (
                    <span
                      className={`px-5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${
                        payStateTone('PAID').button
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Paid
                    </span>
                  ) : null}
                </div>
              </div>
              {activeState === 'UNPAID' && (
                <div className={`mx-4 mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs text-white ${payStateTone('UNPAID').alert}`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                  <span className="text-white [&_strong]:text-white">
                    Pay the invoice to continue. Ready for pickup stays locked until payment is verified.
                  </span>
                </div>
              )}
              {activeState === 'PENDING' && (
                <div className={`mx-4 mt-4 flex items-start gap-2 rounded-2xl border px-4 py-3 text-xs text-white ${payStateTone('PENDING').alert}`}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-white" />
                  <span className="text-white [&_strong]:text-white">
                    Waiting for verification. Use <strong>View payment</strong> to check your submission. If the proof is wrong,
                    request a re-pay.
                  </span>
                </div>
              )}
              <div id="garage-sheet" className="invoice-sheet bg-white mt-4">
                <InvoiceDocument invoice={active} theme="light" />
              </div>
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
                <th className="p-3">Proof</th>
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
                    <td className="p-3">
                      {p.proofUrl ? (
                        <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-blue-400 font-semibold hover:underline">
                          View
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3 text-slate-400">{p.paymentDate}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded font-semibold border ${
                          p.status === 'COMPLETED'
                            ? payStateTone('PAID').badge
                            : p.status === 'PENDING'
                              ? payStateTone('PENDING').badge
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {p.status === 'COMPLETED' ? 'PAID' : p.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {p.receiptNumber && p.status === 'COMPLETED' ? (
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

      {showPendingView && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-400" />
                <h3 className="text-base font-bold text-white">Pending payment</h3>
              </div>
              <button type="button" onClick={() => setShowPendingView(false)} className="p-1 text-slate-400 hover:text-white rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400">
              Invoice <span className="font-mono text-white">{active.invoiceNumber}</span> — waiting for garage verification.
            </p>
            {pendingForActive.length === 0 ? (
              <p className="text-sm text-slate-400">No pending claim found. Refresh or contact the garage.</p>
            ) : (
              pendingForActive.map((p) => (
                <div key={p.id} className="rounded-2xl border border-slate-800 bg-slate-950 p-4 space-y-3 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-mono font-bold text-white">{p.paymentIdNumber}</span>
                    <span className={`px-2 py-0.5 rounded border font-semibold ${payStateTone('PENDING').badge}`}>PENDING</span>
                  </div>
                  <div className="flex justify-between"><span className="text-slate-400">Amount</span><span className="font-mono text-white">${p.amount.toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Method</span><span className="text-white">{p.paymentMethod}</span></div>
                  <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="text-white">{p.paymentDate}</span></div>
                  {p.transactionRef ? (
                    <div className="flex justify-between"><span className="text-slate-400">Reference</span><span className="font-mono text-white">{p.transactionRef}</span></div>
                  ) : null}
                  {p.proofUrl ? (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" className="block w-full">
                      <img
                        src={p.proofUrl}
                        alt="Your transaction proof"
                        className="w-full h-auto max-h-[420px] object-contain rounded-xl border border-slate-800 bg-slate-900"
                      />
                      <span className="text-blue-400 font-semibold mt-1 inline-block">Open full image</span>
                    </a>
                  ) : (
                    <p className="text-slate-500">No proof image on this claim (cash at counter).</p>
                  )}
                  <button
                    type="button"
                    disabled={withdrawingId === p.id}
                    onClick={() => void requestRepay(p)}
                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold disabled:opacity-50"
                  >
                    {withdrawingId === p.id ? 'Withdrawing…' : 'Wrong proof? Request re-pay'}
                  </button>
                </div>
              ))
            )}
            {invoiceRemaining(active) > 0 && pendingForActive.length > 0 && (
              <p className="text-[11px] text-slate-500">
                Balance still due after verified amounts: ${invoiceRemaining(active).toFixed(2)}. Withdrawing a pending claim lets you upload a new one.
              </p>
            )}
          </div>
        </div>
      )}

      {showPayModal && active && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
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
            <p className="text-xs text-slate-400">
              Submitting creates a <span className="text-orange-400 font-semibold">Pending</span> claim. Staff must Verify in
              admin before the invoice is Paid.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="text-slate-500">Grand total</div>
                <div className="font-mono font-bold text-white">${active.totalAmount.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="text-slate-500">Verified</div>
                <div className="font-mono font-bold text-white">${active.amountPaid.toFixed(2)}</div>
              </div>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="text-slate-500">Remaining</div>
                <div className="font-mono font-bold text-white">${invoiceRemaining(active).toFixed(2)}</div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Payment amount (exact)</label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Must be exactly <span className="font-mono text-slate-300">${invoiceRemaining(active).toFixed(2)}</span>
                — no more, no less.
              </p>
              <button
                type="button"
                onClick={() => setPayAmount(invoiceRemaining(active).toFixed(2))}
                className="text-[11px] mt-2 px-2 py-1 rounded-lg bg-slate-800 text-slate-300"
              >
                Fill exact amount
              </button>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-300 mb-2">Payment Method</h4>
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
                  Cash at garage
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
            </div>

            {paymentMethod === 'ABA_PAY' && (
              <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs text-slate-400">Scan CarSV KHQR, pay the exact amount, then upload your screenshot.</p>
                <img
                  src="/payments/khqr-carsv.jpg"
                  alt="CarSV ABA KHQR"
                  className="w-full h-auto max-h-[420px] object-contain rounded-xl border border-slate-800 bg-white"
                />
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Transaction proof (required)</label>
                  <label className="flex items-center justify-center gap-2 w-full p-3 rounded-xl border border-dashed border-slate-700 bg-slate-900 text-xs text-slate-300 cursor-pointer hover:border-blue-500">
                    <Upload className="w-4 h-4 text-blue-400" />
                    {proofFile ? proofFile.name : 'Upload KHQR payment screenshot'}
                    <input
                      key={proofInputKey}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    />
                  </label>
                  {proofPreviewUrl ? (
                    <img
                      src={proofPreviewUrl}
                      alt="Selected transaction proof"
                      className="w-full h-auto max-h-[320px] object-contain rounded-xl border border-slate-800 bg-slate-900"
                    />
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Reference (optional)</label>
                  <input
                    type="text"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="ABA ref / last digits"
                    className="w-full p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'CREDIT_CARD' && (
              <div className="rounded-2xl border border-slate-800 bg-white p-4 space-y-3 text-slate-900">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold">Invoice</h5>
                  <span className="text-[10px] text-slate-500">Display only</span>
                </div>
                <div className="flex gap-2 justify-end text-[10px] font-semibold text-slate-500">
                  <span>VISA</span>
                  <span>Mastercard</span>
                  <span>JCB</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Card number</label>
                  <input readOnly tabIndex={-1} placeholder="1234 5678 9012 3456" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Name on card</label>
                  <input readOnly tabIndex={-1} placeholder="Ex. John Website" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Expiry date</label>
                    <input readOnly tabIndex={-1} placeholder="01 / 19" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Security code</label>
                    <input readOnly tabIndex={-1} placeholder="•••" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">Card checkout is UI preview only. Use <span className="font-semibold text-slate-700">ABA KHQR</span> to pay.</p>
              </div>
            )}

            {paymentMethod === 'BANK' && (
              <div className="rounded-2xl border border-slate-800 bg-white p-4 space-y-3 text-slate-900">
                <div className="flex items-center justify-between">
                  <h5 className="text-sm font-bold">Bank transfer</h5>
                  <span className="text-[10px] text-slate-500">Display only</span>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Bank name</label>
                  <input readOnly tabIndex={-1} placeholder="ABA Bank" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account number</label>
                  <input readOnly tabIndex={-1} placeholder="000 123 456" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Account name</label>
                  <input readOnly tabIndex={-1} placeholder="CarSV Garage" className="w-full p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-400 cursor-default" />
                </div>
                <p className="text-[11px] text-slate-500">Bank form is UI preview only. Use <span className="font-semibold text-slate-700">ABA KHQR</span> to pay.</p>
              </div>
            )}

            {paymentMethod === 'CASH' && (
              <p className="text-xs text-slate-400 rounded-xl border border-slate-800 bg-slate-950 p-3">
                Pay at the counter. Staff uploads the bill paper, then clicks <span className="text-white font-semibold">Verify</span>.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPayModal(false)}
                disabled={isProcessingPayment}
                className="w-1/2 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleExecutePayment()}
                disabled={isProcessingPayment}
                className={`w-1/2 py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 ${payStateTone('UNPAID').button}`}
              >
                {isProcessingPayment ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Submit for verify
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {receiptToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="print-sheet relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Payment receipt</h3>
              <button type="button" onClick={() => setReceiptToView(null)} className="p-1 text-slate-400 rounded-full bg-slate-800">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Receipt #</span>
                <span className="font-mono text-white">{receiptToView.receiptNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment ID</span>
                <span className="font-mono text-white">{receiptToView.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Invoice</span>
                <span className="font-mono text-white">{receiptToView.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Customer</span>
                <span className="text-white">{receiptToView.customerName}</span>
              </div>
              {receiptToView.vehicleInfo && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle</span>
                  <span className="text-white">{receiptToView.vehicleInfo}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Method</span>
                <span className="text-white">{receiptToView.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Date</span>
                <span className="text-white">{receiptToView.paymentDate}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Amount</span>
                <span className="font-mono font-bold text-white">${receiptToView.amount.toFixed(2)}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                document.title = receiptToView.receiptNumber;
                window.print();
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
