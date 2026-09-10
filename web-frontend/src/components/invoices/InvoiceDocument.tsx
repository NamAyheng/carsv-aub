import React from 'react';
import { Car, Package, Wrench, MapPin, User, Hash, ShoppingBag, Info } from 'lucide-react';
import { Invoice } from '../../types';
import {
  extraPartsOnJob,
  fulfillmentLabel,
  invoiceKind,
  isPartsSaleInvoice,
  itemAmount,
  laborSubtotal,
  partsSubtotal
} from '../../utils/invoices';

interface InvoiceDocumentProps {
  invoice: Invoice;
  theme?: 'dark' | 'light';
}

const money = (n: number) => `$${(n || 0).toFixed(2)}`;

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ invoice, theme = 'dark' }) => {
  const mode: 'dark' | 'light' = theme === 'light' ? 'light' : 'dark';
  return isPartsSaleInvoice(invoice) ? (
    <PartsSaleSheet invoice={invoice} theme={mode} />
  ) : (
    <ServiceRepairSheet invoice={invoice} theme={mode} />
  );
};

function sheetWrap(dark: boolean, kind: 'parts' | 'service') {
  const accent = kind === 'parts' ? (dark ? 'bg-amber-500' : 'bg-amber-500') : dark ? 'bg-blue-500' : 'bg-blue-600';
  const body = dark
    ? 'bg-slate-900 text-slate-200 border border-slate-700/80'
    : 'bg-white text-slate-700 border border-slate-200';
  return { accent, body };
}

function PartsSaleSheet({ invoice, theme }: InvoiceDocumentProps) {
  const dark = theme === 'dark';
  const extraFitting = (invoice.items || []).filter((i) => i.type !== 'PART');
  const goods = (invoice.items || []).filter((i) => i.type === 'PART');
  const { accent, body } = sheetWrap(dark, 'parts');
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const title = dark ? 'text-white' : 'text-slate-900';
  const card = dark ? 'bg-slate-950/50 border border-slate-800' : 'bg-slate-50 border border-slate-200';
  const tableHead = dark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500';
  const tableBorder = dark ? 'border-slate-800' : 'border-slate-200';
  const divide = dark ? 'divide-slate-800' : 'divide-slate-100';

  return (
    <div className={`overflow-hidden ${body}`}>
      <div className={`h-1 ${accent}`} />
      <div className="px-6 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              dark ? 'bg-slate-800 text-amber-400' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${muted}`}>Equipment desk</div>
            <div className={`text-lg font-bold leading-tight ${title}`}>Parts sale</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-lg font-semibold ${title}`}>{invoice.invoiceNumber}</div>
          <div className={`text-[11px] ${muted}`}>Counter ticket · no work order</div>
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className={`text-xl font-black tracking-tight ${title}`}>
              Car<span className={dark ? 'text-amber-400' : 'text-amber-600'}>SV</span>
              <span className={`ml-2 text-sm font-semibold ${muted}`}>Parts Counter</span>
            </div>
            <p className={`text-xs mt-1 ${muted}`}>St. 271, Khan Meanchey, Phnom Penh · Tax ID K008-902239401</p>
          </div>
          <div className={`text-xs space-y-0.5 font-mono ${muted}`}>
            <div>Issued {invoice.issueDate}</div>
            <div>Due {invoice.dueDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className={`p-3.5 rounded-xl ${card}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>Sold to</div>
            <div className={`font-semibold ${title}`}>{invoice.customerName}</div>
            <div className={muted}>{invoice.customerEmail}</div>
            <div className={muted}>{invoice.customerPhone}</div>
          </div>
          <div className={`p-3.5 rounded-xl ${card}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>Fulfillment</div>
            <div className={`flex items-center gap-1.5 font-semibold ${title}`}>
              <ShoppingBag className={`w-3.5 h-3.5 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
              {fulfillmentLabel(invoice)}
            </div>
            <div className={`mt-1 ${muted}`}>Retail / POS ticket</div>
          </div>
          <div className={`p-3.5 rounded-xl ${card}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>Fitment</div>
            <div className={`font-semibold ${title}`}>{invoice.vehicleInfo || 'No vehicle on this sale'}</div>
            {invoice.vehiclePlate && <div className={`font-mono mt-0.5 ${muted}`}>{invoice.vehiclePlate}</div>}
          </div>
        </div>

        <div>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${muted}`}>Equipment sold</h4>
          <div className={`overflow-x-auto rounded-xl border ${tableBorder}`}>
            <table className="w-full text-left text-xs">
              <thead className={tableHead}>
                <tr className="uppercase text-[10px] tracking-wider">
                  <th className="p-3 font-semibold">SKU</th>
                  <th className="p-3 font-semibold">Item</th>
                  <th className="p-3 text-center font-semibold">Qty</th>
                  <th className="p-3 text-right font-semibold">Unit</th>
                  <th className="p-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {goods.map((item) => (
                  <tr key={item.id}>
                    <td className={`p-3 font-mono ${muted}`}>{item.sku || '—'}</td>
                    <td className={`p-3 font-medium ${title}`}>{item.description}</td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{money(item.unitPrice)}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${title}`}>{money(itemAmount(item))}</td>
                  </tr>
                ))}
                {extraFitting.map((item) => (
                  <tr key={item.id}>
                    <td className={`p-3 font-mono ${muted}`}>FEE</td>
                    <td className={`p-3 ${muted}`}>{item.description}</td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{money(item.unitPrice)}</td>
                    <td className="p-3 text-right font-mono font-semibold">{money(itemAmount(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Totals invoice={invoice} dark={dark} hideLaborSplit />

        {invoice.notes && <p className={`text-[11px] leading-relaxed ${muted}`}>{invoice.notes}</p>}
        <p className={`text-[11px] ${muted}`}>
          Warranty applies to sold equipment only. This is not a workshop repair invoice.
        </p>
      </div>
    </div>
  );
}

function ServiceRepairSheet({ invoice, theme }: InvoiceDocumentProps) {
  const dark = theme === 'dark';
  const labor = (invoice.items || []).filter((i) => i.type === 'LABOR' || i.type === 'SERVICE');
  const jobParts = (invoice.items || []).filter((i) => i.type === 'PART');
  const extras = extraPartsOnJob(invoice);
  const { accent, body } = sheetWrap(dark, 'service');
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const title = dark ? 'text-white' : 'text-slate-900';
  const card = dark ? 'bg-slate-950/50 border border-slate-800' : 'bg-slate-50 border border-slate-200';
  const tableHead = dark ? 'bg-slate-950 text-slate-400' : 'bg-slate-50 text-slate-500';
  const tableBorder = dark ? 'border-slate-800' : 'border-slate-200';
  const divide = dark ? 'divide-slate-800' : 'divide-slate-100';

  return (
    <div className={`overflow-hidden ${body}`}>
      <div className={`h-1 ${accent}`} />
      <div className="px-6 sm:px-8 py-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              dark ? 'bg-slate-800 text-blue-400' : 'bg-blue-50 text-blue-700'
            }`}
          >
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${muted}`}>Workshop</div>
            <div className={`text-lg font-bold leading-tight ${title}`}>Service &amp; repair</div>
          </div>
        </div>
        <div className="text-right">
          <div className={`font-mono text-lg font-semibold ${title}`}>{invoice.invoiceNumber}</div>
          <div className={`text-[11px] ${muted}`}>
            Work order {invoice.workOrderNumber || invoice.workOrderId || '—'}
          </div>
        </div>
      </div>

      <div className="px-6 sm:px-8 pb-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                dark ? 'bg-slate-800 text-blue-400' : 'bg-blue-600 text-white'
              }`}
            >
              <Car className="w-5 h-5" />
            </div>
            <div>
              <div className={`text-xl font-black tracking-tight ${title}`}>
                Car<span className="text-blue-500">SV</span>
              </div>
              <p className={`text-xs ${muted}`}>Precision garage · St. 271, Phnom Penh · Tax ID K008-902239401</p>
            </div>
          </div>
          <div className={`text-xs space-y-0.5 font-mono ${muted}`}>
            <div>Issued {invoice.issueDate}</div>
            <div>Due {invoice.dueDate}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className={`p-3.5 rounded-xl ${card}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>Customer</div>
            <div className={`font-semibold text-sm ${title}`}>{invoice.customerName}</div>
            <div className={muted}>{invoice.customerEmail}</div>
            <div className={muted}>{invoice.customerPhone}</div>
          </div>
          <div className={`p-3.5 rounded-xl ${card}`}>
            <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${muted}`}>Vehicle in the bay</div>
            <div className={`font-semibold text-sm ${title}`}>{invoice.vehicleInfo || '—'}</div>
            <div className={`flex flex-wrap gap-x-3 gap-y-1 mt-1 ${muted}`}>
              <span className="inline-flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {invoice.workOrderNumber || 'WO'}
              </span>
              {invoice.bayNumber && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {invoice.bayNumber}
                </span>
              )}
              {invoice.technicianName && (
                <span className="inline-flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {invoice.technicianName}
                </span>
              )}
            </div>
          </div>
        </div>

        {extras.length > 0 && (
          <div
            className={`flex items-start gap-2 p-3 rounded-xl text-xs border-l-2 ${
              dark
                ? 'bg-slate-950/60 border-l-amber-400 border-y border-r border-slate-800 text-slate-300'
                : 'bg-slate-50 border-l-amber-500 border-y border-r border-slate-200 text-slate-600'
            }`}
          >
            <Info className={`w-4 h-4 shrink-0 mt-0.5 ${dark ? 'text-amber-400' : 'text-amber-600'}`} />
            <span>
              Extra parts were added after booking. They stay on this workshop invoice, not a parts-counter ticket.
            </span>
          </div>
        )}

        <div>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${muted}`}>1. Booked labor &amp; services</h4>
          <div className={`overflow-x-auto rounded-xl border ${tableBorder}`}>
            <table className="w-full text-left text-xs">
              <thead className={tableHead}>
                <tr className="uppercase text-[10px] tracking-wider">
                  <th className="p-3 font-semibold">Description</th>
                  <th className="p-3 text-center font-semibold">Hrs / qty</th>
                  <th className="p-3 text-right font-semibold">Rate</th>
                  <th className="p-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {labor.map((item) => (
                  <tr key={item.id}>
                    <td className={`p-3 font-medium ${title}`}>{item.description}</td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{money(item.unitPrice)}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${title}`}>{money(itemAmount(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h4 className={`text-xs font-semibold uppercase tracking-wider mb-2 ${muted}`}>2. Parts used on this job</h4>
          <div className={`overflow-x-auto rounded-xl border ${tableBorder}`}>
            <table className="w-full text-left text-xs">
              <thead className={tableHead}>
                <tr className="uppercase text-[10px] tracking-wider">
                  <th className="p-3 font-semibold">Part / SKU</th>
                  <th className="p-3 font-semibold">When</th>
                  <th className="p-3 text-center font-semibold">Qty</th>
                  <th className="p-3 text-right font-semibold">Unit</th>
                  <th className="p-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${divide}`}>
                {jobParts.map((item) => (
                  <tr key={item.id} className={item.addedAfterBooking ? (dark ? 'bg-slate-950/40' : 'bg-slate-50') : undefined}>
                    <td className="p-3">
                      <div className={`font-medium ${title}`}>{item.description}</div>
                      {item.sku && <div className={`font-mono text-[10px] ${muted}`}>{item.sku}</div>}
                    </td>
                    <td className="p-3">
                      {item.addedAfterBooking ? (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            dark ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          Added after booking
                        </span>
                      ) : (
                        <span className={muted}>On original job</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono">{item.quantity}</td>
                    <td className="p-3 text-right font-mono">{money(item.unitPrice)}</td>
                    <td className={`p-3 text-right font-mono font-semibold ${title}`}>{money(itemAmount(item))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <Totals invoice={invoice} dark={dark} />

        {invoice.notes && <p className={`text-[11px] leading-relaxed ${muted}`}>{invoice.notes}</p>}
        <p className={`text-[11px] ${muted}`}>
          12-month / 20,000 km workmanship warranty on booked labor and parts fitted in the bay.
        </p>
      </div>
    </div>
  );
}

function Totals({
  invoice,
  dark,
  hideLaborSplit
}: {
  invoice: Invoice;
  dark: boolean;
  hideLaborSplit?: boolean;
}) {
  const muted = dark ? 'text-slate-400' : 'text-slate-500';
  const title = dark ? 'text-white' : 'text-slate-900';
  const line = dark ? 'border-slate-800' : 'border-slate-200';

  return (
    <div className="flex justify-end">
      <div className="w-full sm:w-80 space-y-2 text-xs">
        {!hideLaborSplit && (
          <>
            <div className={`flex justify-between ${muted}`}>
              <span>Labor / services</span>
              <span className="font-mono">{money(laborSubtotal(invoice))}</span>
            </div>
            <div className={`flex justify-between ${muted}`}>
              <span>Parts on this invoice</span>
              <span className="font-mono">{money(partsSubtotal(invoice))}</span>
            </div>
          </>
        )}
        <div className={`flex justify-between ${muted}`}>
          <span>Subtotal</span>
          <span className="font-mono">{money(invoice.subtotal)}</span>
        </div>
        {invoice.discountAmount > 0 && (
          <div className={`flex justify-between ${muted}`}>
            <span>Discount</span>
            <span className="font-mono">−{money(invoice.discountAmount)}</span>
          </div>
        )}
        <div className={`flex justify-between ${muted}`}>
          <span>VAT {invoice.taxRatePercent}%</span>
          <span className="font-mono">{money(invoice.taxAmount)}</span>
        </div>
        <div className={`flex justify-between pt-2 border-t text-sm font-bold ${line} ${title}`}>
          <span>Total</span>
          <span className="font-mono">{money(invoice.totalAmount)}</span>
        </div>
        {invoice.amountPaid > 0 && (
          <div className={`flex justify-between ${muted}`}>
            <span>Paid</span>
            <span className="font-mono">{money(invoice.amountPaid)}</span>
          </div>
        )}
        {invoice.balanceDue > 0 && (
          <div className={`flex justify-between font-semibold ${title}`}>
            <span>Balance due</span>
            <span className="font-mono">{money(invoice.balanceDue)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function InvoiceKindBadge({
  invoice,
  size = 'sm'
}: {
  invoice: Invoice;
  size?: 'sm' | 'md';
  theme?: 'dark' | 'light';
}) {
  const parts = invoiceKind(invoice) === 'PARTS_SALE';
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2.5 py-0.5 text-[10px]';
  return (
    <span
      className={`${pad} rounded-md font-bold tracking-wide text-white ${
        parts ? 'bg-amber-500' : 'bg-blue-600'
      }`}
    >
      {parts ? 'Parts' : 'Service / repair'}
    </span>
  );
}
