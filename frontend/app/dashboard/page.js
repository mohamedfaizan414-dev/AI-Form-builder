'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles, ArrowRight, FileText, Trash2, ExternalLink, Link2, Check, LogOut, Loader2, Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading, authFetch, logout } = useAuth();

  const [forms, setForms] = useState([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    authFetch('/forms')
      .then((r) => r.json())
      .then((data) => setForms(Array.isArray(data) ? data : []))
      .catch(() => setForms([]))
      .finally(() => setLoadingForms(false));
  }, [user, authFetch]);

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

  if (authLoading || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <main className="relative overflow-hidden w-full min-h-screen">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-emerald-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.04)_1px,transparent_0)] [background-size:24px_24px]" />
      </div>

      <nav className="flex items-center justify-between px-4 sm:px-10 py-6 max-w-6xl mx-auto w-full">
        <button onClick={() => router.push('/')} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-canvas" />
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Formix</span>
        </button>
        <div className="flex items-center gap-3">
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
        </div>
      </nav>

      <section className="px-4 sm:px-6 max-w-5xl mx-auto pb-24 pt-6 w-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-white/40 uppercase tracking-wider">Your forms</h2>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1.5 text-xs sm:text-sm bg-emerald-500 hover:bg-emerald-400 text-canvas font-medium rounded-lg px-3 sm:px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5" /> New form
          </button>
        </div>

        {loadingForms ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-2xl shimmer-bg animate-shimmer border border-border" />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-white/40 text-sm w-full">
            No forms yet.{' '}
            <button onClick={() => router.push('/')} className="text-emerald-300 hover:text-emerald-200 font-medium">
              Generate your first one.
            </button>
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
                  <h3 className="font-display font-medium text-lg truncate w-full">{form.title}</h3>
                  <p className="text-white/40 text-sm mt-1 line-clamp-2 w-full break-words">{form.description}</p>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5 w-full min-w-0">
                  <span className="text-xs sm:text-sm text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1 font-medium truncate mr-2">
                    Edit <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
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
    </main>
  );
}
