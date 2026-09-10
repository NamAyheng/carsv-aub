import React, { useState } from 'react';
import {
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  Check,
  Camera,
  FileText,
  Boxes,
  Car,
  ChevronRight,
  Sparkles,
  UploadCloud,
  Eye
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { ProgressBar } from '../common/ProgressBar';
import { Modal } from '../common/Modal';
import { RoleDeskBanner } from '../common/RoleDeskBanner';
import { RepairTask } from '../../types';

export const TechnicianDashboard: React.FC = () => {
  const {
    tasks,
    currentUser,
    updateTask,
    workOrders,
    viewWorkOrderDetail,
    addToast
  } = useApp();

  const [selectedTaskForModal, setSelectedTaskForModal] = useState<RepairTask | null>(null);
  const [photoUploadModalOpen, setPhotoUploadModalOpen] = useState(false);
  const [activeTaskPhotoTarget, setActiveTaskPhotoTarget] = useState<string | null>(null);

  // Filter tasks assigned to current technician or all if admin/unassigned
  const myTasks = tasks.filter(
    (t) => t.technicianId === currentUser.id || t.technicianName.toLowerCase().includes('dara')
  );

  const pendingTasks = myTasks.filter((t) => t.status === 'PENDING' || t.status === 'ASSIGNED');
  const activeTasks = myTasks.filter((t) => t.status === 'IN_PROGRESS');
  const completedTasks = myTasks.filter((t) => t.status === 'COMPLETED');
  const overdueTasks = myTasks.filter((t) => t.priority === 'URGENT' && t.status !== 'COMPLETED');

  const handleStartTask = (taskId: string) => {
    updateTask(taskId, { status: 'IN_PROGRESS', progressPercent: 20 });
    addToast({
      type: 'info',
      title: 'Task Started',
      message: 'Task is now marked In Progress on the workshop bay board.'
    });
  };

  const handlePauseTask = (taskId: string) => {
    updateTask(taskId, { status: 'PENDING' });
    addToast({
      type: 'warning',
      title: 'Task Paused',
      message: 'Task status shifted to pending/waiting.'
    });
  };

  const handleCompleteTask = (taskId: string) => {
    updateTask(taskId, { status: 'COMPLETED', progressPercent: 100 });
    addToast({
      type: 'success',
      title: 'Task Completed! 🎉',
      message: 'Great job! Work order and quality inspection have been notified.'
    });
  };

  const handleSliderChange = (taskId: string, val: number) => {
    updateTask(taskId, {
      progressPercent: val,
      status: val === 100 ? 'COMPLETED' : val > 0 ? 'IN_PROGRESS' : 'ASSIGNED'
    });
  };

  return (
    <div className="space-y-6">
      <RoleDeskBanner />
      {/* 1. TOP BENTO ROW: 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Assigned Tasks</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(pendingTasks.length).padStart(2, '0')}</div>
          <div className="text-xs text-blue-600 font-semibold">Ready for bay start</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>In Progress</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-800 my-2">{String(activeTasks.length).padStart(2, '0')}</div>
          <div className="text-xs text-gray-400">Active on workshop lifts</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Completed Today</span>
            <div className="p-1 rounded bg-green-50 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-green-600 my-2">{String(completedTasks.length).padStart(2, '0')}</div>
          <div className="text-xs text-green-600 font-semibold">100% QA pass rate</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center text-xs text-gray-500 uppercase font-semibold">
            <span>Urgent Priority</span>
            <div className="p-1 rounded bg-red-50 text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-red-600 my-2">{String(overdueTasks.length).padStart(2, '0')}</div>
          <div className="text-xs text-red-500 font-semibold">{overdueTasks.length > 0 ? 'Critical Attention' : 'All clear'}</div>
        </div>
      </div>

      {/* 2. TASK CARDS BENTO SECTION */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between border-b border-gray-50 pb-4 mb-5">
          <div>
            <h3 className="text-base font-bold text-gray-800">My Repair Task Worklist</h3>
            <p className="text-xs text-gray-400">Live progress reporting, OEM parts installation, and diagnostic logs</p>
          </div>
          <span className="text-xs font-mono font-bold bg-gray-100 text-gray-700 px-3 py-1 rounded-lg border border-gray-200">
            {myTasks.length} Assigned Jobs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myTasks.map((task) => (
            <div
              key={task.id}
              className={`rounded-xl border p-4 transition-all duration-200 ${
                task.status === 'IN_PROGRESS'
                  ? 'border-blue-300 bg-blue-50/20'
                  : task.status === 'COMPLETED'
                  ? 'border-green-300 bg-green-50/20'
                  : 'border-gray-100 bg-gray-50/40 hover:border-gray-200'
              }`}
            >
              {/* Task Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge priority={task.priority} size="sm" />
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mt-2">{task.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{task.description}</p>
                </div>
              </div>

              {/* Vehicle & Work Order Reference */}
              <div className="mt-3.5 p-2.5 rounded-lg bg-white border border-gray-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-gray-500" />
                  <span className="font-semibold text-gray-800">{task.vehicleInfo}</span>
                </div>
                <button
                  onClick={() => viewWorkOrderDetail(task.workOrderId)}
                  className="font-mono text-blue-600 hover:underline font-bold text-[11px] flex items-center gap-1"
                >
                  #{task.workOrderNumber} <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Progress Slider */}
              <div className="mt-3.5">
                <div className="flex justify-between items-center text-xs mb-1">
                  <span className="font-medium text-gray-500">Completion Progress</span>
                  <span className="font-mono font-bold text-gray-900">{task.progressPercent}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={task.progressPercent}
                  onChange={(e) => handleSliderChange(task.id, parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <ProgressBar progress={task.progressPercent} size="sm" color="auto" className="mt-1" />
              </div>

              {/* Parts & Labor meta */}
              <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>Est. Labor: <strong className="text-gray-800 font-mono">{task.estimatedHours} hrs</strong></span>
                <span>Due: <strong className="text-gray-800 font-mono">{task.dueDate}</strong></span>
              </div>

              {/* Action Buttons */}
              <div className="mt-3.5 pt-2.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveTaskPhotoTarget(task.id);
                      setPhotoUploadModalOpen(true);
                    }}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                    title="Upload Inspection Photo"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setSelectedTaskForModal(task)}
                    className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200"
                    title="Task Notes & Diagnostics"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                    >
                      <Play className="w-3.5 h-3.5" />
                      Start Task
                    </button>
                  )}

                  {task.status === 'IN_PROGRESS' && (
                    <>
                      <button
                        onClick={() => handlePauseTask(task.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-bold transition-colors"
                      >
                        <Pause className="w-3.5 h-3.5" />
                        Pause
                      </button>
                      <button
                        onClick={() => handleCompleteTask(task.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Complete
                      </button>
                    </>
                  )}

                  {task.status === 'COMPLETED' && (
                    <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Finished
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Task Details / Notes Modal */}
      {selectedTaskForModal && (
        <Modal
          isOpen={!!selectedTaskForModal}
          onClose={() => setSelectedTaskForModal(null)}
          title={`Task: ${selectedTaskForModal.title}`}
          subtitle={`Work Order #${selectedTaskForModal.workOrderNumber} • ${selectedTaskForModal.vehicleInfo}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Full Description & Diagnostic Checklist
              </label>
              <p className="mt-1 text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-200">
                {selectedTaskForModal.description}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                Technician Inspection Notes
              </label>
              <textarea
                rows={4}
                defaultValue={selectedTaskForModal.notes || 'Brake pads worn down to 2.5mm. Cleaned rotor hub, installed OEM ceramic pads, lubricated caliper slide pins. Test driven without vibration.'}
                className="mt-1.5 w-full p-3 text-xs bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                placeholder="Log your findings, torque specs, or additional repairs observed..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedTaskForModal(null);
                  addToast({
                    type: 'success',
                    title: 'Technician Notes Saved',
                    message: 'Inspection notes appended to the vehicle work order.'
                  });
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
              >
                Save Notes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Photo Upload Modal */}
      {photoUploadModalOpen && (
        <Modal
          isOpen={photoUploadModalOpen}
          onClose={() => setPhotoUploadModalOpen(false)}
          title="Upload Repair Photo Evidence"
          subtitle="Before & after visual inspection documentation"
        >
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors cursor-pointer bg-gray-50">
              <UploadCloud className="w-10 h-10 text-blue-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-800">Drag & drop repair photos here, or click to browse</p>
              <p className="text-[10px] text-gray-400 mt-1">Supports JPG, PNG, HEIC up to 15MB</p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPhotoUploadModalOpen(false)}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPhotoUploadModalOpen(false);
                  addToast({
                    type: 'success',
                    title: 'Photo Uploaded',
                    message: 'Damage & repair photo stored to vehicle history record.'
                  });
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg"
              >
                Attach to Task
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
