import React, { useState } from 'react';
import {
  Package,
  Search,
  Plus,
  AlertTriangle,
  Download,
  Edit,
  Trash2,
  TrendingDown,
  Layers,
  MapPin,
  Truck,
  RotateCcw
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InventoryItem } from '../../types';

interface InventoryListProps {
  onOpenAddModal: () => void;
  onOpenEditModal: (item: InventoryItem) => void;
}

export const InventoryList: React.FC<InventoryListProps> = ({
  onOpenAddModal,
  onOpenEditModal
}) => {
  const {
    inventory,
    deleteInventoryItem,
    updateInventoryItem,
    openConfirmDialog,
    addToast,
    currentRole
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState<string>('ALL');

  const categories = Array.from(new Set(inventory.map((i) => i.category)));
  const lowStockItems = inventory.filter((i) => i.stockQuantity <= i.minStockThreshold);

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.binLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === 'ALL' || item.category === categoryFilter;

    let matchesStock = true;
    if (stockStatusFilter === 'LOW') {
      matchesStock = item.stockQuantity <= item.minStockThreshold;
    } else if (stockStatusFilter === 'NORMAL') {
      matchesStock = item.stockQuantity > item.minStockThreshold;
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  const handleDelete = (item: InventoryItem) => {
    openConfirmDialog({
      title: `Delete Item "${item.name}"?`,
      message: `Are you sure you want to remove SKU ${item.sku} from the garage parts catalog?`,
      variant: 'danger',
      confirmText: 'Delete Item',
      onConfirm: () => {
        deleteInventoryItem(item.id);
      }
    });
  };

  const handleRestock = (item: InventoryItem) => {
    const newQty = item.stockQuantity + 10;
    updateInventoryItem(item.id, { stockQuantity: newQty });
    addToast({
      type: 'success',
      title: 'Restock Logged',
      message: `Added +10 units to ${item.name}. Total stock: ${newQty}.`
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">Spare Parts & Inventory</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-mono font-bold">
              {inventory.length} SKUs
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Warehouse catalog and stock levels. Supplier contacts are on the Suppliers page.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => addToast({ type: 'info', title: 'Inventory Exported', message: 'Stock report exported as CSV.' })}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          {currentRole !== 'TECHNICIAN' && (
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Part</span>
          </button>
          )}
        </div>
      </div>

      {/* Low Stock Warning Banner */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">
                Low Inventory Warning: {lowStockItems.length} items below minimum safety threshold
              </p>
              <p className="text-amber-700 text-[11px]">
                {lowStockItems.map((i) => `${i.name} (${i.stockQuantity} left)`).join(' • ')}
              </p>
            </div>
          </div>
          <button
            onClick={() => setStockStatusFilter('LOW')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
          >
            Filter Low Stock
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by part name, SKU, bin location, or supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium bg-slate-50 rounded-xl border border-slate-200 focus:outline-hidden"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="LOW">Low Stock Only</option>
            <option value="NORMAL">Normal / Adequate</option>
          </select>
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Part Title & Category</th>
                <th className="py-3.5 px-4">SKU / Code</th>
                <th className="py-3.5 px-4">Stock Status</th>
                <th className="py-3.5 px-4">Unit Price</th>
                <th className="py-3.5 px-4">Cost Price</th>
                <th className="py-3.5 px-4">Bin Location</th>
                <th className="py-3.5 px-4">Supplier</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredInventory.map((item) => {
                const isLow = item.stockQuantity <= item.minStockThreshold;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold text-sm ${isLow ? 'text-rose-600' : 'text-slate-900'}`}>
                          {item.stockQuantity}
                        </span>
                        {isLow && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                            LOW (Min: {item.minStockThreshold})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-600">
                      ${item.unitPrice}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">
                      ${item.costPrice}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs px-2 py-1 bg-slate-100 text-slate-800 rounded-md border border-slate-200 flex items-center gap-1 w-max">
                        <MapPin className="w-3 h-3 text-blue-600" />
                        {item.binLocation}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {item.supplierName}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1">
                      <button
                        onClick={() => handleRestock(item)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Restock +10"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onOpenEditModal(item)}
                        className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit Item"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
