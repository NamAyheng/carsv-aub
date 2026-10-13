import React, { useState } from 'react';
import {
  X,
  Car,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  KeyRound
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { apiLogin, apiLogout, apiRegister } from '../../api/client';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  onSuccessRedirect: () => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'LOGIN',
  onSuccessRedirect
}) => {
  const { addToast, openCustomerSession, requestPasswordReset } = useApp();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Register Fields
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const session = await apiLogin(email, password);
      if (session.role !== 'CUSTOMER') {
        await apiLogout();
        addToast({
          type: 'error',
          title: 'Customer account required',
          message: 'This website signs in customer accounts only.',
        });
        return;
      }
      const opened = await openCustomerSession();
      if (!opened) {
        addToast({ type: 'error', title: 'Sign in failed', message: 'Could not load your customer profile.' });
        return;
      }
      onClose();
      onSuccessRedirect();
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Sign in failed',
        message: error instanceof Error ? error.message : 'Invalid credentials.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName || !regEmail || !regPhone) {
      addToast({
        type: 'error',
        title: 'Missing Required Fields',
        message: 'Please fill in your full name, phone, and email address.'
      });
      return;
    }

    if (!regPassword || regPassword !== regConfirmPassword) {
      addToast({
        type: 'error',
        title: 'Password Mismatch',
        message: 'Enter a password and make sure the confirmation matches.'
      });
      return;
    }

    const nameParts = regFullName.trim().split(/\s+/);
    setIsSubmitting(true);
    apiRegister({
      email: regEmail,
      password: regPassword,
      first_name: nameParts[0],
      last_name: nameParts.slice(1).join(' '),
      phone: regPhone,
    })
      .then(() => {
        addToast({
          type: 'success',
          title: 'Check your email',
          message: 'Account created. Verify the token printed by the Django server, then sign in.',
        });
        setMode('LOGIN');
      })
      .catch((error: unknown) => {
        addToast({
          type: 'error',
          title: 'Could not register',
          message: error instanceof Error ? error.message : 'Could not create the account.',
        });
      })
      .finally(() => setIsSubmitting(false));
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    requestPasswordReset(forgotEmail)
      .then((ok) => {
        if (ok) setMode('LOGIN');
      })
      .finally(() => setIsSubmitting(false));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-6 pt-8 pb-4 text-center border-b border-slate-800/80 bg-slate-900/60">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3 shadow-inner">
            <Car className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-2xl font-black text-white tracking-tight">
            {mode === 'LOGIN' && 'Sign In to CarSV'}
            {mode === 'REGISTER' && 'Create Customer Account'}
            {mode === 'FORGOT' && 'Reset Password'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {mode === 'LOGIN' && 'Access your vehicles, bookings, and invoices.'}
            {mode === 'REGISTER' && 'Join CarSV to track repairs and manage service history.'}
            {mode === 'FORGOT' && 'Enter your registered email to receive reset instructions.'}
          </p>
        </div>

        {/* Mode Tabs (Login / Register) */}
        {mode !== 'FORGOT' && (
          <div className="flex border-b border-slate-800 bg-slate-950/50 p-1 m-4 rounded-xl">
            <button
              onClick={() => setMode('LOGIN')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('REGISTER')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'REGISTER'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Create Account
            </button>
          </div>
        )}

        <div className="p-6 pt-2">
          {/* A. LOGIN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('FORGOT')}
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-950 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-slate-400 select-none">
                  Remember me on this browser
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In to Customer Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* B. REGISTER FORM */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Your name"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="tel"
                      required
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+855 12 345 678"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full pl-10 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account & Enter Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* C. FORGOT PASSWORD */}
          {mode === 'FORGOT' && (
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Your Account Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg transition-all"
              >
                Send Reset Instructions
              </button>

              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                ← Back to Login
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
