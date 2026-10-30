import React, { useEffect, useState } from 'react';
import {
  X,
  Car,
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  AuthApiError,
  apiGoogleLogin,
  apiLogin,
  apiLogout,
  apiMe,
  apiPublicAuthConfig,
  apiRegister,
  apiResendVerification,
  apiVerifyEmail,
} from '../../api/client';
import { requestGoogleIdToken } from '../../utils/googleSignIn';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_DEFAULT = 60;

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'LOGIN' | 'REGISTER';
  onSuccessRedirect: () => void;
}

function GoogleMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'LOGIN',
  onSuccessRedirect
}) => {
  const { addToast, openCustomerSession, requestPasswordReset, saveCustomerProfile, currentUser } = useApp();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT' | 'CHECK_EMAIL' | 'PHONE'>(initialMode);
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
  const [checkEmailAddr, setCheckEmailAddr] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  /** Always start empty — never auto-fill from Google/profile. */
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  // Sync Login/Register from the parent without remounting (OTP step stays mounted mid-flow).
  const wasOpenRef = React.useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setMode(initialMode);
    } else if (isOpen && wasOpenRef.current) {
      setMode((current) =>
        current === 'CHECK_EMAIL' || current === 'PHONE' || current === 'FORGOT' ? current : initialMode,
      );
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const startResendCooldown = (seconds = RESEND_COOLDOWN_DEFAULT) => {
    setResendCooldown(Math.max(0, Math.floor(seconds)));
  };

  const openCheckEmailStep = (addr: string, detail?: string) => {
    const normalized = addr.trim();
    setCheckEmailAddr(normalized);
    setEmail(normalized);
    setOtpCode('');
    setOtpError('');
    setMode('CHECK_EMAIL');
    startResendCooldown(RESEND_COOLDOWN_DEFAULT);
    addToast({
      type: 'success',
      title: 'Check your email',
      message:
        detail ||
        'Enter the 6-digit verification code we sent to your email before signing in.',
    });
  };

  if (!isOpen) return null;

  const completeLoginRedirect = () => {
    onClose();
    onSuccessRedirect();
  };

  const finishCustomerLogin = async (role: string) => {
    if (role !== 'CUSTOMER') {
      await apiLogout();
      addToast({
        type: 'error',
        title: 'Customer account required',
        message: 'This website signs in customer accounts only.',
      });
      return false;
    }
    const opened = await openCustomerSession();
    if (!opened) {
      addToast({ type: 'error', title: 'Sign in failed', message: 'Could not load your customer profile.' });
      return false;
    }
    const me = await apiMe();
    const existingPhone = typeof me?.phone === 'string' ? me.phone.trim() : '';
    if (!existingPhone) {
      setPhoneNumber('');
      setMode('PHONE');
      return true;
    }
    completeLoginRedirect();
    return true;
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = phoneNumber.trim();
    if (phone.replace(/\D/g, '').length < 8) {
      addToast({
        type: 'error',
        title: 'Phone required',
        message: 'Enter a valid phone number so we can link Telegram alerts later.',
      });
      return;
    }
    setIsSubmitting(true);
    try {
      const saved = await saveCustomerProfile({
        name: currentUser?.name || '',
        phone,
        address: currentUser?.address || '',
      });
      if (!saved) return;
      completeLoginRedirect();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (googleBusy || isSubmitting) return;
    setGoogleBusy(true);
    try {
      const { google_client_id } = await apiPublicAuthConfig();
      const credential = await requestGoogleIdToken(google_client_id);
      const session = await apiGoogleLogin(credential);
      await finishCustomerLogin(session.role);
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Google sign-in failed',
        message: error instanceof Error ? error.message : 'Could not sign in with Google.',
      });
    } finally {
      setGoogleBusy(false);
    }
  };

  // Telegram is alerts-only (Profile → Connect / bot Start → share phone).
  // It does not create or sign in accounts.
  const socialAuthBlock = (
    <div className="space-y-2 mb-4">
      <button
        type="button"
        onClick={() => void handleGoogleSignIn()}
        disabled={googleBusy || isSubmitting}
        className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-slate-800 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50 shadow-sm"
      >
        {googleBusy ? (
          <span className="inline-block w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        ) : (
          <GoogleMark />
        )}
        <span>Sign in with Google</span>
      </button>
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-800" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-slate-900 px-3 text-[11px] uppercase tracking-wider text-slate-500">or</span>
        </div>
      </div>
    </div>
  );

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const session = await apiLogin(email, password);
      await finishCustomerLogin(session.role);
    } catch (error) {
      if (error instanceof AuthApiError && error.code === 'VERIFY_EMAIL') {
        openCheckEmailStep(
          error.email || email,
          'Verify your email before signing in. Enter the 6-digit code we sent (or request a new one).',
        );
        return;
      }
      if (error instanceof AuthApiError && error.code === 'NO_LOCAL_PASSWORD') {
        const addr = (error.email || email).trim();
        setForgotEmail(addr);
        setEmail(addr);
        setMode('FORGOT');
        addToast({
          type: 'info',
          title: 'Set a password',
          message:
            error.message ||
            'This account signed in with Google and has no password yet. Use Forgot password to set one.',
        });
        return;
      }
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
      .then((result) => {
        openCheckEmailStep(result.email || regEmail, result.detail);
        if (result.email_sent === false) {
          addToast({
            type: 'info',
            title: 'Account created',
            message:
              'Verification email could not be delivered to this address yet. Use Resend, or ask an admin to verify in Django admin.',
          });
        }
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

  const handleVerifyOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = otpCode.replace(/\D/g, '');
    if (digits.length !== OTP_LENGTH) {
      setOtpError('Enter the 6-digit code from your email.');
      return;
    }
    setIsSubmitting(true);
    setOtpError('');
    try {
      const result = await apiVerifyEmail(checkEmailAddr, digits);
      addToast({
        type: 'success',
        title: 'Email verified',
        message: result.detail || 'Your email is verified. You can sign in now.',
      });
      setPassword('');
      setOtpCode('');
      setMode('LOGIN');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not verify the code.';
      setOtpError(message);
      addToast({ type: 'error', title: 'Verification failed', message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendVerification = async () => {
    if (!checkEmailAddr.trim()) {
      addToast({ type: 'error', title: 'Email required', message: 'Enter the email used at registration.' });
      return;
    }
    if (resendCooldown > 0) return;
    setIsSubmitting(true);
    try {
      const result = await apiResendVerification(checkEmailAddr);
      startResendCooldown(result.resend_cooldown_seconds || RESEND_COOLDOWN_DEFAULT);
      setOtpCode('');
      setOtpError('');
      addToast({
        type: 'success',
        title: 'Code sent',
        message: 'If that account is waiting for verification, a new 6-digit code is on its way.',
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Could not resend',
        message: error instanceof Error ? error.message : 'Could not resend the verification email.',
      });
    } finally {
      setIsSubmitting(false);
    }
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[min(92dvh,90vh)] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-5 sm:px-6 pt-8 pb-4 text-center border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-3 shadow-inner">
            <Car className="w-6 h-6 text-blue-500" />
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight px-6">
            {mode === 'LOGIN' && 'Sign In to CarSV'}
            {mode === 'REGISTER' && 'Create Customer Account'}
            {mode === 'FORGOT' && 'Reset Password'}
            {mode === 'CHECK_EMAIL' && 'Enter Verification Code'}
            {mode === 'PHONE' && 'Add Your Phone'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {mode === 'LOGIN' && 'Access your vehicles, bookings, and invoices.'}
            {mode === 'REGISTER' && 'Join CarSV to track repairs and manage service history.'}
            {mode === 'FORGOT' && 'Enter your registered email to receive reset instructions.'}
            {mode === 'CHECK_EMAIL' && 'Enter the 6-digit code from your email, then sign in.'}
            {mode === 'PHONE' && 'Enter your phone number so we can match Telegram alerts to your account.'}
          </p>
        </div>

        {/* Mode Tabs (Login / Register) */}
        {mode !== 'FORGOT' && mode !== 'CHECK_EMAIL' && mode !== 'PHONE' && (
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

        <div className="p-5 sm:p-6 pt-2 overflow-y-auto overscroll-contain min-h-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* A. LOGIN FORM */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {socialAuthBlock}
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
              {socialAuthBlock}
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

          {/* D. VERIFY OTP (after register / unverified login) */}
          {mode === 'CHECK_EMAIL' && (
            <form onSubmit={(e) => void handleVerifyOtpSubmit(e)} className="space-y-4">
              <div className="rounded-xl border border-blue-500/30 bg-blue-600/10 px-3.5 py-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verification required
                </p>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                  Enter the 6-digit code we emailed you. Codes expire in 10 minutes and can only be used
                  once.
                </p>
                <p className="text-xs text-slate-400 mt-2">
                  Sent to{' '}
                  <span className="text-white font-medium">{checkEmailAddr || 'your email'}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Verification Code
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    name="carsv-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    maxLength={OTP_LENGTH}
                    value={otpCode}
                    onChange={(e) => {
                      setOtpCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH));
                      setOtpError('');
                    }}
                    placeholder="123456"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 tracking-widest"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Enter the 6-digit code from your email.
                </p>
                {otpError ? (
                  <p className="mt-1.5 text-xs text-rose-400">{otpError}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isSubmitting || otpCode.replace(/\D/g, '').length !== OTP_LENGTH}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Verify & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting || resendCooldown > 0}
                onClick={() => void handleResendVerification()}
                className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold text-slate-200 hover:border-slate-600 disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
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

          {/* E. PHONE (after successful login when profile has no phone) */}
          {mode === 'PHONE' && (
            <form onSubmit={(e) => void handlePhoneSubmit(e)} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    name="carsv-phone"
                    required
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="097 876 7679"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  Use the same number you will share with the CarSV Telegram bot.
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving…' : 'Save Phone & Continue'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
