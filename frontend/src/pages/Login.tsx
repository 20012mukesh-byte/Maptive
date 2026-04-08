import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, KeyRound, ShieldCheck } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { useAuthContext } from '@/context/AuthContext';
import { firebaseReady } from '@/lib/firebase';
import { cn } from '@/lib/utils';

const ALLOWED_DOMAINS_MSG = '@college.edu or @maptive.com';

export default function Login() {
  const { user, signInWithGoogle, signInWithEmail, loginMock, loading } = useAuthContext();
  const navigate = useNavigate();
  const [email, setEmail] = useState('student@college.edu');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) navigate('/app/architect', { replace: true });
  }, [user, navigate]);

  const onGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    }
  };

  const onEmail = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await signInWithEmail(email.trim(), password, mode);
    } catch (value) {
      setError(value instanceof Error ? value.message : String(value));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-10">
      <GlassCard className="w-full max-w-md border-white/20 p-8">
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.32em] text-sky-500">Maptive Light</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-800">Maptive Enterprise Intelligence</h1>
          <p className="mt-2 text-sm text-slate-600">Only {ALLOWED_DOMAINS_MSG} accounts can enter.</p>
        </div>

        <div className="mt-6 rounded-2xl border border-white/30 bg-white/55 p-4">
          <div className="flex items-center gap-2 text-sm text-emerald-600">
            <ShieldCheck className="h-4 w-4" />
            Infrastructure access control active
          </div>
          <p className="mt-2 text-xs text-slate-500">Only maptive.com and authorized domains are allowed.</p>
        </div>

        {firebaseReady ? (
          <>
            <button type="button" disabled={loading} onClick={() => void onGoogle()} className={cn('mt-6 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold', 'bg-white text-slate-900 hover:bg-slate-50 disabled:opacity-50')}>
              <Globe className="h-4 w-4" />
              Continue with Google
            </button>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Or email</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl border border-white/30 bg-white/55 p-1">
              <button type="button" onClick={() => setMode('signin')} className={cn('rounded-xl px-3 py-2 text-sm', mode === 'signin' ? 'bg-sky-500 text-white' : 'text-slate-500')}>
                Sign in
              </button>
              <button type="button" onClick={() => setMode('signup')} className={cn('rounded-xl px-3 py-2 text-sm', mode === 'signup' ? 'bg-sky-500 text-white' : 'text-slate-500')}>
                Create account
              </button>
            </div>

            <form onSubmit={onEmail} className="flex flex-col gap-3">
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" className="rounded-2xl border border-white/30 bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none ring-sky-500/0 focus:ring-2 focus:ring-sky-300/60" />
              <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Password" className="rounded-2xl border border-white/30 bg-white/60 px-3 py-2.5 text-sm text-slate-800 outline-none ring-sky-500/0 focus:ring-2 focus:ring-sky-300/60" />
              <button type="submit" disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-500 py-2.5 text-sm font-semibold text-white hover:bg-sky-400 disabled:opacity-50">
                <KeyRound className="h-4 w-4" />
                {mode === 'signin' ? 'Sign in with email' : 'Create authorized account'}
              </button>
            </form>
          </>
        ) : (
          <p className="mt-6 rounded-lg border border-amber-200/80 bg-amber-50/80 p-3 text-xs text-amber-700">Firebase env vars are not set. Demo mode is still available for local UI work.</p>
        )}

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200" />
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Demo</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex flex-col gap-2">
          <button type="button" onClick={() => void loginMock('admin@maptive.com')} className="rounded-2xl border border-white/30 bg-white/55 py-2 text-xs text-slate-700 hover:bg-white/70">Quick: IT admin demo</button>
          <button type="button" onClick={() => void loginMock('user@college.edu')} className="rounded-2xl border border-white/30 bg-white/55 py-2 text-xs text-slate-700 hover:bg-white/70">Quick: Staff demo</button>
        </div>

        {error ? <p className="mt-4 text-center text-xs text-red-500">{error}</p> : null}
      </GlassCard>
    </div>
  );
}
