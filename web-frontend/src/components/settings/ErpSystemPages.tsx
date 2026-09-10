import React, { useState } from 'react';
import { Bell, FileText, History, ShieldCheck, Users, CreditCard, CheckSquare, Truck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { RepairTask, RolePermissions, UserRole } from '../../types';
import { ROLE_LABEL } from '../../utils/roles';
import { StatusBadge } from '../common/StatusBadge';

const MODULES = Object.keys({
  Customers: 1,
  Vehicles: 1,
  Appointments: 1,
  WorkOrders: 1,
  Tasks: 1,
  Inventory: 1,
  Reports: 1,
  Users: 1,
  CCTV: 1,
  Settings: 1
} satisfies Record<keyof RolePermissions, 1>) as (keyof RolePermissions)[];

const STAFF_ROLES: UserRole[] = ['ADMIN', 'MANAGER', 'STAFF', 'TECHNICIAN'];

export const UsersView: React.FC = () => {
  const { users } = useApp();
  const staff = users.filter((u) => u.role !== 'CUSTOMER');
  return (
    <PageShell
      icon={Users}
      title="User management"
      subtitle="Administrator only. Staff accounts, roles, and login status."
    >
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
          <tr>
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Email</th>
            <th className="py-3 px-4">Job</th>
            <th className="py-3 px-4">Status</th>
            <th className="py-3 px-4">Last login</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {staff.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50">
              <td className="py-3 px-4 font-semibold text-slate-900">{u.name}</td>
              <td className="py-3 px-4 text-slate-600">{u.email}</td>
              <td className="py-3 px-4">
                <span className="font-semibold text-blue-700">{ROLE_LABEL[u.role]}</span>
              </td>
              <td className="py-3 px-4">
                <StatusBadge status={u.status} size="sm" />
              </td>
              <td className="py-3 px-4 text-slate-500">{u.lastLogin}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
};

export const PermissionsView: React.FC = () => {
  const { permissions, updateRolePermission } = useApp();
  const [role, setRole] = useState<UserRole>('STAFF');
  const matrix = permissions[role];

  return (
    <PageShell
      icon={ShieldCheck}
      title="Roles & permissions"
      subtitle="Administrator only. Each job can only use the modules listed here."
    >
      <div className="p-4 border-b border-slate-100 flex flex-wrap gap-2">
        {STAFF_ROLES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
              role === r ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {ROLE_LABEL[r]}
          </button>
        ))}
      </div>
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
          <tr>
            <th className="py-3 px-4">Module</th>
            {(['view', 'create', 'edit', 'delete'] as const).map((a) => (
              <th key={a} className="py-3 px-4 capitalize">
                {a}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {MODULES.map((mod) => (
            <tr key={mod}>
              <td className="py-3 px-4 font-semibold text-slate-800">{mod}</td>
              {(['view', 'create', 'edit', 'delete'] as const).map((action) => (
                <td key={action} className="py-3 px-4">
                  <input
                    type="checkbox"
                    checked={matrix[mod][action]}
                    onChange={(e) => updateRolePermission(role, mod, action, e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
};

export const ActivityLogsView: React.FC = () => {
  const { activityLogs } = useApp();
  return (
    <PageShell
      icon={History}
      title="Activity logs"
      subtitle="Manager and administrator. Who created, edited, or updated garage records."
    >
      <div className="divide-y divide-slate-100">
        {activityLogs.slice(0, 40).map((log) => (
          <div key={log.id} className="px-5 py-3 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-900">{log.action.replace(/_/g, ' ')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{log.description}</p>
              <p className="text-[11px] text-slate-400 mt-1">
                {log.userName} · {log.module}
              </p>
            </div>
            <span className="text-[11px] text-slate-400 shrink-0">{log.timestamp}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
};

export const StaffNotificationsView: React.FC = () => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, setCurrentView } = useApp();
  const desk = notifications.filter((n) => n.audience !== 'CUSTOMER');

  return (
    <PageShell
      icon={Bell}
      title="Staff notifications"
      subtitle="Workshop alerts for this ERP. Customer portal notices are not shown here."
    >
      <div className="px-5 py-3 border-b border-slate-100 flex justify-end">
        <button type="button" onClick={markAllNotificationsAsRead} className="text-xs font-semibold text-blue-600">
          Mark all read
        </button>
      </div>
      <div className="divide-y divide-slate-100">
        {desk.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => {
              markNotificationAsRead(n.id);
              if (n.targetModule) setCurrentView(n.targetModule as never);
            }}
            className={`w-full text-left px-5 py-3 ${!n.read ? 'bg-blue-50/60' : ''}`}
          >
            <div className="flex justify-between gap-3">
              <p className="text-xs font-bold text-slate-900">{n.title}</p>
              <span className="text-[11px] text-slate-400">{n.timestamp}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{n.message}</p>
          </button>
        ))}
      </div>
    </PageShell>
  );
};

export const DocumentsView: React.FC = () => {
  const { documents } = useApp();
  return (
    <PageShell
      icon={FileText}
      title="Workshop documents"
      subtitle="Inspection files, invoices, and warranties stored for garage staff."
    >
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
          <tr>
            <th className="py-3 px-4">Document</th>
            <th className="py-3 px-4">Category</th>
            <th className="py-3 px-4">Customer</th>
            <th className="py-3 px-4">Uploaded</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((d) => (
            <tr key={d.id}>
              <td className="py-3 px-4 font-semibold text-slate-900">{d.name}</td>
              <td className="py-3 px-4 text-slate-600">{d.category}</td>
              <td className="py-3 px-4 text-slate-600">{d.relatedCustomer || '—'}</td>
              <td className="py-3 px-4 text-slate-500">{d.uploadedAt}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
};

export const TaskBoardView: React.FC = () => {
  const { tasks, currentRole, currentUser, viewWorkOrderDetail } = useApp();
  const visible =
    currentRole === 'TECHNICIAN' ? tasks.filter((t) => t.technicianId === currentUser.id) : tasks;
  const columns: { key: RepairTask['status']; label: string }[] = [
    { key: 'PENDING', label: 'Pending' },
    { key: 'ASSIGNED', label: 'Assigned' },
    { key: 'IN_PROGRESS', label: 'In progress' },
    { key: 'COMPLETED', label: 'Done' }
  ];

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <CheckSquare className="w-6 h-6 text-blue-600" />
          Task board
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {currentRole === 'TECHNICIAN'
            ? 'Your assigned bay jobs. This is not the front-desk work order list.'
            : 'Workshop tasks for mechanics. Separate from customer intake and invoicing.'}
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {columns.map((col) => (
          <div key={col.key} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{col.label}</span>
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {visible.filter((t) => t.status === col.key).length}
              </span>
            </div>
            <div className="p-3 space-y-2 min-h-40">
              {visible
                .filter((t) => t.status === col.key)
                .map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => viewWorkOrderDetail(t.workOrderId)}
                    className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-slate-50"
                  >
                    <p className="text-xs font-semibold text-slate-900">{t.title}</p>
                    <p className="text-[11px] text-slate-500 mt-1">{t.vehicleInfo}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{t.technicianName}</p>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SuppliersView: React.FC = () => {
  const { suppliers } = useApp();
  return (
    <PageShell
      icon={Truck}
      title="Suppliers"
      subtitle="Manager and administrator. Parts vendors — not the warehouse stock list."
    >
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
          <tr>
            <th className="py-3 px-4">Supplier</th>
            <th className="py-3 px-4">Contact</th>
            <th className="py-3 px-4">Categories</th>
            <th className="py-3 px-4">Terms</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-slate-50">
              <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
              <td className="py-3 px-4 text-slate-600">
                {s.contactPerson}
                <span className="block text-[11px] text-slate-400">{s.phone}</span>
              </td>
              <td className="py-3 px-4 text-slate-600">{s.categories.join(', ')}</td>
              <td className="py-3 px-4 text-slate-500">{s.paymentTerms}</td>
              <td className="py-3 px-4">
                <StatusBadge status={s.status} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
};

export const PaymentsView: React.FC = () => {
  const { payments, setCurrentView } = useApp();
  return (
    <PageShell
      icon={CreditCard}
      title="Payments"
      subtitle="Front desk and cashier. Money received against invoices — not the invoice editor."
    >
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold">
          <tr>
            <th className="py-3 px-4">Payment #</th>
            <th className="py-3 px-4">Invoice</th>
            <th className="py-3 px-4">Customer</th>
            <th className="py-3 px-4">Amount</th>
            <th className="py-3 px-4">Method</th>
            <th className="py-3 px-4">Date</th>
            <th className="py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((p) => (
            <tr key={p.id} className="hover:bg-slate-50">
              <td className="py-3 px-4 font-mono font-semibold text-slate-900">{p.paymentIdNumber}</td>
              <td className="py-3 px-4">
                <button type="button" onClick={() => setCurrentView('Invoices')} className="font-mono text-blue-600 hover:underline">
                  {p.invoiceNumber}
                </button>
              </td>
              <td className="py-3 px-4">{p.customerName}</td>
              <td className="py-3 px-4 font-mono font-bold">${p.amount.toFixed(2)}</td>
              <td className="py-3 px-4">{p.paymentMethod}</td>
              <td className="py-3 px-4 text-slate-500">{p.paymentDate}</td>
              <td className="py-3 px-4">
                <StatusBadge status={p.status} size="sm" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </PageShell>
  );
};

function PageShell({
  icon: Icon,
  title,
  subtitle,
  children
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h1 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Icon className="w-6 h-6 text-blue-600" />
          {title}
        </h1>
        <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">{children}</div>
    </div>
  );
}
