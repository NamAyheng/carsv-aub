import React, { useState } from 'react';
import {
  ArrowLeft,
  Wrench,
  CheckCircle2,
  Clock,
  Car,
  User,
  Phone,
  Video,
  Camera,
  Plus,
  Trash2,
  Receipt,
  Printer,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  Play,
  Check,
  FileText
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { WorkOrder, WorkOrderStatus, PriorityLevel } from '../../types';

interface WorkOrderDetailViewProps {
  onBack: () => void;
  onOpenInvoice?: (invoiceId: string) => void;
}

export const WorkOrderDetailView: React.FC<WorkOrderDetailViewProps> = ({
  onBack,
  onOpenInvoice
}) => {
  const {
    workOrders,
    selectedWorkOrderId,
    updateWorkOrder,
    inventory,
    technicians,
    viewCustomerDetail,
    viewVehicleDetail,
    addToast
  } = useApp();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedInventoryPartId, setSelectedInventoryPartId] = useState(inventory[0]?.id || '');
  const [partQuantity, setPartQuantity] = useState<number>(1);
  const [isAddingPart, setIsAddingPart] = useState(false);
  const [techNoteInput, setTechNoteInput] = useState('');

  const workOrder = workOrders.find((w) => w.id === selectedWorkOrderId) || workOrders[0];

  if (!workOrder) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
        <p className="text-slate-600">Work order not found.</p>
        <button onClick={onBack} className="mt-3 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl">
          Return to Work Orders
        </button>
      </div>
    );
  }

  // Stepper definition
  const STEPS: WorkOrderStatus[] = [
    'PENDING',
    'ASSIGNED',
    'IN_PROGRESS',
    'QUALITY_CHECK',
    'COMPLETED',
    'DELIVERED'
  ];

  const currentStepIdx = STEPS.indexOf(workOrder.status);

  const handleStepChange = (newStatus: WorkOrderStatus) => {
    updateWorkOrder(workOrder.id, { status: newStatus });
    addToast({
      type: 'success',
      title: 'Status Updated',
      message: `Work Order #${workOrder.workOrderNumber} transitioned to ${newStatus}.`
    });
  };

  // Toggle task completion
  const handleToggleTask = (taskId: string) => {
    const updatedTasks = workOrder.tasks.map((t) => {
      if (t.id === taskId) {
        return {
          ...t,
          isCompleted: !t.isCompleted,
          status: (!t.isCompleted ? 'COMPLETED' : 'IN_PROGRESS') as any
        };
      }
      return t;
    });
    updateWorkOrder(workOrder.id, { tasks: updatedTasks });
  };

  // Add new task
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle.trim(),
      description: 'Standard repair procedure item',
      estimatedMinutes: 30,
      isCompleted: false,
      status: 'PENDING' as any
    };

    updateWorkOrder(workOrder.id, {
      tasks: [...workOrder.tasks, newTask]
    });
    setNewTaskTitle('');
  };

  // Delete task
  const handleDeleteTask = (taskId: string) => {
    const updated = workOrder.tasks.filter((t) => t.id !== taskId);
    updateWorkOrder(workOrder.id, { tasks: updated });
  };

  // Add Part Used
  const handleAddPart = (e: React.FormEvent) => {
    e.preventDefault();
    const part = inventory.find((p) => p.id === selectedInventoryPartId);
    if (!part) return;

    const newPart = {
      id: `pu-${Date.now()}`,
      partId: part.id,
      partName: part.name,
      partNumber: part.sku,
      quantity: partQuantity,
      unitPrice: part.unitPrice,
      totalPrice: part.unitPrice * partQuantity
    };

    const updatedParts = [...(workOrder.partsUsed || []), newPart];
    const partsTotal = updatedParts.reduce((acc, p) => acc + p.totalPrice, 0);
    const newEstCost = workOrder.laborCost + partsTotal;

    updateWorkOrder(workOrder.id, {
      partsUsed: updatedParts,
      partsCost: partsTotal,
      estimatedCost: newEstCost
    });

    setIsAddingPart(false);
    setPartQuantity(1);
    addToast({
      type: 'success',
      title: 'Part Added',
      message: `${partQuantity}x ${part.name} added to job.`
    });
  };

  // Remove Part
  const handleRemovePart = (partUsedId: string) => {
    const updatedParts = (workOrder.partsUsed || []).filter((p) => p.id !== partUsedId);
    const partsTotal = updatedParts.reduce((acc, p) => acc + p.totalPrice, 0);
    updateWorkOrder(workOrder.id, {
      partsUsed: updatedParts,
      partsCost: partsTotal,
      estimatedCost: workOrder.laborCost + partsTotal
    });
  };

  // Calculate task progress
  const completedTasks = workOrder.tasks.filter((t) => t.isCompleted).length;
  const totalTasks = workOrder.tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Work Orders</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 rounded-xl border border-slate-200 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Work Sheet</span>
          </button>
          <button
            onClick={() => addToast({ type: 'success', title: 'Invoice Synced', message: 'Invoice ready for customer checkout.' })}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Generate / View Invoice</span>
          </button>
        </div>
      </div>

      {/* Main WO Info Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-extrabold font-mono text-slate-900">
                #{workOrder.workOrderNumber}
              </span>
              <StatusBadge priority={workOrder.priority} size="sm" />
              <StatusBadge status={workOrder.status} size="sm" />
              <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                Service Bay #{workOrder.bayNumber || 2}
              </span>
            </div>
            <p className="text-sm font-bold text-slate-700 mt-1.5">{workOrder.reportedProblem}</p>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Created: {workOrder.createdAt} • Est. Completion: {workOrder.completedAt || 'Same day'}
            </p>
          </div>

          <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-6">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Labor Cost</span>
              <span className="text-sm font-mono font-bold text-slate-900">${workOrder.laborCost}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Parts Cost</span>
              <span className="text-sm font-mono font-bold text-slate-900">${workOrder.partsCost}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Est.</span>
              <span className="text-lg font-mono font-extrabold text-emerald-600">${workOrder.estimatedCost}</span>
            </div>
          </div>
        </div>

        {/* Status Stepper Progression */}
        <div className="pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-3">
            Repair Lifecycle Progress (Click to Advance)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;

              return (
                <button
                  key={step}
                  onClick={() => handleStepChange(step)}
                  className={`p-2.5 rounded-xl border text-left transition-all text-xs font-bold ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : isPast
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] opacity-75 font-mono">STEP 0{idx + 1}</span>
                    {isPast && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    {isCurrent && <Play className="w-3.5 h-3.5 text-white animate-pulse" />}
                  </div>
                  <span className="block truncate text-[11px]">{step.replace('_', ' ')}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Customer & Vehicle Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Customer Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              Customer Contact
            </span>
            <button
              onClick={() => viewCustomerDetail(workOrder.customerId)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              View Full Profile →
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              {workOrder.customerName.charAt(0)}
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{workOrder.customerName}</h4>
              <p className="text-xs text-slate-500 font-mono">{workOrder.customerPhone}</p>
            </div>
          </div>
        </div>

        {/* Vehicle Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-blue-600" />
              Vehicle Info
            </span>
            <button
              onClick={() => viewVehicleDetail(workOrder.vehicleId)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              Vehicle Dossier →
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-slate-100 rounded-lg font-mono font-bold text-xs border border-slate-200">
              {workOrder.vehiclePlate}
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">{workOrder.vehicleInfo}</h4>
              <p className="text-xs text-slate-500 font-mono">Assigned Tech: {workOrder.assignedTechnicianName}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Tasks Checklist & Parts/Camera */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Checklist & Technician Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Repair Checklist & Task Progress */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">Task Checklist & Procedures</h3>
                <p className="text-xs text-slate-500">
                  Completed {completedTasks} of {totalTasks} repair tasks ({progressPercent}%)
                </p>
              </div>
              <div className="w-36">
                <ProgressBar progress={progressPercent} color={progressPercent === 100 ? 'emerald' : 'blue'} showPercent />
              </div>
            </div>

            {/* Task Item List */}
            <div className="space-y-2">
              {workOrder.tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                    task.isCompleted
                      ? 'bg-emerald-50/50 border-emerald-200 text-slate-600'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                >
                  <label className="flex items-center gap-3 cursor-pointer flex-1">
                    <input
                      type="checkbox"
                      checked={task.isCompleted}
                      onChange={() => handleToggleTask(task.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <span className={`text-xs font-bold block ${task.isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {task.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Est: {task.estimatedMinutes} mins • Status: {task.status}
                      </span>
                    </div>
                  </label>

                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    title="Remove Task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Task Input Form */}
            <form onSubmit={handleAddTask} className="flex gap-2 pt-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="Add new step or inspection item (e.g. Bleed brake lines)..."
                className="flex-1 px-3.5 py-2 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Step</span>
              </button>
            </form>
          </div>

          {/* Parts Used Breakdown */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Replacement Parts & Materials Used</h3>
                <p className="text-xs text-slate-500">Drawn from shop inventory and added to customer invoice</p>
              </div>
              <button
                onClick={() => setIsAddingPart(!isAddingPart)}
                className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Part</span>
              </button>
            </div>

            {/* Quick Add Part Row */}
            {isAddingPart && (
              <form onSubmit={handleAddPart} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Select Component from Stock</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <select
                      value={selectedInventoryPartId}
                      onChange={(e) => setSelectedInventoryPartId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl"
                    >
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.name} ({inv.sku}) — ${inv.unitPrice} [Stock: {inv.stockQuantity}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={partQuantity}
                      onChange={(e) => setPartQuantity(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-mono"
                      placeholder="Qty"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingPart(false)}
                    className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
                  >
                    Confirm Add
                  </button>
                </div>
              </form>
            )}

            {/* Parts Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-y border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Part Description</th>
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Unit Price</th>
                    <th className="py-2.5 px-3">Total</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {(workOrder.partsUsed || []).map((part) => (
                    <tr key={part.id}>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{part.partName}</td>
                      <td className="py-2.5 px-3 font-mono text-[10px] text-slate-400">{part.partNumber}</td>
                      <td className="py-2.5 px-3 font-mono">{part.quantity}</td>
                      <td className="py-2.5 px-3 font-mono">${part.unitPrice}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">${part.totalPrice}</td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => handleRemovePart(part.id)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Photo Evidence & Work Inspection Photos */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Work Evidence & Quality Photos</h3>
                <p className="text-xs text-slate-500">Visual proof before, during, and after repair completion</p>
              </div>
              <button
                onClick={() => addToast({ type: 'info', title: 'Camera Triggered', message: 'Photo attached to job dossier.' })}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
              >
                <Camera className="w-3.5 h-3.5 text-slate-600" />
                <span>Take Photo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Initial Inspection</span>
                <img
                  src="https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=400"
                  alt="Before repair"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">During Replacement</span>
                <img
                  src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=400"
                  alt="In progress"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Final Quality Check</span>
                <img
                  src="https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=400"
                  alt="Finished work"
                  className="w-full h-32 object-cover rounded-xl border border-slate-200"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Bay Live Camera & Technician Notes */}
        <div className="space-y-6">
          {/* Live Bay CCTV Feed Simulation */}
          <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase">
                  CCTV LIVE • BAY #{workOrder.bayNumber || 2}
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">1080P • 30 FPS</span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black aspect-video border border-slate-800">
              <img
                src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=600"
                alt="Bay Camera"
                className="w-full h-full object-cover opacity-85"
              />
              <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-emerald-400">
                REC ● {new Date().toLocaleTimeString()}
              </div>
              <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] font-mono text-white">
                CAM-0{workOrder.bayNumber || 2} (OVERHEAD)
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
              <span>Technician on bay: <strong className="text-white">{workOrder.assignedTechnicianName}</strong></span>
              <button
                onClick={() => addToast({ type: 'info', title: 'CCTV Stream', message: 'Full screen surveillance expanded.' })}
                className="text-blue-400 hover:text-blue-300 font-bold"
              >
                Expand Stream
              </button>
            </div>
          </div>

          {/* Technician Diagnostic Notes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-900">Lead Technician Log</h4>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                {workOrder.notes || 'Completed multi-point computer scan. Error codes P0300 cleared after spark plug replacement.'}
              </p>
              <span className="text-[10px] text-slate-400 font-mono block">
                Logged by {workOrder.assignedTechnicianName}
              </span>
            </div>
          </div>

          {/* Billing & Invoice Quick Panel */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
            <h4 className="text-sm font-bold text-slate-900">Job Cost Summary</h4>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Labor Subtotal</span>
                <span className="font-mono font-bold text-slate-800">${workOrder.laborCost}</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-500">Parts Subtotal</span>
                <span className="font-mono font-bold text-slate-800">${workOrder.partsCost}</span>
              </div>
              <div className="py-2 flex justify-between text-slate-500">
                <span>Tax & Environmental Fee (10%)</span>
                <span className="font-mono">${Math.round((workOrder.laborCost + workOrder.partsCost) * 0.1)}</span>
              </div>
              <div className="py-3 flex justify-between text-base font-extrabold text-slate-900">
                <span>Final Estimate</span>
                <span className="font-mono text-emerald-600">
                  ${Math.round((workOrder.laborCost + workOrder.partsCost) * 1.1)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
