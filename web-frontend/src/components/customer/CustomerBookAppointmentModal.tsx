import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar as CalendarIcon,
  Clock,
  Car,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Plus,
  Package,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { belongsToCurrentCustomer, demoCustomerId } from '../../utils/customerScope';
import { findDuplicateVehicle, isValidVehiclePlate, normalizeVehiclePlate } from '../../utils/garageLogic';
import { Appointment } from '../../types';
import { ThemedDatePicker } from '../common/ThemedDatePicker';
import { createCustomerPartRequest } from '../../api/garage';

interface CustomerBookAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedServiceId?: string;
  onSuccessViewAppointments?: () => void;
}

export const CustomerBookAppointmentModal: React.FC<CustomerBookAppointmentModalProps> = ({
  isOpen,
  onClose,
  preselectedServiceId,
  onSuccessViewAppointments
}) => {
  const {
    vehicles,
    services,
    inventory,
    currentUser,
    addAppointment,
    addVehicle,
    addToast,
    theme,
    appointments,
    liveCustomer,
    persistCustomerVehicle,
    persistCustomerBooking,
  } = useApp();
  const isDark = theme === 'dark';

  // Wizard Step: 1 -> 2 -> 3 -> 4 -> 5 -> 6 (Success)
  const [step, setStep] = useState<number>(1);

  // Form states
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedServiceId, setSelectedServiceId] = useState<string>(preselectedServiceId || '');
  const [appointmentDate, setAppointmentDate] = useState<string>(
    new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
  );
  const [appointmentTime, setAppointmentTime] = useState<string>('09:30');
  const [problemDescription, setProblemDescription] = useState<string>('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [additionalNotes, setAdditionalNotes] = useState<string>('');
  const [draftPartIds, setDraftPartIds] = useState<string[]>([]);
  const [partQuery, setPartQuery] = useState('');
  const [showPartsPicker, setShowPartsPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Quick New Vehicle Inline Modal/State
  const [showAddVehicleInline, setShowAddVehicleInline] = useState(false);
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2022');
  const [newPlate, setNewPlate] = useState('');
  const [newPhoto, setNewPhoto] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState('');

  // Filter vehicles belonging to the customer
  const customerVehicles = (vehicles || []).filter((v) => belongsToCurrentCustomer(currentUser, v));

  useEffect(() => {
    if (customerVehicles.length > 0 && !selectedVehicleId) {
      setSelectedVehicleId(customerVehicles[0].id);
    }
  }, [customerVehicles, selectedVehicleId]);

  useEffect(() => {
    if (preselectedServiceId) {
      setSelectedServiceId(preselectedServiceId);
      setStep(1); // Keep on step 1 so they verify vehicle
    }
  }, [preselectedServiceId]);

  if (!isOpen) return null;

  const timeSlots = [
    '08:00', '08:45', '09:30', '10:15', '11:00',
    '13:30', '14:15', '15:00', '15:45', '16:30'
  ];

  const slotTaken = (time: string) =>
    (appointments || []).some(
      (item) =>
        item.vehicleId === selectedVehicleId &&
        item.date === appointmentDate &&
        (item.time || '').slice(0, 5) === time &&
        item.status !== 'CANCELLED'
    );

  const selectedVehicle = (vehicles || []).find((v) => v.id === selectedVehicleId) || customerVehicles[0];
  const selectedService = (services || []).find((s) => s.id === selectedServiceId) || (services || [])[0];

  const handleCreateVehicleInline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModel || !newPlate) {
      addToast({ type: 'error', title: 'Missing Information', message: 'Please enter model and license plate.' });
      return;
    }
    const plate = normalizeVehiclePlate(newPlate);
    if (!isValidVehiclePlate(plate)) {
      addToast({
        type: 'error',
        title: 'Invalid License Plate',
        message: 'Use 2, then 1 or 2 letters, a hyphen, and 4 digits. Example: 2BD-9988.'
      });
      return;
    }
    if (findDuplicateVehicle(vehicles || [], plate, '')) {
      addToast({ type: 'error', title: 'Duplicate Vehicle', message: 'This license plate is already registered.' });
      return;
    }
    const payload = {
      customerId: demoCustomerId(currentUser),
      customerName: currentUser.name,
      brand: newBrand,
      model: newModel,
      year: parseInt(newYear) || 2022,
      licensePlate: plate,
      vin: '',
      mileage: 35000,
      fuelType: 'Gasoline' as const,
      transmission: 'Automatic' as const,
      color: 'Metallic Silver',
      status: 'READY' as const,
      image: newPhotoPreview,
      imageFile: newPhoto,
    };
    const { imageFile: _imageFile, ...vehicleFields } = payload;
    const created = liveCustomer
      ? await persistCustomerVehicle(payload)
      : addVehicle({ ...vehicleFields, vin: 'VIN' + Math.random().toString(36).substring(2, 9).toUpperCase() });
    if (!created) return;
    setSelectedVehicleId(created.id);
    setShowAddVehicleInline(false);
    if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
    setNewPhoto(null);
    setNewPhotoPreview('');
  };

  const draftParts = (inventory || []).filter((part) => draftPartIds.includes(part.id));
  const shelfParts = (inventory || [])
    .filter((part) => part.stockQuantity > 0 && !draftPartIds.includes(part.id))
    .filter((part) => {
      const query = partQuery.trim().toLowerCase();
      if (!query) return true;
      return part.name.toLowerCase().includes(query) || part.sku.toLowerCase().includes(query);
    });
  const partsTotal = draftParts.reduce((sum, part) => sum + (part.unitPrice || 0), 0);
  const bookingTotal = (selectedService?.basePrice || 0) + partsTotal;

  const handleConfirmAppointment = async () => {
    if (!selectedVehicleId || !selectedServiceId) {
      addToast({ type: 'error', title: 'Incomplete Booking', message: 'Please select both a vehicle and a service.' });
      return;
    }

    const newAppointment: Omit<Appointment, 'id'> = {
      customerId: demoCustomerId(currentUser),
      customerName: currentUser.name,
      customerPhone: currentUser.phone || '',
      vehicleId: selectedVehicle?.id || 'veh-1',
      vehicleInfo: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.licensePlate})` : '',
      serviceName: selectedService?.name || 'Full Vehicle Service',
      serviceId: selectedService?.id || 'srv-1',
      date: appointmentDate,
      time: appointmentTime,
      problemDescription: problemDescription,
      priority,
      status: 'SCHEDULED',
      estimatedDurationHours: selectedService?.estimatedDurationHours || 1.5,
      notes: additionalNotes
    };

    if (slotTaken(appointmentTime)) {
      addToast({
        type: 'error',
        title: 'Time already booked',
        message: 'That vehicle already has a booking at this time. Choose another slot.',
      });
      return;
    }

    if (liveCustomer) {
      setSubmitting(true);
      try {
        const saved = await persistCustomerBooking(newAppointment);
        if (!saved) return;
        for (const part of draftParts) {
          await createCustomerPartRequest({
            sparePartId: part.id,
            vehicleId: saved.vehicleId,
            bookingId: saved.id,
            fulfillment: 'INSTALL_IN_WORKSHOP',
          });
        }
        if (draftParts.length > 0) {
          addToast({
            type: 'success',
            title: 'Parts attached to this booking',
            message: `${draftParts.length} workshop part${draftParts.length === 1 ? '' : 's'} will show on the visit quote. Stock stays on the shelf until the garage issues them.`,
          });
        }
        setDraftPartIds([]);
        setPartQuery('');
        setShowPartsPicker(false);
        setStep(6);
      } catch (error) {
        addToast({
          type: 'error',
          title: 'Parts were not attached',
          message: error instanceof Error ? error.message : 'The booking was created, but a part request failed.',
        });
        setStep(6);
      } finally {
        setSubmitting(false);
      }
      return;
    }

    addAppointment(newAppointment);
    setStep(6); // Success confirmation
  };

  const handleResetAndClose = () => {
    setStep(1);
    setDraftPartIds([]);
    setPartQuery('');
    setShowPartsPicker(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
              <CalendarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Book Automotive Service</h3>
              <p className="text-xs text-slate-400">Step {Math.min(step, 5)} of 5 — CarSV Certified Care</p>
            </div>
          </div>
          <button
            onClick={handleResetAndClose}
            className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        {step <= 5 && (
          <div className="w-full bg-slate-950 h-1.5 overflow-hidden">
            <div
              className="bg-blue-600 h-full transition-all duration-300"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: SELECT VEHICLE */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-base font-bold text-white">Step 1: Select Your Vehicle</h4>
                  <p className="text-xs text-slate-400">Which car needs service or diagnostic repair?</p>
                </div>
                <button
                  onClick={() => setShowAddVehicleInline(!showAddVehicleInline)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-semibold hover:bg-blue-600 hover:text-white transition-all flex items-center gap-1 border border-blue-500/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add New Car</span>
                </button>
              </div>

              {/* Inline Add Vehicle Subform */}
              {showAddVehicleInline && (
                <div className="bg-slate-950 p-4 rounded-2xl border border-blue-500/40 space-y-3">
                  <h5 className="text-xs font-bold text-blue-400 uppercase tracking-wide">Quick Add Vehicle</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[10px] text-slate-400">Brand</label>
                      <select
                        value={newBrand}
                        onChange={(e) => setNewBrand(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                      >
                        <option value="Toyota">Toyota</option>
                        <option value="Lexus">Lexus</option>
                        <option value="Honda">Honda</option>
                        <option value="Ford">Ford</option>
                        <option value="Hyundai">Hyundai</option>
                        <option value="Mazda">Mazda</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Model</label>
                      <input
                        type="text"
                        value={newModel}
                        onChange={(e) => setNewModel(e.target.value)}
                        placeholder="e.g. Camry"
                        className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Year</label>
                      <input
                        type="number"
                        value={newYear}
                        onChange={(e) => setNewYear(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400">Plate Number</label>
                      <input
                        type="text"
                        value={newPlate}
                        onChange={(e) => setNewPlate(e.target.value)}
                        placeholder="e.g. 2BD-9988"
                        className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400">Vehicle photo</label>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (newPhotoPreview) URL.revokeObjectURL(newPhotoPreview);
                        setNewPhoto(file || null);
                        setNewPhotoPreview(file ? URL.createObjectURL(file) : '');
                      }}
                      className="w-full text-xs p-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 file:mr-2 file:rounded-md file:border-0 file:bg-blue-600 file:px-2 file:py-1 file:text-[10px] file:text-white"
                    />
                    {newPhotoPreview ? (
                      <img src={newPhotoPreview} alt="Selected vehicle" className="mt-2 h-20 w-full rounded-lg object-cover" />
                    ) : null}
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddVehicleInline(false)}
                      className="px-3 py-1 text-xs text-slate-400"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateVehicleInline}
                      className="px-4 py-1 rounded bg-blue-600 text-white text-xs font-bold"
                    >
                      Save Vehicle
                    </button>
                  </div>
                </div>
              )}

              {/* Vehicle Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {customerVehicles.map((v) => (
                  <div
                    key={v.id}
                    onClick={() => setSelectedVehicleId(v.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center gap-3.5 ${
                      selectedVehicleId === v.id
                        ? 'bg-blue-600/15 border-blue-500 shadow-lg shadow-blue-900/20 ring-1 ring-blue-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {v.imageUrl || v.image ? (
                      <img
                        src={v.imageUrl || v.image}
                        alt={v.model}
                        className="w-16 h-12 object-cover rounded-lg border border-slate-800 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-12 rounded-lg border border-slate-800 shrink-0 bg-slate-900" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">
                        {v.brand} {v.model}
                      </div>
                      <div className="text-xs text-slate-400 font-mono">
                        Plate: {v.licensePlate} • {v.year}
                      </div>
                    </div>
                    {selectedVehicleId === v.id && (
                      <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: SELECT SERVICE */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-white">Step 2: Select Service</h4>
                <p className="text-xs text-slate-400">Choose from our certified automotive maintenance & repair catalog.</p>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {(services || []).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => setSelectedServiceId(s.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      selectedServiceId === s.id
                        ? 'bg-blue-600/15 border-blue-500 ring-1 ring-blue-500'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{s.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">
                          {s.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1">{s.description}</p>
                    </div>

                    <div className="text-right shrink-0 ml-4">
                      <div className="text-base font-black text-white">${s.basePrice.toFixed(2)}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ~{s.estimatedDurationHours ? s.estimatedDurationHours * 60 : 45} mins
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: SELECT DATE */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-white">Step 3: Select Appointment Date</h4>
                <p className="text-xs text-slate-400">Pick a convenient day for your vehicle intake.</p>
              </div>

              <div
                className={`p-5 rounded-2xl border space-y-4 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <label className={`block text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  Preferred Date (Monday – Saturday)
                </label>
                <ThemedDatePicker
                  value={appointmentDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={setAppointmentDate}
                  disableSunday
                />

                <div
                  className={`p-3 rounded-xl border text-sm leading-relaxed flex items-start gap-2.5 ${
                    isDark
                      ? 'bg-blue-950/50 border-blue-800 text-slate-200'
                      : 'bg-blue-50 border-blue-200 text-slate-700'
                  }`}
                >
                  <Sparkles className={`w-4 h-4 shrink-0 mt-0.5 ${isDark ? 'text-blue-300' : 'text-blue-600'}`} />
                  <span>
                    Early morning slots (08:00 – 10:00 AM) include complimentary express intake inspection and vehicle wash.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: SELECT TIME */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-white">Step 4: Select Arrival Time Slot</h4>
                <p className="text-xs text-slate-400">
                  Available times for {appointmentDate} with dedicated bay allocation.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {timeSlots.map((time) => {
                  const taken = slotTaken(time);
                  return (
                  <button
                    key={time}
                    type="button"
                    disabled={taken}
                    onClick={() => setAppointmentTime(time)}
                    className={`py-3 px-2 rounded-xl text-center text-xs font-bold transition-all border ${
                      taken
                        ? 'bg-slate-900 text-slate-600 border-slate-800 cursor-not-allowed'
                        : appointmentTime === time
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-600/30'
                        : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 mx-auto mb-1 opacity-70" />
                    <span>{taken ? 'Booked' : time}</span>
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 5: DESCRIBE PROBLEM & CONFIRM */}
          {step === 5 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-base font-bold text-white">Step 5: Symptoms & Problem Description</h4>
                <p className="text-xs text-slate-400">Help our technicians prepare the right diagnostic scanners and tools.</p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    What symptoms are you experiencing?
                  </label>
                  <textarea
                    rows={3}
                    value={problemDescription}
                    onChange={(e) => setProblemDescription(e.target.value)}
                    placeholder="e.g. Squeaking noise when braking at low speed, or dashboard check engine indicator..."
                    className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority Level</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    >
                      <option value="LOW">Routine (Low)</option>
                      <option value="MEDIUM">Standard (Medium)</option>
                      <option value="HIGH">Urgent Attention (High)</option>
                      <option value="URGENT">Critical Safety Hazard</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Additional Notes (Optional)</label>
                    <input
                      type="text"
                      value={additionalNotes}
                      onChange={(e) => setAdditionalNotes(e.target.value)}
                      placeholder="e.g. Need vehicle back before 4:00 PM"
                      className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  {!showPartsPicker && draftParts.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowPartsPicker(true)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-dashed border-slate-700 bg-slate-950 text-xs font-semibold text-slate-400 hover:text-slate-200 hover:border-slate-500"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add workshop parts (optional)
                    </button>
                  ) : (
                    <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                          <Package className="w-3.5 h-3.5 text-blue-400" />
                          Workshop parts for this booking
                        </div>
                        {draftParts.length === 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setShowPartsPicker(false);
                              setPartQuery('');
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-300"
                          >
                            Hide
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Optional. You can remove these before you submit. After submit, changes wait until the quote.
                      </p>
                      {draftParts.length > 0 && (
                        <ul className="space-y-1.5">
                          {draftParts.map((part) => (
                            <li
                              key={part.id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200"
                            >
                              <span>
                                {part.name}
                                <span className="block font-mono text-[10px] text-slate-500">{part.sku}</span>
                              </span>
                              <span className="flex items-center gap-2">
                                <span className="font-mono text-slate-400">${part.unitPrice.toFixed(2)}</span>
                                <button
                                  type="button"
                                  onClick={() => setDraftPartIds((ids) => ids.filter((id) => id !== part.id))}
                                  className="text-[10px] font-bold text-rose-300"
                                >
                                  Remove
                                </button>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {(showPartsPicker || draftParts.length > 0) && (
                        <>
                          <input
                            value={partQuery}
                            onChange={(event) => setPartQuery(event.target.value)}
                            placeholder="Search shelf part"
                            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white"
                          />
                          <ul className="max-h-56 overflow-y-auto space-y-1">
                            {shelfParts.map((part) => (
                              <li key={part.id}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDraftPartIds((ids) => [...ids, part.id]);
                                    setShowPartsPicker(true);
                                  }}
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-xs text-slate-200 hover:bg-blue-50 hover:text-slate-900"
                                >
                                  <span>{part.name}</span>
                                  <span className="font-mono text-slate-500">
                                    {part.sku} · ${part.unitPrice.toFixed(2)}
                                  </span>
                                </button>
                              </li>
                            ))}
                            {shelfParts.length === 0 && (
                              <li className="text-[11px] text-slate-500">No matching part in stock.</li>
                            )}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Summary Box */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-xs">
                  <div className="font-bold text-white flex items-center justify-between">
                    <span>Booking Summary</span>
                    <span className="text-blue-400 font-mono">${bookingTotal.toFixed(2)}</span>
                  </div>
                  <div className="text-slate-300">
                    Vehicle: <strong className="text-white">{selectedVehicle?.brand} {selectedVehicle?.model} ({selectedVehicle?.licensePlate})</strong>
                  </div>
                  <div className="text-slate-300">
                    Service: <strong className="text-white">{selectedService?.name}</strong>
                  </div>
                  {draftParts.length > 0 && (
                    <div className="text-slate-300">
                      Parts: <strong className="text-white">{draftParts.length} workshop install</strong>
                    </div>
                  )}
                  <div className="text-slate-300">
                    Schedule: <strong className="text-white">{appointmentDate} at {appointmentTime}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: CONFIRMATION SUCCESS */}
          {step === 6 && (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-2xl font-black text-white tracking-tight">Appointment successfully booked.</h4>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  Your appointment record has been generated and dispatched to our workshop intake board.
                </p>
              </div>

              <div className="bg-slate-950 max-w-md mx-auto p-4 rounded-2xl border border-slate-800 text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time:</span>
                  <span className="text-white font-bold">{appointmentDate} at {appointmentTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle:</span>
                  <span className="text-white font-bold">{selectedVehicle?.brand} {selectedVehicle?.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Service:</span>
                  <span className="text-white font-bold">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Status:</span>
                  <span className="text-emerald-400 font-bold">Pending confirmation</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
                <button
                  onClick={() => {
                    handleResetAndClose();
                    if (onSuccessViewAppointments) onSuccessViewAppointments();
                  }}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg transition-all"
                >
                  View in My Appointments
                </button>
                <button
                  onClick={handleResetAndClose}
                  className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons (Steps 1 - 5) */}
        {step <= 5 && (
          <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleResetAndClose}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => void handleConfirmAppointment()}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{submitting ? 'Saving…' : 'Confirm Appointment'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
