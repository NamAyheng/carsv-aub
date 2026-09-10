import React, { useState } from 'react';
import {
  Car,
  Plus,
  Wrench,
  Calendar,
  History,
  FileText,
  Fuel,
  Gauge,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Package
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer, demoCustomerId } from '../../utils/customerScope';
import { findDuplicateVehicle } from '../../utils/garageLogic';
import { Vehicle } from '../../types';

interface CustomerVehiclesViewProps {
  onBookServiceForVehicle: (vehicleId: string) => void;
  onViewWorkOrder: (workOrderId: string) => void;
  onBrowseParts?: () => void;
}

export const CustomerVehiclesView: React.FC<CustomerVehiclesViewProps> = ({
  onBookServiceForVehicle,
  onViewWorkOrder,
  onBrowseParts
}) => {
  const { vehicles, workOrders, serviceHistory, currentUser, addVehicle, addToast } = useApp();

  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);

  // Add Vehicle Form state
  const [brand, setBrand] = useState('Toyota');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('2023');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('24000');
  const [color, setColor] = useState('Pearl White');
  const [fuelType, setFuelType] = useState<Vehicle['fuelType']>('Hybrid');
  const [transmission, setTransmission] = useState<Vehicle['transmission']>('Automatic');

  // Vehicles for the current customer (with fallback demo data if fresh customer)
  const myVehicles = (vehicles || []).filter((v) => belongsToCurrentCustomer(currentUser, v));

  const handleAddVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model || !licensePlate) {
      addToast({
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please provide at least the model and license plate number.'
      });
      return;
    }

    const plate = licensePlate.trim();
    const vinValue = vin.trim();
    const duplicate = findDuplicateVehicle(vehicles || [], plate, vinValue);
    if (duplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Vehicle',
        message: `This plate or VIN is already registered (${duplicate.licensePlate}).`
      });
      return;
    }

    const added = addVehicle({
      customerId: demoCustomerId(currentUser),
      customerName: currentUser.name,
      brand,
      model,
      year: parseInt(year) || 2023,
      licensePlate: plate,
      vin: vinValue || 'VIN' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      mileage: parseInt(mileage) || 15000,
      fuelType,
      transmission,
      color,
      status: 'READY',
      image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=500&auto=format&fit=crop&q=80'
    });
    if (!added) return;
    setShowAddVehicleModal(false);

    // Reset fields
    setModel('');
    setLicensePlate('');
    setVin('');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 p-6 rounded-3xl border border-slate-800">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <Car className="w-6 h-6 text-blue-500" />
            <span>My Garage & Vehicles</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your registered automobiles, inspect factory specifications, and review lifetime service records.
          </p>
        </div>

        <button
          onClick={() => setShowAddVehicleModal(true)}
          className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Vehicle</span>
        </button>
      </div>

      {/* Vehicles Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {myVehicles.map((vehicle) => {
          // Find work orders for this vehicle
          const vehicleWorkOrders = (workOrders || []).filter(
            (wo) => wo.vehicleId === vehicle.id || wo.vehicleInfo?.includes(vehicle.licensePlate)
          );
          const activeWO = vehicleWorkOrders.find(
            (wo) =>
              wo.status === 'IN_PROGRESS' ||
              wo.status === 'ASSIGNED' ||
              wo.status === 'WAITING_APPROVAL' ||
              wo.status === 'READY_FOR_PICKUP'
          );

          return (
            <div
              key={vehicle.id}
              className="bg-slate-900 rounded-3xl border border-slate-800/90 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Vehicle Header / Image Banner */}
                <div className="relative h-48 sm:h-56 bg-slate-950 overflow-hidden">
                  <img
                    src={
                      vehicle.imageUrl ||
                      vehicle.image ||
                      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop&q=80'
                    }
                    alt={`${vehicle.brand} ${vehicle.model}`}
                    className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-blue-600/90 text-white shadow-md">
                      {vehicle.brand}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/80 backdrop-blur-xs text-slate-200 border border-slate-700">
                      {vehicle.year}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4">
                    <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950/90 text-amber-400 border border-amber-500/30">
                      Plate: {vehicle.licensePlate}
                    </span>
                  </div>

                  {activeWO && (
                    <div className="keep-on-dark absolute bottom-3 left-4 right-4 bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-white font-bold">
                          {activeWO.status === 'READY_FOR_PICKUP' ? 'Ready for pickup' : 'Active in workshop'}
                        </span>
                      </div>
                      <button
                        onClick={() => onViewWorkOrder(activeWO.id)}
                        className="text-white font-bold hover:underline flex items-center gap-1"
                      >
                        <span>Track</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-baseline">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {vehicle.brand} {vehicle.model}
                    </h3>
                    <span className="text-xs text-slate-400 font-mono">
                      VIN: {vehicle.vin || 'JT2BF22K1W001928'}
                    </span>
                  </div>

                  {/* Key Metric Pills */}
                  <div className="grid grid-cols-3 gap-2.5 text-xs text-slate-300">
                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Gauge className="w-3 h-3 text-blue-400" />
                        <span>Odometer</span>
                      </div>
                      <div className="font-bold font-mono text-white mt-0.5">
                        {vehicle.mileage?.toLocaleString() || '42,500'} km
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Fuel className="w-3 h-3 text-emerald-400" />
                        <span>Powertrain</span>
                      </div>
                      <div className="font-bold text-white mt-0.5 capitalize">
                        {vehicle.fuelType || 'Hybrid'}
                      </div>
                    </div>

                    <div className="bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-purple-400" />
                        <span>Color</span>
                      </div>
                      <div className="font-bold text-white mt-0.5 truncate">
                        {vehicle.color || 'Silver'}
                      </div>
                    </div>
                  </div>

                  {(vehicle.nextServiceMileage || vehicle.nextServiceDate) && (
                    <div className="text-[11px] text-slate-400 bg-slate-950/70 p-2.5 rounded-xl border border-slate-800">
                      Next maintenance:{' '}
                      <span className="text-white font-semibold">
                        {vehicle.nextServiceMileage ? `${vehicle.nextServiceMileage.toLocaleString()} km` : ''}
                        {vehicle.nextServiceMileage && vehicle.nextServiceDate ? ' · ' : ''}
                        {vehicle.nextServiceDate || ''}
                      </span>
                      {vehicle.nextServiceMileage ? (
                        <span className="text-slate-500"> (oil interval +5,000 km)</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-6 pt-0 flex flex-wrap gap-2.5">
                <button
                  onClick={() => setSelectedVehicleDetails(vehicle)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>View Details</span>
                </button>

                <button
                  onClick={() => setSelectedVehicleDetails(vehicle)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-blue-400" />
                  <span>Service History</span>
                </button>

                {onBrowseParts && (
                  <button
                    onClick={onBrowseParts}
                    className="py-2.5 px-3 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-xs font-bold transition-all border border-blue-500/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Parts</span>
                  </button>
                )}

                <button
                  onClick={() => onBookServiceForVehicle(vehicle.id)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Book Service</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD NEW VEHICLE */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Car className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-white">Register New Vehicle</h3>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Make / Brand</label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Toyota">Toyota</option>
                    <option value="Lexus">Lexus</option>
                    <option value="Honda">Honda</option>
                    <option value="Ford">Ford</option>
                    <option value="Hyundai">Hyundai</option>
                    <option value="Mazda">Mazda</option>
                    <option value="Mercedes-Benz">Mercedes-Benz</option>
                    <option value="BMW">BMW</option>
                    <option value="Audi">Audi</option>
                    <option value="Kia">Kia</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Model Name</label>
                  <input
                    type="text"
                    required
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Camry / RX350"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Model Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">License Plate</label>
                  <input
                    type="text"
                    required
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    placeholder="e.g. 2BD-9988"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Current Mileage (km)</label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Fuel Type</label>
                  <select
                    value={fuelType}
                    onChange={(e) => setFuelType(e.target.value as Vehicle['fuelType'])}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Gasoline">Petrol (Gasoline)</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid (HEV/PHEV)</option>
                    <option value="Electric">Electric (EV)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Transmission</label>
                  <select
                    value={transmission}
                    onChange={(e) => setTransmission(e.target.value as Vehicle['transmission'])}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="Automatic">Automatic</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Exterior Color</label>
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  VIN (Vehicle Identification Number)
                </label>
                <input
                  type="text"
                  value={vin}
                  onChange={(e) => setVin(e.target.value)}
                  placeholder="Optional 17-digit chassis number"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg"
                >
                  Save Vehicle
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: VEHICLE DETAILS & SERVICE HISTORY TIMELINE */}
      {selectedVehicleDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Car className="w-5 h-5 text-blue-500" />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedVehicleDetails.brand} {selectedVehicleDetails.model} ({selectedVehicleDetails.year})
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Plate: {selectedVehicleDetails.licensePlate} • VIN: {selectedVehicleDetails.vin || 'N/A'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVehicleDetails(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Detailed Specs Block */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
                  Vehicle Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Odometer</span>
                    <span className="font-bold text-white font-mono">
                      {selectedVehicleDetails.mileage?.toLocaleString() || '42,500'} km
                    </span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Powertrain</span>
                    <span className="font-bold text-white capitalize">{selectedVehicleDetails.fuelType || 'Hybrid'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Transmission</span>
                    <span className="font-bold text-white capitalize">{selectedVehicleDetails.transmission || 'Automatic'}</span>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span className="text-slate-500 text-[10px] block">Color</span>
                    <span className="font-bold text-white">{selectedVehicleDetails.color || 'Silver'}</span>
                  </div>
                </div>
              </div>

              {/* Chronological Service History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <span>Service & Repair History Timeline</span>
                </h4>

                {(() => {
                  const history = (serviceHistory || [])
                    .filter((h) => h.vehicleId === selectedVehicleDetails.id)
                    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
                  if (history.length === 0) {
                    return <p className="text-xs text-slate-500">No service history recorded yet for this vehicle.</p>;
                  }
                  return (
                    <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800 pl-8">
                      {history.map((h) => (
                        <div key={h.id} className="relative">
                          <div
                            className={`absolute -left-8 top-1 w-4 h-4 rounded-full border-2 border-slate-900 ${
                              h.status === 'IN_PROGRESS' ? 'bg-blue-600' : 'bg-emerald-600'
                            }`}
                          />
                          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-1.5">
                            <div className="flex justify-between items-start gap-2">
                              <span className="font-bold text-white text-sm">{h.serviceType}</span>
                              <span className="text-slate-300 font-mono font-bold text-xs">${h.totalCost.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-slate-400">
                              Technician: {h.mechanicName} · Status:{' '}
                              <span className={h.status === 'COMPLETED' ? 'text-emerald-400 font-semibold' : 'text-blue-400 font-semibold'}>
                                {h.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              Date: {h.serviceDate} · Mileage: {h.mileage.toLocaleString()} km
                              {h.workOrderNumber ? ` · ${h.workOrderNumber}` : ''}
                            </div>
                            <div className="text-[11px] text-slate-400">Parts: {h.partsUsed}</div>
                            {(h.nextServiceMileage || h.nextServiceDate) && (
                              <div className="text-[11px] text-blue-300">
                                Next maintenance: {h.nextServiceMileage ? `${h.nextServiceMileage.toLocaleString()} km` : ''}
                                {h.nextServiceMileage && h.nextServiceDate ? ' · ' : ''}
                                {h.nextServiceDate || ''}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="p-6 pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedVehicleDetails(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
