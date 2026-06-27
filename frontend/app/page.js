'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Sparkles, ArrowRight, FileText, Trash2, ExternalLink, Wand2, Link2, Check, LogOut, Loader2, LogIn,
} from 'lucide-react';
import { useAuth } from './context/AuthContext';

const SUGGESTIONS = [
  'A customer feedback survey for a coffee shop',
  'Event registration form with dietary preferences',
  'Job application form for a design role',
  'Wedding RSVP with guest meal choices',
];

export default function HomePage() {
  const router = useRouter();
  const { user, loading: authLoading, authFetch, logout } = useAuth();

  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  // Fetch forms only if the user is logged in
  useEffect(() => {
    if (!user) {
      setLoadingForms(false);
      return;
    }
    setLoadingForms(true);
    authFetch('/forms')
      .then((r) => r.json())
      .then((data) => setForms(Array.isArray(data) ? data : []))
      .catch(() => setForms([]))
      .finally(() => setLoadingForms(false));
  }, [user, authFetch]);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!prompt.trim()) return;

    // If user is not logged in, cache the prompt and take them to login
    if (!user) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('formix_pending_prompt', prompt);
      }
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

  async function deleteForm(id) {
    setForms((f) => f.filter((x) => x.id !== id));
    await authFetch(`/forms/${id}`, { method: 'DELETE' }).catch(() => {});
  }

  function copyLink(id) {
    const url = `${window.location.origin}/form/${id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }

  // Allow layout to render immediately for public guests instead of showing a global spinner
  if (authLoading && !user && forms.length === 0 && loadingForms) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0c10]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <main className="relative overflow-hidden w-full min-h-screen bg-[#0a0c10]">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <nav className="flex items-center justify-between px-4 sm:px-10 py-6 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-canvas" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight text-white">Formix</span>
        </div>
        
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-white/60">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full border border-white/10" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-medium">
                    {user.name?.[0]?.toUpperCase()}
                  </div>
                )}
                {user.name}
              </div>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 text-xs text-white/50 hover:text-red-400 border border-white/10 rounded-lg px-3 py-1.5"
              >
                <LogOut className="w-3.5 h-3.5" /> Log out
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 hover:border-emerald-500 bg-emerald-500/10 rounded-lg px-4 py-2 transition-all font-medium"
            >
              <LogIn className="w-3.5 h-3.5" /> Log In
            </button>
          )}
        </div>
      </nav>

      <section className="px-4 sm:px-6 max-w-3xl mx-auto text-center pt-10 sm:pt-16 pb-10 w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full glass text-xs text-emerald-300 mb-6 animate-fade-up">
          <Wand2 className="w-3.5 h-3.5" />
          Describe it. We'll build it.
        </div>
        <h1 className="font-display font-semibold text-3xl sm:text-6xl leading-[1.05] tracking-tight animate-fade-up [animation-delay:0.05s] text-white">
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
              className="flex-1 bg-transparent px-4 py-3.5 outline-none text-sm sm:text-base text-white placeholder:text-white/30 min-w-0"
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
                  {!user ? 'Sign in & Generate' : 'Generate'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
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

      {user && (
        <section className="px-4 sm:px-6 max-w-5xl mx-auto pb-24 pt-10 w-full">
          <h2 className="text-sm font-medium text-white/40 mb-4 uppercase tracking-wider">Your forms</h2>

          {loadingForms ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl shimmer-bg animate-shimmer border border-white/5" />
              ))}
            </div>
          ) : forms.length === 0 ? (
            <div className="glass rounded-2xl p-10 text-center text-white/40 text-sm w-full">
              No forms yet. Generate your first one above.
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
              {forms.map((form) => (
                <div
                  key={form.id}
                  onClick={() => router.push(`/builder?id=${form.id}`)}
                  className="glass rounded-2xl p-5 flex flex-col justify-between hover:border-emerald-400/30 border border-transparent transition-colors group cursor-pointer active:scale-[0.99] w-full min-w-0 overflow-hidden"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-emerald-300 mb-2">
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="text-xs uppercase tracking-wide">Form</span>
                    </div>
                    <h3 className="font-display font-medium text-lg truncate w-full text-white">{form.title}</h3>
                    <p className="text-white/40 text-sm mt-1 line-clamp-2 w-full break-words">{form.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 w-full min-w-0">
                    <span className="text-xs sm:text-sm text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1 font-medium truncate mr-2">
                      View Insights <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyLink(form.id);
                        }}
                        title="Copy shareable link"
                        className="text-white/40 hover:text-emerald-300 relative z-10 p-1"
                      >
                        {copiedId === form.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Link2 className="w-4 h-4" />}
                      </button>
                      <a
                        href={`/form/${form.id}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-white/40 hover:text-white relative z-10 p-1"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteForm(form.id);
                        }} 
                        className="text-white/40 hover:text-red-400 relative z-10 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}