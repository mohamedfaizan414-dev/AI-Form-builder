'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, Wand2, LayoutGrid, Loader2 } from 'lucide-react';
import { useAuth } from './context/AuthContext';

const SUGGESTIONS = [
  'A customer feedback survey for a coffee shop',
  'Event registration form with dietary preferences',
  'Job application form for a design role',
  'Wedding RSVP with guest meal choices',
];

const PENDING_PROMPT_KEY = 'formix_pending_prompt';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, authFetch } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // If we just came back from logging in to fulfil a pending prompt, restore it.
  useEffect(() => {
    const pending = sessionStorage.getItem(PENDING_PROMPT_KEY);
    if (pending) {
      setPrompt(pending);
      sessionStorage.removeItem(PENDING_PROMPT_KEY);
    }
  }, []);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    // Not logged in yet — save what they typed and send them to log in first.
    if (!user) {
      sessionStorage.setItem(PENDING_PROMPT_KEY, prompt);
      router.push('/login');
      return;
    }

    setGenerating(true);
    setError('');
    try {
      const res = await authFetch('/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      if (!res.ok) throw new Error('Generation failed');
      const { schema } = await res.json();

      const createRes = await authFetch('/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: schema.title,
          description: schema.description,
          schema: schema.fields,
          theme: schema.theme,
        }),
      });
      const form = await createRes.json();
      router.push(`/builder?id=${form.id}`);
    } catch (err) {
      setError('Something went wrong generating your form. Please try again.');
      setGenerating(false);
    }
  }

  return (
    <main className="relative overflow-hidden w-full min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <nav className="flex items-center justify-between px-4 sm:px-10 py-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-canvas" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Formix</span>
        </div>

        <div className="flex items-center gap-3">
          {authLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white/30" />
          ) : user ? (
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-canvas font-medium rounded-lg px-3 sm:px-4 py-2"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> My forms
            </button>
          ) : (
            <>
              <button
                onClick={() => router.push('/login')}
                className="text-xs sm:text-sm text-white/60 hover:text-white px-3 py-2"
              >
                Log in
              </button>
              <button
                onClick={() => router.push('/signup')}
                className="text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-canvas font-medium rounded-lg px-3 sm:px-4 py-2"
              >
                Sign up
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="px-4 sm:px-6 max-w-3xl mx-auto text-center pt-10 sm:pt-20 pb-24 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-emerald-300 mb-6 animate-fade-up">
          <Wand2 className="w-3.5 h-3.5" />
          Describe it. We'll build it.
        </div>
        <h1 className="font-display font-semibold text-3xl sm:text-6xl leading-[1.05] tracking-tight animate-fade-up [animation-delay:0.05s]">
          Forms that build
          <br />
          <span className="text-gradient">themselves.</span>
        </h1>
        <p className="mt-5 text-white/50 text-sm sm:text-lg max-w-xl mx-auto animate-fade-up [animation-delay:0.1s]">
          Type a sentence. Get a fully working, beautifully designed form — fields, validation, and theme included.
        </p>

        <form onSubmit={handleGenerate} className="mt-10 animate-fade-up [animation-delay:0.15s]">
          <div className="glass rounded-2xl p-2 flex flex-col sm:flex-row gap-2 shadow-2xl shadow-black/40">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A feedback form for a yoga studio with a 5-star rating"
              className="flex-1 bg-transparent px-4 py-3.5 outline-none text-sm sm:text-base placeholder:text-white/30 min-w-0"
              disabled={generating}
            />
            <button
              type="submit"
              disabled={generating || !prompt.trim()}
              className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/10 disabled:text-white/30 text-canvas font-medium px-5 py-3.5 rounded-xl transition-all active:scale-95 text-sm sm:text-base whitespace-nowrap"
            >
              {generating ? (
                <span className="w-4 h-4 border-2 border-canvas/40 border-t-canvas rounded-full animate-spin" />
              ) : (
                <>
                  Generate <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
          {!user && !authLoading && (
            <p className="text-white/30 text-xs mt-3">You'll be asked to log in before we build it — your prompt will be saved.</p>
          )}
          {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
        </form>

        <div className="mt-6 flex flex-wrap gap-2 justify-center animate-fade-up [animation-delay:0.2s]">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => setPrompt(s)}
              className="text-[11px] sm:text-xs text-white/50 hover:text-emerald-300 border border-white/10 hover:border-emerald-400/40 rounded-full px-3 py-1.5 transition-colors max-w-full truncate"
            >
              {s}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
