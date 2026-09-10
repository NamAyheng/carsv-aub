import React, { useState } from 'react';
import {
  Car,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';
import { ROLE_LABEL } from '../../utils/roles';
import { ThemeToggle } from '../common/ThemeToggle';

interface LoginViewProps {
  onBackToPublicSite?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onBackToPublicSite }) => {
  const { login, users, addToast, theme } = useApp();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('admin@carsv.com');
  const [password, setPassword] = useState('••••••••••••');
  const [rememberMe, setRememberMe] = useState(true);
  const [authMode, setAuthMode] = useState<'LOGIN' | 'FORGOT' | 'RESET'>('LOGIN');
  const [resetEmail, setResetEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      const success = login(email);
      if (!success) {
        // Fallback default admin login
        login('admin@carsv.com', 'ADMIN');
      }
    }, 400);
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      addToast({
        type: 'success',
        title: 'Reset Link Dispatched',
        message: `Security instructions sent to ${resetEmail || 'your email'}.`
      });
      setAuthMode('RESET');
    }, 600);
  };

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      addToast({
        type: 'error',
        title: 'Passwords Mismatch',
        message: 'Please make sure your passwords match.'
      });
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      addToast({
        type: 'success',
        title: 'Password Updated',
        message: 'Your credentials have been securely updated. Please sign in.'
      });
      setAuthMode('LOGIN');
    }, 600);
  };

  const demoAccounts: { role: UserRole; name: string; email: string; desc: string; icon: string }[] = [
    { role: 'ADMIN', name: 'Marcus Vance', email: 'admin@carsv.com', desc: 'Administrator — users, permissions, settings', icon: '👑' },
    { role: 'MANAGER', name: 'Sarah Jenkins', email: 'manager@carsv.com', desc: 'Manager — revenue, dispatch, reports', icon: '💼' },
    { role: 'STAFF', name: 'Alex Wong', email: 'staff@carsv.com', desc: 'Front desk — bookings, check-in, invoices', icon: '📋' },
    { role: 'TECHNICIAN', name: 'Dara Kim', email: 'dara.kim@carsv.com', desc: 'Mechanic — assigned jobs and bay camera', icon: '🔧' }
  ];

  const labelCls = `block text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-600'}`;
  const inputCls = `block w-full pl-10 pr-3 py-2.5 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
    isDark
      ? 'bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500'
      : 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400'
  }`;
  const headingCls = isDark ? 'text-white' : 'text-slate-900';
  const mutedCls = isDark ? 'text-slate-400' : 'text-slate-500';
  const linkCls = isDark ? 'text-sky-400 hover:text-sky-300' : 'text-blue-600 hover:text-blue-700';
  const demoRowCls = isDark
    ? 'bg-slate-950/60 hover:bg-slate-800/80 border-slate-800/80 hover:border-slate-700'
    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 hover:border-slate-300';
  const demoNameCls = isDark
    ? 'text-white group-hover:text-sky-300'
    : 'text-slate-900 group-hover:text-blue-700';

  return (
    <div className={`min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-200 ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800'}`}>
      {/* Top Right Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle variant="pill" showLabel={true} />
      </div>

      {/* Subtle Automotive Background Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {onBackToPublicSite && (
          <div className="mb-4">
            <button
              onClick={onBackToPublicSite}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isDark
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 shadow-xs'
              }`}
            >
              ← Back to Customer Website ("What are we?")
            </button>
          </div>
        )}
        {/* Brand Logo */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-400 flex items-center justify-center text-white shadow-xl shadow-blue-500/25 mx-auto ring-4 ring-blue-500/20">
          <Car className="w-9 h-9" />
        </div>
        <h2 className={`mt-4 text-3xl font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
          Car<span className="text-sky-500">SV</span>
        </h2>
        <p className={`mt-1 text-sm font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
          Staff ERP sign-in
        </p>
        <p className={`mt-1 text-xs ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Garage staff only. Customers use the public website.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className={`backdrop-blur-md py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border ${
          isDark
            ? 'bg-slate-900/90 border-slate-800'
            : 'bg-white border-slate-200'
        }`}>
          {authMode === 'LOGIN' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className={labelCls}>
                  Email Address
                </label>
                <div className="mt-1.5 relative rounded-xl shadow-xs">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="name@carsv.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className={labelCls}>
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setAuthMode('FORGOT')}
                    className={`text-xs font-medium transition-colors ${linkCls}`}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="mt-1.5 relative rounded-xl shadow-xs">
                  <div className={`absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className={`w-4 h-4 rounded ${isDark ? 'border-slate-700 bg-slate-950' : 'border-slate-300 bg-white'} text-blue-600 focus:ring-blue-500`}
                  />
                  <span className={`text-xs font-medium ${mutedCls}`}>Remember this workstation</span>
                </label>
                <div className={`flex items-center gap-1 text-[11px] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>256-bit Encrypted</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-700 hover:to-sky-600 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-lg shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Sign in to staff ERP</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {authMode === 'FORGOT' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center mb-4">
                <KeyRound className={`w-10 h-10 mx-auto mb-2 ${isDark ? 'text-sky-400' : 'text-blue-600'}`} />
                <h3 className={`text-base font-bold ${headingCls}`}>Reset Password</h3>
                <p className={`text-xs mt-1 ${mutedCls}`}>
                  Enter your registered garage email and we'll transmit a secure reset code.
                </p>
              </div>

              <div>
                <label className={labelCls}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className={`mt-1.5 ${inputCls} !pl-3.5`}
                  placeholder="admin@carsv.com"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md"
              >
                {isSubmitting ? 'Transmitting...' : 'Send Recovery Instructions'}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('LOGIN')}
                className={`w-full text-xs text-center block pt-2 ${isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'}`}
              >
                ← Return to Sign In
              </button>
            </form>
          )}

          {authMode === 'RESET' && (
            <form onSubmit={handleResetSubmit} className="space-y-4 animate-in fade-in duration-200">
              <div className="text-center mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h3 className={`text-base font-bold ${headingCls}`}>Set New Password</h3>
                <p className={`text-xs mt-1 ${mutedCls}`}>Create a new secure passphrase for CarSV access.</p>
              </div>

              <div>
                <label className={labelCls}>
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={`mt-1.5 ${inputCls} !pl-3.5`}
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <label className={labelCls}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={`mt-1.5 ${inputCls} !pl-3.5`}
                  placeholder="••••••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md"
              >
                {isSubmitting ? 'Saving...' : 'Update Password & Sign In'}
              </button>
            </form>
          )}

          {/* 1-Click Role Testing Switcher */}
          <div className={`mt-8 pt-6 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${mutedCls}`}>
                <Sparkles className={`w-3 h-3 ${isDark ? 'text-sky-400' : 'text-blue-600'}`} />
                Demo staff accounts
              </span>
              <span className="text-[10px] text-slate-500">One job each</span>
            </div>

            <div className="space-y-1.5">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    login(acc.email, acc.role);
                  }}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border transition-all text-left group cursor-pointer ${demoRowCls}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base">{acc.icon}</span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-bold transition-colors ${demoNameCls}`}>
                          {acc.name}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-sm border ${
                          isDark
                            ? 'bg-blue-500/20 text-sky-400 border-blue-500/30'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {ROLE_LABEL[acc.role]}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{acc.desc}</p>
                    </div>
                  </div>
                  <ArrowRight className={`w-3.5 h-3.5 group-hover:translate-x-0.5 transition-all shrink-0 ml-2 ${isDark ? 'text-slate-600 group-hover:text-sky-400' : 'text-slate-400 group-hover:text-blue-600'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
