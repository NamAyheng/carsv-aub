import React, { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  ShieldCheck,
  Award,
  Calendar,
  Car,
  FileCheck
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer, demoCustomerId } from '../../utils/customerScope';

export const CustomerDocumentsView: React.FC = () => {
  const { addToast, vehicles, workOrders, currentUser, warrantyClaims, submitWarrantyClaim, paymentReceipts } = useApp();
  const [claimOpen, setClaimOpen] = useState(false);
  const [partOrService, setPartOrService] = useState('Akebono ceramic brake pads — 12 month warranty');
  const [issue, setIssue] = useState('');
  const myVehicles = (vehicles || []).filter((v) => belongsToCurrentCustomer(currentUser, v));
  const myWOs = (workOrders || []).filter((w) => belongsToCurrentCustomer(currentUser, w));
  const [vehicleId, setVehicleId] = useState(myVehicles[0]?.id || 'veh-1');

  const myReceipts = (paymentReceipts || []).filter((r) => belongsToCurrentCustomer(currentUser, r));
  const myClaims = (warrantyClaims || []).filter((c) => belongsToCurrentCustomer(currentUser, c));

  const customerDocs = [
    {
      id: 'doc-1',
      title: 'Digital Intake Inspection Report (60-Point)',
      category: 'Inspection Report',
      vehicle: 'Toyota Camry Hybrid (PP-1234)',
      date: '2026-09-05',
      fileType: 'PDF',
      fileSize: '4.2 MB'
    },
    {
      id: 'doc-2',
      title: 'Official Tax Invoice #INV-1024',
      category: 'Invoice',
      vehicle: 'Toyota Camry Hybrid (PP-1234)',
      date: '2026-09-05',
      fileType: 'PDF',
      fileSize: '1.1 MB'
    },
    {
      id: 'doc-3',
      title: 'Akebono Ceramic Brake Parts Warranty Certificate (12 Mo)',
      category: 'Warranty Certificate',
      vehicle: 'Toyota Camry Hybrid (PP-1234)',
      date: '2026-09-05',
      fileType: 'PDF',
      fileSize: '820 KB'
    },
    {
      id: 'doc-4',
      title: 'Periodic 40,000 km Service Checklist & Diagnostic Scan',
      category: 'Service Report',
      vehicle: 'Toyota Camry Hybrid (PP-1234)',
      date: '2026-06-12',
      fileType: 'PDF',
      fileSize: '2.8 MB'
    },
    {
      id: 'doc-5',
      title: 'Vehicle Registration Document & Cambo Inspection Certificate',
      category: 'Vehicle Document',
      vehicle: 'Lexus RX350 (PP-5678)',
      date: '2025-11-18',
      fileType: 'PDF',
      fileSize: '3.4 MB'
    }
  ];

  const handleDownloadDoc = (title: string) => {
    addToast({
      type: 'success',
      title: 'Downloading Document',
      message: `${title} is downloading to your device.`
    });
  };

  const handleViewDoc = (title: string) => {
    addToast({
      type: 'info',
      title: 'Document Viewer',
      message: `Opening preview for: ${title}`
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-blue-500" />
          <span>Vehicle Document Vault</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Permanent digital repository storing your invoices, inspection reports, diagnostic readouts, and manufacturer warranties.
        </p>
        <button
          type="button"
          onClick={() => setClaimOpen(true)}
          className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold"
        >
          File warranty claim
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customerDocs.map((doc) => (
          <div
            key={doc.id}
            className="bg-slate-900 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between hover:border-slate-700 transition-all space-y-4"
          >
            <div>
              <div className="flex justify-between items-start gap-2 mb-3">
                <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/20">
                  {doc.category}
                </span>
                <span className="text-[11px] font-mono text-slate-500 font-bold">{doc.fileType} • {doc.fileSize}</span>
              </div>

              <h3 className="text-sm font-bold text-white mb-2 line-clamp-2">{doc.title}</h3>

              <div className="space-y-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-300">{doc.vehicle}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>Uploaded: {doc.date}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => handleViewDoc(doc.title)}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View</span>
              </button>

              <button
                onClick={() => handleDownloadDoc(doc.title)}
                className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-blue-600/30 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {myReceipts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-400" />
            Payment receipts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myReceipts.map((r) => (
              <div key={r.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 text-xs">
                <div className="font-mono font-bold text-white">{r.receiptNumber}</div>
                <div className="text-slate-400 mt-1">{r.invoiceNumber} · ${r.amount.toFixed(2)} · {r.paymentMethod}</div>
                <div className="text-slate-500 mt-1">{r.paymentDate}{r.vehicleInfo ? ` · ${r.vehicleInfo}` : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {myClaims.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Warranty claims
          </h3>
          {myClaims.map((c) => (
            <div key={c.id} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 text-xs">
              <div className="flex justify-between gap-2">
                <span className="font-bold text-white">{c.partOrService}</span>
                <span className="text-amber-400 font-semibold uppercase">{c.status.replace('_', ' ')}</span>
              </div>
              <p className="text-slate-400 mt-1">{c.issueDescription}</p>
              <p className="text-slate-500 mt-1">{c.vehicleInfo} · {c.submittedAt}</p>
            </div>
          ))}
        </div>
      )}

      {claimOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <form
            className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!issue.trim()) {
                addToast({ type: 'error', title: 'Description required', message: 'Please describe the warranty issue.' });
                return;
              }
              const veh = myVehicles.find((v) => v.id === vehicleId) || myVehicles[0];
              submitWarrantyClaim({
                customerId: demoCustomerId(currentUser),
                vehicleId: veh?.id || 'veh-1',
                vehicleInfo: veh ? `${veh.brand} ${veh.model} (${veh.licensePlate})` : 'Vehicle',
                workOrderId: myWOs[0]?.id,
                partOrService,
                issueDescription: issue.trim()
              });
              setClaimOpen(false);
              setIssue('');
            }}
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Warranty claim
            </h3>
            <label className="block text-xs text-slate-400">Vehicle</label>
            <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white">
              {myVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.brand} {v.model} ({v.licensePlate})
                </option>
              ))}
            </select>
            <label className="block text-xs text-slate-400">Covered part or service</label>
            <input value={partOrService} onChange={(e) => setPartOrService(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" />
            <label className="block text-xs text-slate-400">Issue</label>
            <textarea required value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white" placeholder="Describe the fault and when it started." />
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setClaimOpen(false)} className="px-4 py-2 text-xs text-slate-400">
                Cancel
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
                Submit claim
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
