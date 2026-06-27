'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Sparkles, User, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import GoogleButton from '../components/GoogleButton';

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signup(name, email, password);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <div className="w-full max-w-md animate-fade-up">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-canvas" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Formix</span>
        </Link>

        <div className="glass rounded-3xl p-7 sm:p-9 shadow-2xl shadow-black/40">
          <h1 className="font-display text-2xl font-semibold text-center">Create your account</h1>
          <p className="text-white/40 text-sm text-center mt-1.5">Start building AI-powered forms in seconds.</p>

          {/* FIX: Restrained container prevents Google SDK UI from overflowing narrow viewports */}
          <div className="mt-7 w-full max-w-full overflow-hidden flex flex-col items-center justify-center">
            <GoogleButton label="Sign up with Google" />
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-white/30">or</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="relative">
              <User className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-xl pl-10 pr-3.5 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50 placeholder:text-white/30"
              />
            </div>
            <div className="relative">
              <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-xl pl-10 pr-3.5 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50 placeholder:text-white/30"
              />
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface2 border border-border rounded-xl pl-10 pr-3.5 py-3 text-sm outline-none focus:ring-1 focus:ring-emerald-400/50 placeholder:text-white/30"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-canvas font-medium rounded-xl py-3 text-sm transition-transform active:scale-[0.98]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Create account <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="text-center text-sm text-white/40 mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-emerald-300 hover:text-emerald-200 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}