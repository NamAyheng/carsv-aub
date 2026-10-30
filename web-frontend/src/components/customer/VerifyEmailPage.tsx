import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Car, KeyRound } from 'lucide-react';

/**
 * Legacy /verify-email?token=… links are retired. Verification is a 6-digit OTP
 * entered in the sign-in modal.
 */
export const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-4">
          <Car className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Email verification</h1>
        <div className="mt-6 flex flex-col items-center gap-3">
          <KeyRound className="w-8 h-8 text-blue-400" />
          <p className="text-sm text-slate-300 leading-relaxed">
            CarSV now verifies accounts with a <span className="text-white font-semibold">6-digit code</span>{' '}
            sent to your email. Open Sign In, and if your account is waiting for verification you can enter
            the code there (or request a new one).
          </p>
        </div>
        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={() => navigate('/?signin=1')}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
          >
            Open sign in
          </button>
          <Link to="/" className="block text-xs text-slate-400 hover:text-white pt-1">
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
};
