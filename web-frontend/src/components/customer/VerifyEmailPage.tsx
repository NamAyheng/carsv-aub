import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Car, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiVerifyEmail } from '../../api/client';

type Status = 'working' | 'ok' | 'error';

export const VerifyEmailPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = (params.get('token') || '').trim();
  const [status, setStatus] = useState<Status>(token ? 'working' : 'error');
  const [message, setMessage] = useState(
    token ? 'Confirming your email…' : 'This verification link is missing a token.',
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    apiVerifyEmail(token)
      .then((result) => {
        if (cancelled) return;
        setStatus('ok');
        setMessage(result.detail || 'Email verified. You can sign in.');
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error instanceof Error ? error.message : 'Could not verify email.');
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 mb-4">
          <Car className="w-6 h-6 text-blue-500" />
        </div>
        <h1 className="text-2xl font-black text-white tracking-tight">Email verification</h1>
        <div className="mt-6 flex flex-col items-center gap-3">
          {status === 'working' && <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />}
          {status === 'ok' && <CheckCircle2 className="w-8 h-8 text-emerald-400" />}
          {status === 'error' && <AlertCircle className="w-8 h-8 text-rose-400" />}
          <p className="text-sm text-slate-300 leading-relaxed">{message}</p>
        </div>
        <div className="mt-8 space-y-2">
          {status === 'ok' ? (
            <button
              type="button"
              onClick={() => navigate('/?signin=1')}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold"
            >
              Sign in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/?signin=1')}
              className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold border border-slate-700"
            >
              Back to sign in
            </button>
          )}
          <Link to="/" className="block text-xs text-slate-400 hover:text-white pt-1">
            Return to home
          </Link>
        </div>
      </div>
    </div>
  );
};
