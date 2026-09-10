import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { InventoryItem } from '../../types';
import { Modal } from '../common/Modal';

interface InventoryFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemToEdit?: InventoryItem | null;
}

export const InventoryFormModal: React.FC<InventoryFormModalProps> = ({
  isOpen,
  onClose,
  itemToEdit
}) => {
  const { addInventoryItem, updateInventoryItem } = useApp();

  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Filters');
  const [stockQuantity, setStockQuantity] = useState<number>(10);
  const [minStockThreshold, setMinStockThreshold] = useState<number>(5);
  const [unitPrice, setUnitPrice] = useState<number>(25);
  const [costPrice, setCostPrice] = useState<number>(12);
  const [supplierName, setSupplierName] = useState('Bosch Automotive');
  const [binLocation, setBinLocation] = useState('Aisle A-01');

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setSku(itemToEdit.sku);
      setCategory(itemToEdit.category);
      setStockQuantity(itemToEdit.stockQuantity);
      setMinStockThreshold(itemToEdit.minStockThreshold);
      setUnitPrice(itemToEdit.unitPrice);
      setCostPrice(itemToEdit.costPrice);
      setSupplierName(itemToEdit.supplierName);
      setBinLocation(itemToEdit.binLocation);
    } else {
      setName('');
      setSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
      setCategory('Filters');
      setStockQuantity(15);
      setMinStockThreshold(5);
      setUnitPrice(35);
      setCostPrice(18);
      setSupplierName('Denso Auto Parts');
      setBinLocation('Aisle B-03');
    }
  }, [itemToEdit, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    if (itemToEdit) {
      updateInventoryItem(itemToEdit.id, {
        name,
        sku: sku.toUpperCase(),
        category,
        stockQuantity,
        minStockThreshold,
        unitPrice,
        costPrice,
        supplierName,
        binLocation
      });
    } else {
      addInventoryItem({
        name,
        sku: sku.toUpperCase(),
        category,
        stockQuantity,
        minStockThreshold,
        unitPrice,
        costPrice,
        supplierName,
        binLocation,
        lastRestockedDate: new Date().toISOString().split('T')[0]
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={itemToEdit ? 'Edit Spare Part SKU' : 'Register New Spare Part'}
      subtitle="Stock tracking, pricing markup, and warehouse bin allocation"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
            Part Name & Specification *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Synthetic Oil Filter 5W-30"
            className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              SKU / Part Code *
            </label>
            <input
              type="text"
              required
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              placeholder="e.g. FLT-TY-001"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            >
              <option value="Filters">Filters</option>
              <option value="Brakes">Brakes & Rotors</option>
              <option value="Fluids">Fluids & Oils</option>
              <option value="Ignition">Ignition & Plugs</option>
              <option value="Electrical">Electrical & Bulbs</option>
              <option value="Suspension">Suspension & Bushings</option>
              <option value="Belts">Belts & Hoses</option>
              <option value="Tires">Tires & Valves</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Current Stock Quantity *
            </label>
            <input
              type="number"
              required
              min="0"
              value={stockQuantity}
              onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Min Safety Threshold *
            </label>
            <input
              type="number"
              required
              min="1"
              value={minStockThreshold}
              onChange={(e) => setMinStockThreshold(parseInt(e.target.value) || 1)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Selling Retail Price ($) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.5"
              value={unitPrice}
              onChange={(e) => setUnitPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Purchase Cost Price ($) *
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.5"
              value={costPrice}
              onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Warehouse Bin Location
            </label>
            <input
              type="text"
              value={binLocation}
              onChange={(e) => setBinLocation(e.target.value)}
              placeholder="e.g. Aisle A-04, Shelf 2"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Supplier / Distributor
            </label>
            <input
              type="text"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              placeholder="e.g. Denso Global Distribution"
              className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
            />
          </div>
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
            {itemToEdit ? 'Update Part' : 'Add to Inventory'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
