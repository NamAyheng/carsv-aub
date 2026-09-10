import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Vehicle } from '../../types';
import { Modal } from '../common/Modal';

interface VehicleFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicleToEdit?: Vehicle | null;
}

export const VehicleFormModal: React.FC<VehicleFormModalProps> = ({
  isOpen,
  onClose,
  vehicleToEdit
}) => {
  const { addVehicle, updateVehicle, customers } = useApp();

  const [customerId, setCustomerId] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [licensePlate, setLicensePlate] = useState('');
  const [vin, setVin] = useState('');
  const [color, setColor] = useState('Silver');
  const [mileage, setMileage] = useState<number>(45000);
  const [fuelType, setFuelType] = useState('Gasoline');
  const [status, setStatus] = useState<'READY' | 'IN_PROGRESS' | 'INSPECTION'>('READY');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (vehicleToEdit) {
      setCustomerId(vehicleToEdit.customerId);
      setBrand(vehicleToEdit.brand);
      setModel(vehicleToEdit.model);
      setYear(vehicleToEdit.year);
      setLicensePlate(vehicleToEdit.licensePlate);
      setVin(vehicleToEdit.vin);
      setColor(vehicleToEdit.color);
      setMileage(vehicleToEdit.mileage);
      setFuelType(vehicleToEdit.fuelType);
      setStatus(vehicleToEdit.status as any);
      setNotes(vehicleToEdit.notes || '');
    } else {
      setCustomerId(customers[0]?.id || 'c1');
      setBrand('');
      setModel('');
      setYear(2022);
      setLicensePlate('');
      setVin('');
      setColor('Silver Metallic');
      setMileage(35000);
      setFuelType('Gasoline');
      setStatus('READY');
      setNotes('');
    }
  }, [vehicleToEdit, isOpen, customers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate || !brand || !model) return;

    const selectedCust = customers.find((c) => c.id === customerId);

    if (vehicleToEdit) {
      updateVehicle(vehicleToEdit.id, {
        customerId,
        customerName: selectedCust?.name || vehicleToEdit.customerName,
        brand,
        model,
        year,
        licensePlate: licensePlate.toUpperCase(),
        vin: vin.toUpperCase(),
        color,
        mileage,
        fuelType,
        status,
        notes
      });
    } else {
      addVehicle({
        customerId,
        customerName: selectedCust?.name || 'Customer',
        brand,
        model,
        year,
        licensePlate: licensePlate.toUpperCase(),
        vin: vin.toUpperCase() || `VIN-${Date.now()}`,
        color,
        mileage,
        fuelType: fuelType as Vehicle['fuelType'],
        transmission: 'Automatic',
        status: 'READY',
        notes,
        image: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=500&auto=format&fit=crop&q=80'
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={vehicleToEdit ? 'Edit Vehicle Information' : 'Register Vehicle to Fleet'}
      subtitle="Enter vehicle specifications, VIN, and owner assignment"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Registered Owner (Customer) *
          </label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Make / Brand *
            </label>
            <input
              type="text"
              required
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. Toyota"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Model *
            </label>
            <input
              type="text"
              required
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. Camry XSE"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Year *
            </label>
            <input
              type="number"
              required
              min="1990"
              max="2027"
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              License Plate *
            </label>
            <input
              type="text"
              required
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="e.g. PP-1234"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              VIN (17 characters)
            </label>
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="e.g. 4T1B11HK5JU123456"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Color
            </label>
            <input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="e.g. Pearl White"
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Mileage (km)
            </label>
            <input
              type="number"
              value={mileage}
              onChange={(e) => setMileage(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Fuel Type
            </label>
            <select
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="Gasoline">Gasoline / Petrol</option>
              <option value="Diesel">Diesel</option>
              <option value="Hybrid">Hybrid</option>
              <option value="EV">Electric (EV)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Status
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          >
            <option value="READY">Ready / Normal</option>
            <option value="IN_PROGRESS">In Repair (Bay)</option>
            <option value="INSPECTION">Inspection</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Vehicle Notes & Diagnostic Observations
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special modifications, existing scratches or wear..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            {vehicleToEdit ? 'Save Vehicle' : 'Register Vehicle'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
