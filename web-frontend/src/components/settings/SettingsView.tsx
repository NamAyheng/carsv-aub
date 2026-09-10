import React, { useState } from 'react';
import {
  Settings,
  Building,
  Clock,
  Bell,
  Shield,
  RotateCcw,
  Save,
  Wrench,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { addToast, resetMockData } = useApp();

  const [shopName, setShopName] = useState('CarSV Auto Center & Performance');
  const [phone, setPhone] = useState('+855 23 888 999');
  const [address, setAddress] = useState('Street 271, Sangkat Toul Tompoung, Phnom Penh');
  const [taxId, setTaxId] = useState('KH-VAT-9920192');
  const [hourlyRate, setHourlyRate] = useState(45);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast({
      type: 'success',
      title: 'Configuration Saved',
      message: 'Garage operating parameters updated successfully.'
    });
  };

  const handleResetData = () => {
    resetMockData();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Garage Settings & Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">Administrator and manager. Shop profile, rates, alerts, and demo data reset.</p>
        </div>
        <button
          onClick={handleResetData}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Sample Data</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Business Profile */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-blue-600" />
            <span>Garage Business Profile</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Workshop Name
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Contact Telephone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Physical Garage Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tax Registration / VAT ID
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Default Standard Labor Rate ($ / hour)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(parseInt(e.target.value) || 45)}
                className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours & Bay Allocation */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Workshop Hours & Bay Allocation</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Mon — Fri Operating Hours</span>
              <strong className="text-slate-900 font-mono text-sm block mt-1">07:30 AM – 06:00 PM</strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Saturday Half Day</span>
              <strong className="text-slate-900 font-mono text-sm block mt-1">08:00 AM – 01:00 PM</strong>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-500 block">Active Service Bays</span>
              <strong className="text-blue-600 font-mono text-sm block mt-1">5 Heavy / Medium Lifts</strong>
            </div>
          </div>
        </div>

        {/* Automated Customer Notifications */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm border-b border-slate-100 pb-3">
            <Bell className="w-4 h-4 text-blue-600" />
            <span>Customer Communication & Telemetry</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">SMS Automated Work Order Alerts</span>
                <span className="text-[11px] text-slate-500">Dispatch SMS when vehicle is checked in, ready for pickup, or invoice generated.</span>
              </div>
              <input
                type="checkbox"
                checked={smsEnabled}
                onChange={(e) => setSmsEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">WhatsApp Inspection Reports</span>
                <span className="text-[11px] text-slate-500">Send multi-point photos and quote approval links via WhatsApp chat.</span>
              </div>
              <input
                type="checkbox"
                checked={whatsappEnabled}
                onChange={(e) => setWhatsappEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Warehouse Low-Stock Auto Notifications</span>
                <span className="text-[11px] text-slate-500">Alert workshop manager when critical filters, fluids or brake pads reach threshold.</span>
              </div>
              <input
                type="checkbox"
                checked={lowStockAlerts}
                onChange={(e) => setLowStockAlerts(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="submit"
            className="flex items-center gap-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save All Changes</span>
          </button>
        </div>
      </form>
    </div>
  );
};
