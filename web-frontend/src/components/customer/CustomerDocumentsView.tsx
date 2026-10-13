import React, { useMemo, useState } from 'react';
import { FileText, Download, Eye, Calendar, Car, X, Printer, Wrench, User, Hash, Package, Receipt } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { fulfillmentLabel, isPartsSaleInvoice } from '../../utils/invoices';
import { InvoiceDocument, InvoiceKindBadge } from '../invoices/InvoiceDocument';
import { Invoice, PaymentReceipt, WorkOrder } from '../../types';

interface GarageRecord {
  id: string;
  title: string;
  subtitle: string;
  category: 'Inspection' | 'Invoice' | 'Receipt';
  status: string;
  vehicle: string;
  date: string;
  filename: string;
  invoice?: Invoice;
  job?: WorkOrder;
  receipt?: PaymentReceipt;
}

function money(amount: number): string {
  return `$${(amount || 0).toFixed(2)}`;
}

function recordDate(value: string): string {
  if (!value) return '';
  return value.includes('T') ? value.slice(0, 10) : value;
}

function fileName(label: string): string {
  const cleaned = label.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${cleaned || 'document'}.pdf`;
}

function inspectionRecord(job: WorkOrder): GarageRecord | null {
  const report = job.beforeInspection;
  if (!report) return null;
  const vehicle = job.vehicleInfo || job.vehiclePlate || 'Vehicle';
  const wo = job.id ? `WO-${String(job.id).padStart(4, '0')}` : '';
  const check = report.inspectionStatus || 'Pending';
  return {
    id: `inspection-${job.id}`,
    title: `Inspection for ${job.vehiclePlate || vehicle}`,
    subtitle: wo ? `${check} · ${wo}` : check,
    category: 'Inspection',
    status: check,
    vehicle,
    date: recordDate(report.inspectionDate || job.createdAt),
    filename: fileName(`inspection-${job.vehiclePlate || job.id}`),
    job,
  };
}

function invoiceRecord(invoice: Invoice): GarageRecord {
  const vehicle = invoice.vehicleInfo || invoice.vehiclePlate || '';
  const wo = invoice.workOrderNumber;
  const parts = isPartsSaleInvoice(invoice);
  return {
    id: `invoice-${invoice.id}`,
    title: parts ? `Parts sale #${invoice.invoiceNumber}` : `Service / repair #${invoice.invoiceNumber}`,
    subtitle: parts
      ? fulfillmentLabel(invoice)
      : wo
        ? `Workshop billing for ${wo}`
        : 'Workshop billing',
    category: 'Invoice',
    status: invoice.status,
    vehicle,
    date: recordDate(invoice.issueDate),
    filename: fileName(invoice.invoiceNumber),
    invoice,
  };
}

function receiptRecord(receipt: PaymentReceipt, invoice?: Invoice): GarageRecord {
  const vehicle = receipt.vehicleInfo || invoice?.vehicleInfo || invoice?.vehiclePlate || '';
  return {
    id: `receipt-${receipt.id}`,
    title: `Receipt #${receipt.receiptNumber}`,
    subtitle: receipt.invoiceNumber ? `Payment on ${receipt.invoiceNumber}` : 'Workshop payment',
    category: 'Receipt',
    status: 'Paid',
    vehicle,
    date: recordDate(receipt.paymentDate),
    filename: fileName(receipt.receiptNumber),
    receipt,
    invoice,
  };
}

function RecordSheet({ record }: { record: GarageRecord }) {
  const job = record.job;
  const report = job?.beforeInspection;
  const receipt = record.receipt;
  const invoice = record.invoice;
  const findings = report
    ? [
        ['Mileage', `${report.mileage.toLocaleString()} km`],
        ['Fuel', report.fuelLabel || '—'],
        ['Condition', report.conditionSummary || '—'],
        ['Damage', report.damageSummary || 'None recorded'],
        ['Complaint', report.complaint || '—'],
        ['Reported problem', job?.reportedProblem || '—'],
        ['Problem', job?.reportedProblem || '—'],
      ]
    : [];

  return (
    <div className="overflow-hidden bg-white">
      <div className="h-1 bg-blue-600" />
      <div className="px-6 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workshop</div>
            <div className="text-lg font-bold leading-tight text-slate-900">
              {record.category === 'Receipt' ? 'Payment receipt' : 'Vehicle inspection'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-slate-900">
            {receipt?.receiptNumber || job?.vehiclePlate || record.title}
          </div>
          <div className="text-[11px] text-slate-500">{record.date || '—'}</div>
        </div>
      </div>
      <div className="px-6 sm:px-8 pb-8 space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-black tracking-tight text-slate-900">
              Car<span className="text-blue-500">SV</span>
            </div>
            <p className="text-xs text-slate-500">Precision garage · St. 271, Phnom Penh · Tax ID K008-902239401</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-slate-500">Customer</div>
            <div className="font-semibold text-sm text-slate-900">
              {job?.customerName || receipt?.customerName || invoice?.customerName || '—'}
            </div>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-slate-500">Vehicle in the bay</div>
            <div className="font-semibold text-sm text-slate-900">{record.vehicle || '—'}</div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-slate-500">
              {(job?.vehiclePlate || invoice?.vehiclePlate) && (
                <span className="inline-flex items-center gap-1">
                  <Car className="w-3 h-3" />
                  {job?.vehiclePlate || invoice?.vehiclePlate}
                </span>
              )}
              {job?.id && (
                <span className="inline-flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {`WO-${String(job.id).padStart(4, '0')}`}
                </span>
              )}
              {(report?.inspectorName || job?.assignedTechnicianName) && (
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {report?.inspectorName || job?.assignedTechnicianName}
                </span>
              )}
            </div>
          </div>
        </div>
        {report && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">1. Check-in findings</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  {findings.map(([label, value]) => (
                    <tr key={label}>
                      <td className="p-3 text-slate-500 w-40">{label}</td>
                      <td className="p-3 font-medium text-slate-900">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(report.inspectorName || job?.assignedTechnicianName) && (
              <p className="text-[11px] text-slate-500 mt-3">
                {report.inspectorName ? `Inspected by ${report.inspectorName}. ` : ''}
                {job?.assignedTechnicianName ? `Repaired by ${job.assignedTechnicianName}.` : ''}
              </p>
            )}
          </div>
        )}
        {receipt && (
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 text-slate-500">1. Payment</h4>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="p-3 text-slate-500 w-40">Invoice</td>
                    <td className="p-3 font-medium text-slate-900">{receipt.invoiceNumber || '—'}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-500">Amount</td>
                    <td className="p-3 font-mono font-semibold text-slate-900">{money(receipt.amount)}</td>
                  </tr>
                  <tr>
                    <td className="p-3 text-slate-500">Method</td>
                    <td className="p-3 font-medium text-slate-900">{receipt.paymentMethod}</td>
                  </tr>
                  {invoice && (
                    <tr>
                      <td className="p-3 text-slate-500">Invoice balance</td>
                      <td className="p-3 font-mono text-slate-900">{money(invoice.balanceDue)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export const CustomerDocumentsView: React.FC = () => {
  const { workOrders, invoices, currentUser, paymentReceipts, theme } = useApp();
  const isDark = theme === 'dark';
  const [openId, setOpenId] = useState<string | null>(null);
  const [docFilter, setDocFilter] = useState<'ALL' | 'Inspection' | 'Invoice' | 'Receipt'>('ALL');

  const records = useMemo(() => {
    const jobs = (workOrders || []).filter((row) => belongsToCurrentCustomer(currentUser, row));
    const bills = (invoices || []).filter((row) => belongsToCurrentCustomer(currentUser, row));
    const receipts = (paymentReceipts || []).filter((row) => belongsToCurrentCustomer(currentUser, row));
    const billsById = new Map<string, Invoice>(bills.map((bill) => [bill.id, bill]));
    const billsByNumber = new Map<string, Invoice>(bills.map((bill) => [bill.invoiceNumber, bill]));
    return [
      ...jobs.map(inspectionRecord).filter((item): item is GarageRecord => item !== null),
      ...bills.map(invoiceRecord),
      ...receipts.map((receipt) =>
        receiptRecord(receipt, billsById.get(receipt.invoiceId) || billsByNumber.get(receipt.invoiceNumber))
      ),
    ];
  }, [currentUser, invoices, paymentReceipts, workOrders]);

  const visible = useMemo(
    () => records.filter((row) => docFilter === 'ALL' || row.category === docFilter),
    [records, docFilter]
  );

  const open = records.find((record) => record.id === openId) || null;
  const card = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';

  const savePdf = (record: GarageRecord) => {
    setOpenId(record.id);
    document.title = record.filename.replace(/\.pdf$/, '');
    window.setTimeout(() => window.print(), 200);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-3xl border space-y-4 ${card}`}>
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-500" />
            <span>Vehicle documents</span>
          </h2>
          <p className={`text-xs mt-1 ${muted}`}>
            Inspections, invoices, and payment receipts from work done on your vehicles.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'ALL', label: 'All documents', icon: FileText },
              { id: 'Inspection', label: 'Inspections', icon: Wrench },
              { id: 'Invoice', label: 'Invoices', icon: Package },
              { id: 'Receipt', label: 'Payment receipts', icon: Receipt }
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setDocFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                docFilter === tab.id
                  ? isDark
                    ? 'bg-slate-700 text-white border-slate-600'
                    : 'bg-slate-900 text-white border-slate-900'
                  : isDark
                    ? 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    : 'bg-white text-slate-500 border-slate-200 hover:text-slate-800'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 && (
        <p className={`text-sm ${muted}`}>No garage records for your vehicles yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((doc) => (
          <div key={doc.id} className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${card}`}>
            <div>
              <div className="flex justify-between items-start gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 border border-blue-500/20">
                  {doc.category}
                </span>
                <span className={`text-[11px] font-mono font-bold ${muted}`}>PDF</span>
              </div>
              <h3 className="text-sm font-bold mb-2 line-clamp-2">{doc.title}</h3>
              <div className={`space-y-1 text-xs ${muted}`}>
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  <span>{doc.vehicle || 'Vehicle'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{doc.date || 'No date'}</span>
                </div>
              </div>
            </div>
            <div className={`pt-3 border-t flex items-center gap-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
              <button
                type="button"
                onClick={() => setOpenId(doc.id)}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border ${
                  isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>
              <button
                type="button"
                onClick={() => savePdf(doc)}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="invoice-sheet w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white text-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-base font-bold text-slate-900">{open.title}</h3>
                <p className="text-xs text-slate-500">{open.subtitle}</p>
              </div>
              <button type="button" onClick={() => setOpenId(null)} className="text-slate-400" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-5 pt-4">
              <div className="flex items-center gap-2 mb-3">
                {open.invoice && open.category === 'Invoice' ? (
                  <InvoiceKindBadge invoice={open.invoice} />
                ) : (
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-blue-600">{open.category}</span>
                )}
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-slate-100 text-slate-500">
                  {open.status}
                </span>
              </div>
            </div>
            <div id="garage-sheet">
              {open.invoice && open.category === 'Invoice' ? (
                <InvoiceDocument invoice={open.invoice} theme="light" />
              ) : (
                <RecordSheet record={open} />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => savePdf(open)}
                className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
              <button type="button" onClick={() => setOpenId(null)} className="px-4 py-2 text-xs font-semibold text-slate-500">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
