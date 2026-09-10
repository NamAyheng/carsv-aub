import React from 'react';
import { Invoice } from '../../types';
import { Modal } from '../common/Modal';
import { StatusBadge } from '../common/StatusBadge';
import { Printer } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isPartsSaleInvoice } from '../../utils/invoices';
import { InvoiceDocument, InvoiceKindBadge } from './InvoiceDocument';

interface InvoiceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: Invoice | null;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ isOpen, onClose, invoice }) => {
  const { updateInvoice, addToast } = useApp();

  if (!invoice) return null;

  const partsSale = isPartsSaleInvoice(invoice);

  const handleMarkPaid = () => {
    updateInvoice(invoice.id, {
      status: 'PAID',
      amountPaid: invoice.totalAmount,
      balanceDue: 0,
      paymentMethod: 'Credit Card / POS'
    });
    addToast({
      type: 'success',
      title: 'Invoice Settled',
      message: `Payment of $${invoice.totalAmount} confirmed.`
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${partsSale ? 'Parts sale' : 'Service / repair'} #${invoice.invoiceNumber}`}
      subtitle={
        partsSale
          ? 'Equipment counter ticket — not a workshop work order'
          : `Workshop billing for ${invoice.workOrderNumber || 'the booked job'}`
      }
    >
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <InvoiceKindBadge invoice={invoice} size="md" theme="light" />
          <StatusBadge status={invoice.status} size="sm" />
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200">
          <InvoiceDocument invoice={invoice} theme="light" />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            <Printer className="w-3.5 h-3.5" />
            Print
          </button>
          <div className="flex items-center gap-2">
            {invoice.status !== 'PAID' && (
              <button
                type="button"
                onClick={handleMarkPaid}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
              >
                Accept Payment (${invoice.totalAmount})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
