import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  DollarSign,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  Printer,
  CreditCard,
  Filter
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { Invoice } from '../../types';
import { invoiceKind, isPartsSaleInvoice } from '../../utils/invoices';

interface InvoiceListProps {
  onOpenInvoiceDetail: (invoice: Invoice) => void;
}

export const InvoiceList: React.FC<InvoiceListProps> = ({ onOpenInvoiceDetail }) => {
  const {
    invoices,
    updateInvoice,
    viewCustomerDetail,
    openConfirmDialog,
    addToast
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [kindFilter, setKindFilter] = useState<string>('ALL');

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.vehicleInfo || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.workOrderNumber || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      inv.status === statusFilter ||
      (statusFilter === 'UNPAID' && (inv.status === 'PENDING' || inv.status === 'PARTIAL'));

    const matchesKind = kindFilter === 'ALL' || invoiceKind(inv) === kindFilter;

    return matchesSearch && matchesStatus && matchesKind;
  });

  const totalRevenue = invoices
    .filter((i) => i.status === 'PAID')
    .reduce((acc, i) => acc + i.totalAmount, 0);

  const pendingReceivables = invoices
    .filter((i) => i.status === 'PENDING' || i.status === 'OVERDUE' || i.status === 'PARTIAL')
    .reduce((acc, i) => acc + i.balanceDue, 0);

  const handleMarkPaid = (inv: Invoice) => {
    updateInvoice(inv.id, {
      status: 'PAID',
      paymentMethod: 'KHQR / Card'
    });
    addToast({
      type: 'success',
      title: 'Payment Received',
      message: `Invoice #${inv.invoiceNumber} ($${inv.totalAmount}) marked as PAID.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Invoices & Billing</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {invoices.length} Invoices
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Bills to send: parts-counter sales (POS-…) and workshop repair (INV-…). Cash received is on the Payments page.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Ledger Exported', message: 'Invoice ledger exported as CSV.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export Ledger</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Total Paid Revenue</span>
          <span className="text-2xl font-mono font-extrabold text-emerald-600 mt-1 block">
            ${totalRevenue.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">
            From {invoices.filter((i) => i.status === 'PAID').length} settled tickets (parts + jobs)
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Pending Receivables</span>
          <span className="text-2xl font-mono font-extrabold text-amber-600 mt-1 block">
            ${pendingReceivables.toLocaleString()}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Awaiting customer payment / pickup</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">Average Ticket Size</span>
          <span className="text-2xl font-mono font-extrabold text-blue-600 mt-1 block">
            ${Math.round(totalRevenue / Math.max(1, invoices.filter((i) => i.status === 'PAID').length))}
          </span>
          <p className="text-[11px] text-slate-500 mt-1">Average per customer repair</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice # (e.g. INV-2025-001), customer, or vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={kindFilter}
            onChange={(e) => setKindFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All document types</option>
            <option value="PARTS_SALE">Parts / equipment sales</option>
            <option value="SERVICE_REPAIR">Service & repair jobs</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Payment Statuses</option>
            <option value="PAID">Paid / Settled</option>
            <option value="PENDING">Unpaid / Pending</option>
            <option value="OVERDUE">Overdue</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Invoice #</th>
                <th className="py-3.5 px-4">Type</th>
                <th className="py-3.5 px-4">Customer</th>
                <th className="py-3.5 px-4">Job / sale</th>
                <th className="py-3.5 px-4">Issue Date</th>
                <th className="py-3.5 px-4">Total Amount</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Payment Method</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => onOpenInvoiceDetail(inv)}
                      className={`font-mono font-bold text-xs hover:underline ${
                        isPartsSaleInvoice(inv) ? 'text-amber-800' : 'text-blue-700'
                      }`}
                    >
                      #{inv.invoiceNumber}
                    </button>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {isPartsSaleInvoice(inv) ? 'POS ticket' : `WO: #${inv.workOrderNumber || '—'}`}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`whitespace-nowrap text-xs font-semibold ${
                        isPartsSaleInvoice(inv) ? 'text-amber-600' : 'text-blue-600'
                      }`}
                    >
                      {isPartsSaleInvoice(inv) ? 'Parts' : 'Service'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <p
                      onClick={() => viewCustomerDetail(inv.customerId)}
                      className="font-bold text-slate-900 hover:text-blue-600 cursor-pointer"
                    >
                      {inv.customerName}
                    </p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-slate-800">{inv.vehicleInfo || 'Counter sale (no vehicle job)'}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">
                    {inv.issueDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 text-sm">
                    ${inv.totalAmount}
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                      {inv.paymentMethod || 'Unsettled'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    {inv.status !== 'PAID' && (
                      <button
                        onClick={() => handleMarkPaid(inv)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => onOpenInvoiceDetail(inv)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View & Print Invoice"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
