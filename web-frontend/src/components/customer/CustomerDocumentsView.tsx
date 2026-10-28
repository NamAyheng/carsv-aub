import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText,
  Download,
  Eye,
  Calendar,
  Car,
  Printer,
  Wrench,
  User,
  Hash,
  Package,
  Receipt,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer } from '../../utils/customerScope';
import { fulfillmentLabel, isPartsSaleInvoice } from '../../utils/invoices';
import { InvoiceDocument, InvoiceKindBadge } from '../invoices/InvoiceDocument';
import { Invoice, PaymentReceipt, WorkOrder } from '../../types';

type PaperKind = 'Inspection' | 'Invoice' | 'Receipt';

interface GaragePaper {
  id: string;
  title: string;
  subtitle: string;
  category: PaperKind;
  status: string;
  vehicle: string;
  date: string;
  filename: string;
  invoice?: Invoice;
  job?: WorkOrder;
  receipt?: PaymentReceipt;
}

interface VisitFile {
  key: string;
  title: string;
  subtitle: string;
  vehicle: string;
  plate: string;
  date: string;
  papers: GaragePaper[];
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

function inspectionPaper(job: WorkOrder): GaragePaper | null {
  const report = job.beforeInspection;
  if (!report) return null;
  const vehicle = job.vehicleInfo || job.vehiclePlate || 'Vehicle';
  const wo = job.workOrderNumber || (job.id ? `WO-${String(job.id).padStart(4, '0')}` : '');
  const check = report.inspectionStatus || 'Pending';
  return {
    id: `inspection-${job.id}`,
    title: `Inspection for ${job.vehiclePlate || vehicle}`,
    subtitle: wo ? `${check} · ${wo}` : check,
    category: 'Inspection',
    status: check,
    vehicle,
    date: recordDate(report.inspectionDate || job.createdAt || ''),
    filename: fileName(`inspection-${job.vehiclePlate || job.id}`),
    job,
  };
}

function invoicePaper(invoice: Invoice): GaragePaper {
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

function receiptPaper(receipt: PaymentReceipt, invoice?: Invoice): GaragePaper {
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

function visitKeyForJob(job: WorkOrder): string {
  return `wo-${job.id}`;
}

function visitKeyForInvoice(invoice: Invoice): string {
  if (invoice.workOrderId) return `wo-${invoice.workOrderId}`;
  if (invoice.appointmentId) return `bk-${invoice.appointmentId}`;
  return `inv-${invoice.id}`;
}

function buildVisitFiles(
  jobs: WorkOrder[],
  bills: Invoice[],
  receipts: PaymentReceipt[],
): VisitFile[] {
  const billsById = new Map(bills.map((bill) => [bill.id, bill]));
  const billsByNumber = new Map(bills.map((bill) => [bill.invoiceNumber, bill]));
  const files = new Map<string, VisitFile>();

  const ensure = (
    key: string,
    meta: { title: string; subtitle: string; vehicle: string; plate: string; date: string },
  ) => {
    const existing = files.get(key);
    if (existing) {
      if (!existing.date && meta.date) existing.date = meta.date;
      if (!existing.vehicle && meta.vehicle) existing.vehicle = meta.vehicle;
      if (!existing.plate && meta.plate) existing.plate = meta.plate;
      return existing;
    }
    const created: VisitFile = { key, papers: [], ...meta };
    files.set(key, created);
    return created;
  };

  const pushUnique = (file: VisitFile, paper: GaragePaper) => {
    if (file.papers.some((row) => row.id === paper.id)) return;
    file.papers.push(paper);
  };

  for (const job of jobs) {
    const key = visitKeyForJob(job);
    const plate = job.vehiclePlate || '';
    const vehicle = job.vehicleInfo || plate || 'Vehicle';
    const wo = job.workOrderNumber || `WO-${String(job.id).padStart(4, '0')}`;
    const file = ensure(key, {
      title: `Service visit · ${plate || vehicle}`,
      subtitle: wo,
      vehicle,
      plate,
      date: recordDate(job.createdAt || job.beforeInspection?.inspectionDate || ''),
    });
    const inspection = inspectionPaper(job);
    if (inspection) pushUnique(file, inspection);
  }

  for (const bill of bills) {
    const key = visitKeyForInvoice(bill);
    const plate = bill.vehiclePlate || '';
    const vehicle = bill.vehicleInfo || plate || 'Vehicle';
    const parts = isPartsSaleInvoice(bill);
    const file = ensure(key, {
      title: parts
        ? `Parts sale · ${bill.invoiceNumber}`
        : `Service visit · ${plate || vehicle}`,
      subtitle: bill.workOrderNumber || bill.invoiceNumber,
      vehicle,
      plate,
      date: recordDate(bill.issueDate),
    });
    pushUnique(file, invoicePaper(bill));
  }

  for (const receipt of receipts) {
    const invoice =
      billsById.get(receipt.invoiceId) || billsByNumber.get(receipt.invoiceNumber);
    const key = invoice ? visitKeyForInvoice(invoice) : `rcpt-${receipt.id}`;
    const plate = invoice?.vehiclePlate || '';
    const vehicle = receipt.vehicleInfo || invoice?.vehicleInfo || plate || 'Vehicle';
    const file = ensure(key, {
      title: `Service visit · ${plate || vehicle}`,
      subtitle: receipt.invoiceNumber || receipt.receiptNumber,
      vehicle,
      plate,
      date: recordDate(receipt.paymentDate),
    });
    pushUnique(file, receiptPaper(receipt, invoice));
  }

  const kindOrder: Record<PaperKind, number> = { Inspection: 0, Invoice: 1, Receipt: 2 };
  return Array.from(files.values())
    .filter((file) => file.papers.length > 0)
    .map((file) => ({
      ...file,
      papers: [...file.papers].sort((a, b) => kindOrder[a.category] - kindOrder[b.category]),
      date: file.date || file.papers.map((p) => p.date).filter(Boolean).sort().at(-1) || '',
    }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function PaperSheet({ paper }: { paper: GaragePaper }) {
  const job = paper.job;
  const report = job?.beforeInspection;
  const receipt = paper.receipt;
  const invoice = paper.invoice;
  const findings = report
    ? [
        ['Mileage', `${report.mileage.toLocaleString()} km`],
        ['Fuel', report.fuelLabel || '—'],
        ['Condition', report.conditionSummary || '—'],
        ['Damage', report.damageSummary || 'None recorded'],
        ['Complaint', report.complaint || '—'],
        ['Reported problem', job?.reportedProblem || '—'],
      ]
    : [];

  return (
    <div className="overflow-hidden bg-white rounded-2xl border border-slate-200">
      <div className="h-1 bg-blue-600" />
      <div className="px-6 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">Workshop</div>
            <div className="text-lg font-bold leading-tight text-slate-900">
              {paper.category === 'Receipt'
                ? 'Payment receipt'
                : paper.category === 'Invoice'
                  ? 'Invoice'
                  : 'Vehicle inspection'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-semibold text-slate-900">
            {receipt?.receiptNumber || invoice?.invoiceNumber || job?.vehiclePlate || paper.title}
          </div>
          <div className="text-[11px] text-slate-500">{paper.date || '—'}</div>
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
            <div className="font-semibold text-sm text-slate-900">{paper.vehicle || '—'}</div>
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
                  {job.workOrderNumber || `WO-${String(job.id).padStart(4, '0')}`}
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

function paperIcon(kind: PaperKind) {
  if (kind === 'Inspection') return Wrench;
  if (kind === 'Invoice') return Package;
  return Receipt;
}

export const CustomerDocumentsView: React.FC = () => {
  const { workOrders, invoices, currentUser, paymentReceipts, theme } = useApp();
  const isDark = theme === 'dark';
  const [searchParams, setSearchParams] = useSearchParams();
  const fileKey = searchParams.get('file') || '';
  const docFilter = (searchParams.get('type') as 'ALL' | PaperKind | null) || 'ALL';

  const visitFiles = useMemo(() => {
    const jobs = (workOrders || []).filter((row) => belongsToCurrentCustomer(currentUser, row));
    const bills = (invoices || []).filter((row) => belongsToCurrentCustomer(currentUser, row));
    const receipts = (paymentReceipts || []).filter((row) => belongsToCurrentCustomer(currentUser, row));
    return buildVisitFiles(jobs, bills, receipts);
  }, [currentUser, invoices, paymentReceipts, workOrders]);

  const visibleFiles = useMemo(() => {
    if (docFilter === 'ALL') return visitFiles;
    return visitFiles.filter((file) => file.papers.some((paper) => paper.category === docFilter));
  }, [visitFiles, docFilter]);

  const openFile = visitFiles.find((file) => file.key === fileKey) || null;

  const card = isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-500';
  const softBorder = isDark ? 'border-slate-800' : 'border-slate-200';

  const setFilter = (type: 'ALL' | PaperKind) => {
    const next = new URLSearchParams(searchParams);
    if (type === 'ALL') next.delete('type');
    else next.set('type', type);
    setSearchParams(next, { replace: true });
  };

  const openVisit = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('file', key);
    setSearchParams(next);
  };

  const backToList = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('file');
    setSearchParams(next);
  };

  const savePdf = (paper: GaragePaper) => {
    document.title = paper.filename.replace(/\.pdf$/, '');
    window.setTimeout(() => window.print(), 200);
  };

  if (openFile) {
    return (
      <div className="space-y-6">
        <div className={`p-4 sm:p-6 rounded-3xl border space-y-4 min-w-0 ${card}`}>
          <button
            type="button"
            onClick={backToList}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${muted} hover:text-blue-500`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to documents
          </button>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
                <FileText className="w-6 h-6 text-blue-500" />
                <span>{openFile.title}</span>
              </h2>
              <p className={`text-xs mt-1 ${muted}`}>
                All papers from this visit — inspection, invoice, and payment receipt when ready.
              </p>
              <div className={`mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs ${muted}`}>
                <span className="inline-flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  {openFile.vehicle || 'Vehicle'}
                  {openFile.plate ? ` · ${openFile.plate}` : ''}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {openFile.date || 'No date'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  {openFile.subtitle}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {openFile.papers.map((paper) => {
                const Icon = paperIcon(paper.category);
                return (
                  <span
                    key={paper.id}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 border border-blue-500/20 inline-flex items-center gap-1"
                  >
                    <Icon className="w-3 h-3" />
                    {paper.category}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {openFile.papers.map((paper) => (
            <section key={paper.id} className={`rounded-3xl border overflow-hidden ${card}`}>
              <div className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${softBorder}`}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {paper.invoice && paper.category === 'Invoice' ? (
                      <InvoiceKindBadge invoice={paper.invoice} />
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold text-white bg-blue-600">
                        {paper.category}
                      </span>
                    )}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {paper.status}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold truncate">{paper.title}</h3>
                  <p className={`text-xs ${muted}`}>{paper.subtitle}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => savePdf(paper)}
                    className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => savePdf(paper)}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200'
                        : 'bg-slate-100 border-slate-200 text-slate-700'
                    }`}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-transparent">
                <div
                  className={`invoice-sheet max-w-3xl mx-auto ${
                    isDark ? 'invoice-sheet--dark' : 'invoice-sheet--light'
                  }`}
                >
                  {paper.invoice && paper.category === 'Invoice' ? (
                    <div
                      className={`rounded-2xl overflow-hidden border ${
                        isDark ? 'border-slate-700' : 'border-slate-200 bg-white'
                      }`}
                    >
                      <InvoiceDocument invoice={paper.invoice} theme={isDark ? 'dark' : 'light'} />
                    </div>
                  ) : (
                    <PaperSheet paper={paper} />
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className={`p-4 sm:p-6 rounded-3xl border space-y-4 min-w-0 ${card}`}>
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-blue-500" />
            <span>Vehicle documents</span>
          </h2>
          <p className={`text-xs mt-1 ${muted}`}>
            One file per service visit. Open it to see inspection, invoice, and receipt together.
          </p>
        </div>
        <div className="tab-scroll">
          {(
            [
              { id: 'ALL' as const, label: 'All visits', icon: FileText },
              { id: 'Inspection' as const, label: 'With inspections', icon: Wrench },
              { id: 'Invoice' as const, label: 'With invoices', icon: Package },
              { id: 'Receipt' as const, label: 'With receipts', icon: Receipt },
            ]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all shrink-0 whitespace-nowrap ${
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

      {visibleFiles.length === 0 && (
        <p className={`text-sm ${muted}`}>No garage records for your vehicles yet.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFiles.map((file) => (
          <div key={file.key} className={`rounded-2xl border p-5 flex flex-col justify-between space-y-4 ${card}`}>
            <div>
              <div className="flex justify-between items-start gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-600 border border-blue-500/20">
                  Service file
                </span>
                <span className={`text-[11px] font-mono font-bold ${muted}`}>
                  {file.papers.length} paper{file.papers.length === 1 ? '' : 's'}
                </span>
              </div>
              <h3 className="text-sm font-bold mb-2 line-clamp-2">{file.title}</h3>
              <div className={`space-y-1 text-xs ${muted}`}>
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5" />
                  <span>{file.vehicle || 'Vehicle'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{file.date || 'No date'}</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {file.papers.map((paper) => {
                  const Icon = paperIcon(paper.category);
                  return (
                    <span
                      key={paper.id}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold inline-flex items-center gap-1 border ${
                        isDark ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      <Icon className="w-3 h-3 text-blue-500" />
                      {paper.category}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className={`pt-3 border-t ${softBorder}`}>
              <button
                type="button"
                onClick={() => openVisit(file.key)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Open visit documents</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
