import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ServiceItem } from '../../types';
import { Modal } from '../common/Modal';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  serviceToEdit?: ServiceItem | null;
}

export const ServiceFormModal: React.FC<ServiceFormModalProps> = ({
  isOpen,
  onClose,
  serviceToEdit
}) => {
  const { addService, updateService } = useApp();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('Maintenance');
  const [description, setDescription] = useState('');
  const [basePrice, setBasePrice] = useState<number>(50);
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number>(1.0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (serviceToEdit) {
      setName(serviceToEdit.name);
      setCategory(serviceToEdit.category);
      setDescription(serviceToEdit.description);
      setBasePrice(serviceToEdit.basePrice);
      setEstimatedDurationHours(serviceToEdit.estimatedDurationHours);
      setIsActive(serviceToEdit.isActive);
    } else {
      setName('');
      setCategory('Maintenance');
      setDescription('');
      setBasePrice(60);
      setEstimatedDurationHours(1.5);
      setIsActive(true);
    }
  }, [serviceToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || basePrice <= 0) return;

    if (serviceToEdit) {
      updateService(serviceToEdit.id, {
        name,
        category,
        description,
        basePrice,
        estimatedDurationHours,
        isActive
      });
    } else {
      addService({
        name,
        category,
        description,
        basePrice,
        estimatedDurationHours,
        isActive
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={serviceToEdit ? 'Edit Service Package' : 'Create New Service Item'}
      subtitle="Define labor parameters, description, and base garage rate"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Service Title *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Synthetic Motor Oil & Filter Replacement"
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="Maintenance">Maintenance</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Brakes">Brake System</option>
              <option value="Engine">Engine & Powertrain</option>
              <option value="Transmission">Transmission</option>
              <option value="Electrical">Electrical & Batteries</option>
              <option value="Suspension">Suspension & Steering</option>
              <option value="Air Conditioning">A/C & Climate</option>
              <option value="Detailing">Detailing & Valeting</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Standard Labor Rate ($) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="5"
              value={basePrice}
              onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Estimated Duration (Hours)
          </label>
          <input
            type="number"
            step="0.25"
            min="0.25"
            max="40"
            value={estimatedDurationHours}
            onChange={(e) => setEstimatedDurationHours(parseFloat(e.target.value) || 1.0)}
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Service Description & Scope
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed checklist of items inspected, fluids drained, or tests executed..."
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="servActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
          />
          <label htmlFor="servActive" className="text-xs font-bold text-slate-700 cursor-pointer">
            Active in repair order creation & customer booking menu
          </label>
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
            {serviceToEdit ? 'Update Service' : 'Save to Catalog'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
