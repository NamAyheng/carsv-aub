import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Car, CheckCircle2, AlertCircle, KeyRound, Loader2 } from 'lucide-react';
import { apiConfirmPasswordReset } from '../../api/client';

type Status = 'form' | 'working' | 'ok' | 'error';

export const ResetPasswordPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get('token') || '').trim();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState<Status>(token ? 'form' : 'error');
  const [message, setMessage] = useState(
    token ? 'Choose a new password for your CarSV account.' : 'This reset link is missing a token.',
  );

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    if (password.length < 8) {
      setStatus('error');
      setMessage('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setStatus('error');
      setMessage('Passwords do not match.');
      return;
    }
    setStatus('working');
    setMessage('Updating your password…');
    try {
      const result = await apiConfirmPasswordReset(token, password);
      setStatus('ok');
      setMessage(result.detail || 'Password updated. You can sign in.');
    } catch (error: unknown) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not reset password.');
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-4">
          <Car className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm text-slate-400">{message}</p>

        {status === 'ok' ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <button
              type="button"
              onClick={() => navigate('/?signin=1')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-slate-950 text-sm font-bold"
            >
              Sign in
            </button>
          </div>
        ) : !token ? (
          <div className="mt-6 flex flex-col items-center gap-3">
            <AlertCircle className="w-8 h-8 text-rose-400" />
            <button
              type="button"
              onClick={() => navigate('/?signin=1')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700"
            >
              Back to sign in
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-3 text-left">
            {status === 'error' && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{message}</span>
              </div>
            )}
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              New password
              <input
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (status === 'error') setStatus('form');
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                required
                minLength={8}
              />
            </label>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Confirm password
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  if (status === 'error') setStatus('form');
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                required
                minLength={8}
              />
            </label>
            <button
              type="submit"
              disabled={status === 'working'}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-slate-950 text-sm font-bold"
            >
              {status === 'working' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <KeyRound className="w-4 h-4" />
              )}
              {status === 'working' ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}

        <Link to="/" className="block text-xs text-slate-400 hover:text-white pt-4">
          Return to home
        </Link>
      </div>
    </div>
  );
};
