'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles, Send, ArrowLeft, Share2, Loader2, Star, Check,
  Type, Mail, Phone, Hash, AlignLeft, ChevronDown, Circle, Calendar, BarChart3, Link2, MessageSquare, ListTodo
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-form-builder-h6bz.onrender.com/api';

const FIELD_ICONS = {
  text: Type, email: Mail, phone: Phone, number: Hash, textarea: AlignLeft,
  select: ChevronDown, radio: Circle, checkbox: Check, date: Calendar, rating: Star,
};

function BuilderInner() {
  const router = useRouter();
  const params = useSearchParams();
  const formId = params.get('id');
  const { user, loading: authLoading, authFetch } = useAuth();

  const [form, setForm] = useState(null);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: "Your form is ready below. Tell me what to change — colors, fields, wording, anything." },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  
  const scrollRef = useRef(null);

  // FIX: Added explicit local storage check fallback to prevent premature routing before AuthContext token evaluation resolves
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasToken = localStorage.getItem('formix_token');
      if (!authLoading && !user && !hasToken) {
        router.replace('/login');
      }
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!formId || !user) return; // Prevent public execution if profile details aren't ready yet
    
    fetch(`${API}/forms/${formId}`)
      .then((r) => r.json())
      .then(setForm)
      .catch((err) => console.error("Fetch form failed:", err));
      
    fetchSubmissions();
  }, [formId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  async function fetchSubmissions() {
    if (!formId) return;
    setLoadingSubmissions(true);
    try {
      const res = await authFetch(`/forms/${formId}/submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  }

  async function sendInstruction(e) {
    e.preventDefault();
    if (!input.trim() || !form) return;
    const instruction = input;
    setInput('');
    setMessages((m) => [...m, { role: 'user', text: instruction }]);
    setSending(true);
    try {
      const res = await authFetch('/ai/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentSchema: { title: form.title, description: form.description, theme: form.theme, fields: form.schema },
          instruction,
        }),
      });
      const { schema } = await res.json();

      const updated = await authFetch(`/forms/${formId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: schema.title, description: schema.description, schema: schema.fields, theme: schema.theme }),
      }).then((r) => r.json());

      setForm(updated);
      setMessages((m) => [...m, { role: 'assistant', text: 'Done — updated the form. Anything else?' }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: "Hmm, that didn't work. Try rephrasing the change." }]);
    } finally {
      setSending(false);
    }
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setSummary('');
    try {
      const res = await authFetch(`/ai/summarize/${formId}`);
      const data = await res.json();
      setSummary(data.summary || 'No summary available.');
    } catch {
      setSummary('Failed to generate summary.');
    } finally {
      setSummaryLoading(false);
    }
  }

  function copyLink() {
    const url = `${window.location.origin}/form/${formId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  // Await user parsing profile context layout safely
  if (authLoading || (!user && typeof window !== 'undefined' && localStorage.getItem('formix_token'))) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!formId) {
    return <div className="p-10 text-white/50 bg-canvas min-h-screen">No form selected. Go back to the dashboard.</div>;
  }

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center bg-canvas">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  const fields = form.schema || [];
  const accent = form.theme?.primaryColor || '#10b981';

  return (
    <div className="h-screen flex flex-col bg-canvas text-[#e7e9ec]">
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border glass z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/')} className="text-white/50 hover:text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-medium truncate text-white">{form.title}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={copyLink}
            title="Copy shareable link"
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-emerald-300 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Link2 className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button
            onClick={generateSummary}
            className="hidden sm:flex items-center gap-1.5 text-xs text-white/60 hover:text-emerald-300 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" /> AI Summary
          </button>
          <a
            href={`/form/${formId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-canvas font-medium rounded-lg px-3 py-1.5 shadow-lg shadow-emerald-500/10 transition-all duration-200"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </a>
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="lg:w-[380px] flex flex-col border-b lg:border-b-0 lg:border-r border-border h-[45vh] lg:h-full bg-canvas shrink-0">
          
          <div className="flex border-b border-border bg-surface/20 text-xs font-medium uppercase tracking-wider text-white/40 select-none">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'chat'
                  ? 'text-emerald-400 border-emerald-500 bg-white/[0.02]'
                  : 'border-transparent hover:text-white/80 hover:bg-white/[0.01]'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              AI Assistant
            </button>
            <button
              onClick={() => { setActiveTab('submissions'); fetchSubmissions(); }}
              className={`flex-1 py-3.5 flex items-center justify-center gap-2 border-b-2 transition-all ${
                activeTab === 'submissions'
                  ? 'text-emerald-400 border-emerald-500 bg-white/[0.02]'
                  : 'border-transparent hover:text-white/80 hover:bg-white/[0.01]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              Responses ({submissions.length})
            </button>
          </div>

          {activeTab === 'chat' && (
            <>
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[90%] text-sm rounded-2xl px-3.5 py-2.5 animate-fade-up ${
                      m.role === 'user'
                        ? 'bg-emerald-500 text-canvas ml-auto rounded-br-sm font-medium'
                        : 'bg-surface2 text-white/80 rounded-bl-sm border border-white/5'
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-white/40 text-xs px-2 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Updating form layout...
                  </div>
                )}
                {summaryLoading && (
                  <div className="flex items-center gap-2 text-white/40 text-xs px-2 animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Analyzing metrics...
                  </div>
                )}
                {summary && (
                  <div className="bg-surface2 border border-emerald-500/10 rounded-2xl p-4 text-sm text-white/80 whitespace-pre-wrap leading-relaxed animate-fade-up shadow-inner">
                    <p className="text-emerald-400 text-xs font-semibold mb-2 uppercase tracking-wider">Executive Insights</p>
                    {summary}
                  </div>
                )}
              </div>
              <form onSubmit={sendInstruction} className="p-3 border-t border-border flex gap-2 bg-canvas">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g. Add a phone field, make it emerald"
                  className="flex-1 bg-surface2 border border-white/5 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-400/30 placeholder:text-white/20"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 text-canvas disabled:text-white/30 rounded-xl px-3.5 shrink-0 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {activeTab === 'submissions' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar">
              {loadingSubmissions ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/40 gap-3 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Loading submissions...</span>
                </div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-14 text-sm text-white/30 border border-dashed border-white/5 rounded-2xl px-4">
                  No responses recorded yet.<br />Share the live link to collect data!
                </div>
              ) : (
                submissions.map((sub, idx) => (
                  <div key={sub.id} className="bg-surface2 rounded-xl p-4 border border-white/[0.03] space-y-3 shadow-md animate-fade-up">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-xs text-emerald-400 font-semibold tracking-wide">
                        Submission #{submissions.length - idx}
                      </span>
                      <span className="text-[10px] text-white/30">
                        {new Date(sub.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      {fields.map((field) => {
                        const rawAns = sub.answers?.[field.id];
                        return (
                          <div key={field.id} className="grid grid-cols-3 gap-2 py-0.5">
                            <span className="text-white/40 font-medium truncate" title={field.label}>
                              {field.label}:
                            </span>
                            <span className="col-span-2 text-white/80 break-words">
                              {Array.isArray(rawAns)
                                ? rawAns.join(', ')
                                : rawAns !== undefined && rawAns !== null && rawAns !== ''
                                ? String(rawAns)
                                : <em className="text-white/20 font-light">Left blank</em>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8 sm:py-12 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_60%)]">
          <div className="max-w-lg mx-auto">
            <div className="glass rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/40 border border-white/[0.06]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4" style={{ color: accent }} />
                <span className="text-xs uppercase tracking-wider text-white/40">Live preview</span>
              </div>
              <h2 className="font-display text-2xl font-semibold mt-2 text-white">{form.title}</h2>
              {form.description && <p className="text-white/50 text-sm mt-1.5">{form.description}</p>}

              <div className="mt-6 space-y-5">
                {fields.map((field) => (
                  <PreviewField key={field.id} field={field} accent={accent} />
                ))}
              </div>

              {fields.length > 0 && (
                <button
                  style={{ backgroundColor: accent }}
                  className="w-full mt-7 text-canvas font-medium rounded-xl py-3 text-sm transition-all duration-200 opacity-80 cursor-not-allowed"
                  disabled
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewField({ field, accent }) {
  const Icon = FIELD_ICONS[field.type] || Type;

  return (
    <div className="animate-fade-up">
      <label className="flex items-center gap-1.5 text-sm font-medium text-white/80 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-white/30" />
        {field.label}
        {field.required && <span style={{ color: accent }}>*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          placeholder={field.placeholder}
          disabled
          rows={3}
          className="w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 resize-none outline-none cursor-not-allowed"
        />
      ) : field.type === 'select' ? (
        <select disabled className="w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white/40 cursor-not-allowed">
          <option>{field.placeholder || 'Select an option'}</option>
          {(field.options || []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      ) : field.type === 'radio' || field.type === 'checkbox' ? (
        <div className="space-y-1.5 pl-1">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm text-white/60 cursor-not-allowed">
              <span
                className="w-3.5 h-3.5 rounded-full border border-white/20 bg-[#12151b] inline-block"
                style={field.type === 'checkbox' ? { borderRadius: 4 } : {}}
              />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === 'rating' ? (
        <div className="flex gap-1.5 pl-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="w-5 h-5 text-white/20 cursor-not-allowed" />
          ))}
        </div>
      ) : (
        <input
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
          placeholder={field.placeholder}
          disabled
          className="w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none cursor-not-allowed"
        />
      )}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white/40 bg-canvas">Loading...</div>}>
      <BuilderInner />
    </Suspense>
  );
}