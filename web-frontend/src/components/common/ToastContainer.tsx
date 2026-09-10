import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useApp, ToastMessage } from '../../context/AppContext';

const TOAST_LIFETIME_MS = 3000;

const ToastItem: React.FC<{
  toast: ToastMessage;
  isDark: boolean;
  onClose: (id: string) => void;
}> = ({ toast, isDark, onClose }) => {
  useEffect(() => {
    const timer = window.setTimeout(() => onClose(toast.id), toast.duration ?? TOAST_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [toast.id, toast.duration]);

  const tone =
    toast.type === 'error'
      ? {
          icon: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          border: isDark ? 'border-rose-500/40' : 'border-rose-200',
          title: isDark ? 'text-white' : 'text-rose-950'
        }
      : toast.type === 'warning'
        ? {
            icon: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
            border: isDark ? 'border-amber-500/40' : 'border-amber-200',
            title: isDark ? 'text-white' : 'text-amber-950'
          }
        : toast.type === 'info'
          ? {
              icon: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
              border: isDark ? 'border-sky-500/40' : 'border-blue-200',
              title: isDark ? 'text-white' : 'text-blue-950'
            }
          : {
              icon: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
              border: isDark ? 'border-emerald-500/40' : 'border-emerald-200',
              title: isDark ? 'text-white' : 'text-emerald-950'
            };

  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg ${tone.border} ${
        isDark ? 'bg-slate-800' : 'bg-white'
      } transition-all duration-300`}
    >
      {tone.icon}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-bold leading-snug ${tone.title}`}>{toast.title}</h4>
        {toast.message && (
          <p className={`text-sm mt-0.5 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            {toast.message}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onClose(toast.id)}
        className={`p-1 rounded-md transition-colors ${
          isDark ? 'text-slate-400 hover:text-white' : 'text-slate-400 hover:text-slate-700'
        }`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, theme } = useApp();
  const isDark = theme === 'dark';

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} isDark={isDark} onClose={removeToast} />
      ))}
    </div>
  );
};
