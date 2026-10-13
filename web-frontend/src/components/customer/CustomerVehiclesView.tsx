import React, { useState } from 'react';
import {
  Car,
  Plus,
  Wrench,
  Calendar,
  History,
  Fuel,
  Gauge,
  Sparkles,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronRight,
  Package,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer, demoCustomerId } from '../../utils/customerScope';
import { findDuplicateVehicle, isValidVehiclePlate, normalizeVehiclePlate } from '../../utils/garageLogic';
import { Vehicle } from '../../types';

function vehicleMake(brand: string) {
  return /\.(jpe?g|png|webp|gif)$/i.test(brand.trim()) ? '' : brand;
}

function vehicleLabel(brand: string, model: string) {
  return `${vehicleMake(brand)} ${model}`.replace(/\s+/g, ' ').trim();
}

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
  const {
    vehicles,
    workOrders,
    serviceHistory,
    currentUser,
    addVehicle,
    addToast,
    liveCustomer,
    persistCustomerVehicle,
    saveCustomerVehicle,
    removeCustomerVehicle,
    updateCustomerVehiclePhoto,
    showConfirmDialog
  } = useApp();

  const [selectedVehicleDetails, setSelectedVehicleDetails] = useState<Vehicle | null>(null);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoBusyId, setPhotoBusyId] = useState('');

  // Add Vehicle Form state
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [mileage, setMileage] = useState('');
  const [color, setColor] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [engineNumber, setEngineNumber] = useState('');
  const [fuelType, setFuelType] = useState<Vehicle['fuelType']>('Gasoline');
  const [transmission, setTransmission] = useState<Vehicle['transmission']>('Automatic');

  // Vehicles for the current customer (with fallback demo data if fresh customer)
  const myVehicles = (vehicles || []).filter((v) => belongsToCurrentCustomer(currentUser, v));

  const handleAddVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brand.trim() || !model.trim() || !licensePlate.trim() || !year.trim()) {
      addToast({
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please provide the make, model, year, and license plate.'
      });
      return;
    }

    const plate = normalizeVehiclePlate(licensePlate);
    const plateUnchanged = Boolean(editingVehicle && plate === normalizeVehiclePlate(editingVehicle.licensePlate));
    if (!plateUnchanged && !isValidVehiclePlate(plate)) {
      addToast({
        type: 'error',
        title: 'Invalid License Plate',
        message: 'Use 2, then 1 or 2 letters, a hyphen, and 4 digits. Example: 2BD-9988.'
      });
      return;
    }
    const vinValue = vin.trim();
    const duplicate = findDuplicateVehicle(vehicles || [], plate, vinValue, editingVehicle?.id);
    if (duplicate) {
      addToast({
        type: 'error',
        title: 'Duplicate Vehicle',
        message: `This plate or VIN is already registered (${duplicate.licensePlate}).`
      });
      return;
    }

    const payload = {
      customerId: demoCustomerId(currentUser),
      customerName: currentUser.name,
      brand: brand.trim(),
      model: model.trim(),
      year: parseInt(year, 10),
      licensePlate: plate,
      vin: vinValue,
      mileage: Number.isFinite(parseInt(mileage, 10)) ? parseInt(mileage, 10) : 0,
      fuelType,
      transmission,
      color,
      vehicleType: vehicleType.trim(),
      engineNumber: engineNumber.trim(),
      status: 'READY' as const,
      image: photoPreview,
      imageFile: photo,
    };
    const { imageFile: _imageFile, ...vehicleFields } = payload;
    setSavingVehicle(true);
    const saved = editingVehicle
      ? await saveCustomerVehicle(editingVehicle.id, payload)
      : liveCustomer
        ? await persistCustomerVehicle(payload)
        : addVehicle({
            ...vehicleFields,
            vin: vinValue || 'VIN' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          });
    setSavingVehicle(false);
    if (!saved) return;
    if (selectedVehicleDetails?.id === saved.id) setSelectedVehicleDetails(saved);
    closeVehicleForm();
  };

  const closeVehicleForm = () => {
    setShowAddVehicleModal(false);
    setEditingVehicle(null);
    setBrand('');
    setModel('');
    setYear('');
    setLicensePlate('');
    setVin('');
    setMileage('');
    setColor('');
    setVehicleType('');
    setEngineNumber('');
    setFuelType('Gasoline');
    setTransmission('Automatic');
    clearPhoto();
  };

  const openEditVehicle = (vehicle: Vehicle) => {
    clearPhoto();
    setEditingVehicle(vehicle);
    setBrand(vehicleMake(vehicle.brand) || vehicle.brand);
    setModel(vehicle.model);
    setYear(String(vehicle.year || ''));
    setLicensePlate(vehicle.licensePlate);
    setVin(vehicle.vin || '');
    setMileage(String(vehicle.mileage || 0));
    setColor(vehicle.color || '');
    setVehicleType(vehicle.vehicleType || '');
    setEngineNumber(vehicle.engineNumber || '');
    setFuelType(vehicle.fuelType || 'Gasoline');
    setTransmission(vehicle.transmission || 'Automatic');
    setShowAddVehicleModal(true);
  };

  const askRemoveVehicle = (vehicle: Vehicle) => {
    showConfirmDialog({
      title: 'Remove vehicle',
      message: `Remove ${vehicleLabel(vehicle.brand, vehicle.model)} (${vehicle.licensePlate}) from your garage?`,
      confirmText: 'Remove',
      variant: 'danger',
      onConfirm: () => {
        void removeCustomerVehicle(vehicle.id).then((removed) => {
          if (removed && selectedVehicleDetails?.id === vehicle.id) setSelectedVehicleDetails(null);
        });
      }
    });
  };

  const clearPhoto = () => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview('');
  };

  const choosePhoto = (file?: File) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    if (!file) {
      setPhoto(null);
      setPhotoPreview('');
      return;
    }
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const replaceVehiclePhoto = async (vehicle: Vehicle, file?: File) => {
    if (!file) return;
    if (!liveCustomer) {
      addToast({ type: 'error', title: 'Sign in required', message: 'Sign in to save a vehicle photo.' });
      return;
    }
    setPhotoBusyId(vehicle.id);
    const updated = await updateCustomerVehiclePhoto(vehicle.id, file);
    setPhotoBusyId('');
    if (updated && selectedVehicleDetails?.id === updated.id) setSelectedVehicleDetails(updated);
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
          onClick={() => {
            setEditingVehicle(null);
            setShowAddVehicleModal(true);
          }}
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
              wo.status === 'PENDING' ||
              wo.status === 'IN_PROGRESS' ||
              wo.status === 'ASSIGNED' ||
              wo.status === 'WAITING_APPROVAL' ||
              wo.status === 'WAITING_PARTS' ||
              wo.status === 'QUALITY_CHECK' ||
              wo.status === 'READY_FOR_PICKUP'
          );

          return (
            <div
              key={vehicle.id}
              className="bg-slate-900 rounded-3xl border border-slate-800/90 overflow-hidden hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-48 sm:h-56 bg-slate-950 overflow-hidden">
                  {vehicle.imageUrl || vehicle.image ? (
                    <img
                      src={vehicle.imageUrl || vehicle.image}
                      alt={`${vehicleMake(vehicle.brand)} ${vehicle.model}`.trim()}
                      className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/40" />

                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="px-2.5 py-1 rounded-lg text-xs font-black tracking-wider uppercase bg-blue-600/90 text-white shadow-md">
                      {vehicleMake(vehicle.brand) || vehicle.model}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-900/80 backdrop-blur-xs text-slate-200 border border-slate-700">
                      {vehicle.year}
                    </span>
                  </div>

                  <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedVehicleDetails(vehicle)}
                      className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-950/90 text-white border border-slate-700 cursor-pointer"
                    >
                      View Details
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditVehicle(vehicle)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-950/90 text-white border border-slate-700 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>

                  {activeWO && (
                    <div className="keep-on-dark absolute bottom-3 left-4 right-4 bg-slate-950 px-3 py-2 rounded-xl border border-white/15 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-white font-bold">
                          {activeWO.status === 'READY_FOR_PICKUP'
                            ? 'Ready for pickup'
                            : activeWO.status === 'PENDING'
                              ? 'Waiting · 0%'
                              : 'Active in workshop'}
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

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {vehicleLabel(vehicle.brand, vehicle.model)}
                      </h3>
                      <span className="mt-2 inline-flex px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-950 text-amber-400 border border-amber-500/30">
                        Plate: {vehicle.licensePlate}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      VIN: {vehicle.vin || 'Not recorded'}
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
              <div className="p-6 pt-0 grid grid-cols-4 gap-2.5">
                <button
                  onClick={() => setSelectedVehicleDetails(vehicle)}
                  className="h-10 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold transition-all border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <History className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                  <span>Service History</span>
                </button>

                {onBrowseParts && (
                  <button
                    onClick={onBrowseParts}
                    className="h-10 px-2 rounded-xl bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 text-[11px] font-bold transition-all border border-blue-500/30 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Package className="w-3.5 h-3.5 shrink-0" />
                    <span>Parts</span>
                  </button>
                )}

                <button
                  onClick={() => askRemoveVehicle(vehicle)}
                  className="h-10 px-2 rounded-xl bg-rose-600/10 hover:bg-rose-600/20 text-rose-300 text-[11px] font-bold transition-all border border-rose-500/30 flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Remove</span>
                </button>

                <button
                  onClick={() => onBookServiceForVehicle(vehicle.id)}
                  className="h-10 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold shadow-md shadow-blue-600/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                  <span>Book Service</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: ADD NEW VEHICLE */}
      {showAddVehicleModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Car className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-bold text-white">{editingVehicle ? 'Edit Vehicle' : 'Register New Vehicle'}</h3>
              </div>
              <button
                onClick={closeVehicleForm}
                className="p-1.5 text-slate-400 hover:text-white rounded-full bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddVehicleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Make / Brand</label>
                  <input
                    type="text"
                    required
                    list="vehicle-makes"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="e.g. Toyota"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <datalist id="vehicle-makes">
                    {['Toyota', 'Honda', 'Ford', 'Hyundai', 'Mazda', 'Kia', 'BMW', 'Audi', 'Lexus', 'Nissan', 'Mitsubishi', 'Suzuki'].map((make) => (
                      <option key={make} value={make} />
                    ))}
                  </datalist>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle type</label>
                  <input
                    type="text"
                    list="vehicle-types"
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    placeholder="Sedan, SUV, Pickup"
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                  <datalist id="vehicle-types">
                    {['Sedan', 'SUV', 'Pickup', 'Hatchback', 'Coupe', 'Van'].map((type) => (
                      <option key={type} value={type} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Engine number</label>
                  <input
                    type="text"
                    value={engineNumber}
                    onChange={(e) => setEngineNumber(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Vehicle photo</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(event) => choosePhoto(event.target.files?.[0])}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="mt-1 text-[10px] text-slate-500">JPG, PNG, WEBP, or GIF. 5 MB maximum.</p>
                {photoPreview || (editingVehicle && (editingVehicle.imageUrl || editingVehicle.image)) ? (
                  <img
                    src={photoPreview || editingVehicle?.imageUrl || editingVehicle?.image}
                    alt="Selected vehicle"
                    className="mt-2 h-28 w-full rounded-xl object-cover"
                  />
                ) : null}
              </div>

              <div className="pt-3 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeVehicleForm}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingVehicle}
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg disabled:opacity-60"
                >
                  {savingVehicle ? 'Saving...' : editingVehicle ? 'Save changes' : 'Save Vehicle'}
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
                    {vehicleLabel(selectedVehicleDetails.brand, selectedVehicleDetails.model)} ({selectedVehicleDetails.year})
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
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
                {selectedVehicleDetails.imageUrl || selectedVehicleDetails.image ? (
                  <img
                    src={selectedVehicleDetails.imageUrl || selectedVehicleDetails.image}
                    alt={vehicleLabel(selectedVehicleDetails.brand, selectedVehicleDetails.model)}
                    className="h-48 w-full object-cover"
                  />
                ) : (
                  <div className="h-32 w-full bg-gradient-to-br from-slate-800 to-slate-950" />
                )}
                <label className="flex items-center justify-between gap-3 px-4 py-3 text-xs text-slate-300 cursor-pointer">
                  <span>{photoBusyId === selectedVehicleDetails.id ? 'Saving photo...' : 'Upload or replace this vehicle photo'}</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="text-[10px] text-slate-400 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-[10px] file:font-semibold file:text-white"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      void replaceVehiclePhoto(selectedVehicleDetails, file);
                    }}
                  />
                </label>
              </div>
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
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-300">
                              <span className="inline-flex items-center gap-2">
                                {h.inspectorPhoto ? (
                                  <img src={h.inspectorPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : null}
                                Inspected by {h.inspectorName || 'Not recorded'}
                              </span>
                              <span className="inline-flex items-center gap-2">
                                {h.mechanicPhoto ? (
                                  <img src={h.mechanicPhoto} alt="" className="w-7 h-7 rounded-full object-cover" />
                                ) : null}
                                Repaired by {h.mechanicName || 'Not assigned'}
                              </span>
                              <span>
                                Status:{' '}
                                <span className={h.status === 'COMPLETED' ? 'text-emerald-400 font-semibold' : 'text-blue-400 font-semibold'}>
                                  {h.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                                </span>
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

            <div className="p-6 pt-3 border-t border-slate-800 flex justify-between gap-3">
              <button
                onClick={() => askRemoveVehicle(selectedVehicleDetails)}
                className="px-4 py-2 rounded-xl bg-rose-600/10 text-rose-300 text-xs font-bold border border-rose-500/30"
              >
                Remove
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => openEditVehicle(selectedVehicleDetails)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
                >
                  Edit
                </button>
                <button
                  onClick={() => setSelectedVehicleDetails(null)}
                  className="px-5 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
