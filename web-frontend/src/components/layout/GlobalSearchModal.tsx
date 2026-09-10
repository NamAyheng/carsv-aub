import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Users,
  Car,
  FileSpreadsheet,
  Boxes,
  Calendar,
  Wrench,
  ArrowRight,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const GlobalSearchModal: React.FC = () => {
  const {
    globalSearchOpen,
    setGlobalSearchOpen,
    customers,
    vehicles,
    workOrders,
    inventory,
    appointments,
    viewWorkOrderDetail,
    viewCustomerDetail,
    viewVehicleDetail,
    setCurrentView
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Global hotkey listener (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen(true);
      }
      if (e.key === 'Escape' && globalSearchOpen) {
        setGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [globalSearchOpen, setGlobalSearchOpen]);

  // Focus input on open
  useEffect(() => {
    if (globalSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [globalSearchOpen]);

  if (!globalSearchOpen) return null;

  const q = query.toLowerCase().trim();

  const matchedCustomers = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
      )
    : [];

  const matchedVehicles = q
    ? vehicles.filter(
        (v) =>
          v.licensePlate.toLowerCase().includes(q) ||
          v.brand.toLowerCase().includes(q) ||
          v.model.toLowerCase().includes(q) ||
          v.vin.toLowerCase().includes(q) ||
          v.customerName.toLowerCase().includes(q)
      )
    : [];

  const matchedWorkOrders = q
    ? workOrders.filter(
        (w) =>
          w.workOrderNumber.toLowerCase().includes(q) ||
          w.customerName.toLowerCase().includes(q) ||
          w.vehiclePlate.toLowerCase().includes(q) ||
          w.reportedProblem.toLowerCase().includes(q)
      )
    : [];

  const matchedParts = q
    ? inventory.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
      )
    : [];

  const matchedAppointments = q
    ? appointments.filter(
        (a) =>
          a.customerName.toLowerCase().includes(q) ||
          a.vehicleInfo.toLowerCase().includes(q) ||
          a.serviceName.toLowerCase().includes(q)
      )
    : [];

  const totalResults =
    matchedCustomers.length +
    matchedVehicles.length +
    matchedWorkOrders.length +
    matchedParts.length +
    matchedAppointments.length;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={() => setGlobalSearchOpen(false)}
      />

      {/* Search Dialog */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customers, license plates, work orders, parts, appointments..."
            className="w-full bg-transparent border-none text-slate-900 placeholder:text-slate-400 focus:outline-hidden text-sm sm:text-base font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs font-mono bg-slate-200 text-slate-600 rounded-md">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q ? (
            <div className="py-8 text-center text-slate-400">
              <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-600">Quick Universal Search</p>
              <p className="text-xs text-slate-400 mt-1">
                Type a customer name, license plate (e.g. PP-1234), work order #, or part name.
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {['PP-1234', 'WO-1024', 'John Doe', 'Brake Pads', 'Oil Change'].map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term)}
                    className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-600 rounded-lg transition-colors border border-slate-200"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="text-sm font-semibold text-slate-600">No records found for "{query}"</p>
              <p className="text-xs text-slate-400 mt-1">Try searching with a broader keyword or license plate.</p>
            </div>
          ) : (
            <>
              {/* Work Orders */}
              {matchedWorkOrders.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
                    Work Orders ({matchedWorkOrders.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchedWorkOrders.map((wo) => (
                      <div
                        key={wo.id}
                        onClick={() => {
                          viewWorkOrderDetail(wo.id);
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 hover:bg-indigo-50/60 rounded-xl cursor-pointer transition-colors border border-slate-100 group"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-indigo-700 font-mono">
                              #{wo.workOrderNumber}
                            </span>
                            <span className="text-xs font-semibold text-slate-900">{wo.vehicleInfo}</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded-full text-slate-700 font-mono font-bold">
                              {wo.vehiclePlate}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            Customer: {wo.customerName} • {wo.reportedProblem}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 shrink-0 ml-2" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {matchedCustomers.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                    Customers ({matchedCustomers.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchedCustomers.map((cust) => (
                      <div
                        key={cust.id}
                        onClick={() => {
                          viewCustomerDetail(cust.id);
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 hover:bg-blue-50/60 rounded-xl cursor-pointer transition-colors border border-slate-100 group"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={cust.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-900">{cust.name}</p>
                            <p className="text-[11px] text-slate-500">{cust.phone} • {cust.email}</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicles */}
              {matchedVehicles.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-sky-500" />
                    Vehicles ({matchedVehicles.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchedVehicles.map((veh) => (
                      <div
                        key={veh.id}
                        onClick={() => {
                          viewVehicleDetail(veh.id);
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 hover:bg-sky-50/60 rounded-xl cursor-pointer transition-colors border border-slate-100 group"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded-md border border-slate-200">
                              {veh.licensePlate}
                            </span>
                            <span className="text-xs font-semibold text-slate-800">
                              {veh.brand} {veh.model} ({veh.year})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Owner: {veh.customerName} • VIN: {veh.vin}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Inventory Parts */}
              {matchedParts.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Boxes className="w-3.5 h-3.5 text-amber-500" />
                    Inventory Parts ({matchedParts.length})
                  </h4>
                  <div className="space-y-1.5">
                    {matchedParts.map((part) => (
                      <div
                        key={part.id}
                        onClick={() => {
                          setCurrentView('Inventory');
                          setGlobalSearchOpen(false);
                        }}
                        className="flex items-center justify-between p-2.5 hover:bg-amber-50/60 rounded-xl cursor-pointer transition-colors border border-slate-100 group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900">{part.name}</p>
                          <p className="text-[11px] text-slate-500">
                            SKU: {part.sku} • Stock: <span className="font-bold">{part.stockQuantity}</span> • ${part.unitPrice}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>Search CarSV records instantaneously</span>
          <span className="font-mono text-[10px]">Use ↑ ↓ to navigate</span>
        </div>
      </div>
    </div>
  );
};
