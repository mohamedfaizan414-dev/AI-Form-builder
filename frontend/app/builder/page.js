'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Sparkles, Send, ArrowLeft, Share2, Loader2, Star, Check,
  Type, Mail, Phone, Hash, AlignLeft, ChevronDown, Circle, Calendar, BarChart3, Link2, MessageSquare, ListTodo, Paperclip, X, Copy, MessageCircle, Twitter, Linkedin
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const FIELD_ICONS = {
  text: Type, email: Mail, phone: Phone, number: Hash, textarea: AlignLeft,
  select: ChevronDown, radio: Circle, checkbox: Check, date: Calendar, rating: Star, file: Paperclip
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
  const [copied, setCopied] = useState(false);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  
  // Share Hub Specific State
  const [showShareModal, setShowShareModal] = useState(false);
  
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!formId || !user) return;
    
    fetch(`${API}/forms/${formId}`)
      .then((r) => r.json())
      .then(setForm)
      .catch((err) => console.error("Fetch form failed:", err));
      
    authFetch(`/forms/${formId}/submissions`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSubmissionsCount(data.length);
      })
      .catch((err) => console.error('Failed to load count template:', err));
  }, [formId, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

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

  const liveFormUrl = typeof window !== 'undefined' ? `${window.location.origin}/form/${formId}` : '';

  function copyLink() {
    navigator.clipboard.writeText(liveFormUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

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
        <Loader2 className="w-6 h-6 animate-spin text-[#10b981]" />
      </div>
    );
  }

  const fields = form.schema || [];
  const accent = form.theme?.primaryColor || '#10b981';

  return (
    <div className="h-screen flex flex-col bg-canvas text-[#e7e9ec]">
      
      {/* Upper Workspace Control Header Navbar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border glass z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => router.push('/dashboard')} className="text-white/50 hover:text-white shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="font-display font-medium truncate text-white">{form.title}</span>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push(`/builder/responses?id=${formId}`)}
            className="flex items-center gap-1.5 text-xs text-white/60 hover:text-emerald-300 border border-white/10 rounded-lg px-3 py-1.5 transition-colors"
          >
            <BarChart3 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Responses Center</span>
          </button>

          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 text-xs bg-emerald-500 hover:bg-emerald-400 text-canvas font-semibold rounded-lg px-3 py-1.5 shadow-md transition-all active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" /> <span>Share Form</span>
          </button>
        </div>
      </header>

      {/* Main Dual-Column Split Area Pane Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left Column Drawer Chat System */}
        <div className="lg:w-[400px] flex flex-col border-b lg:border-b-0 lg:border-r border-border h-[40vh] lg:h-full bg-canvas shrink-0 overflow-hidden">
          <div className="flex border-b border-border bg-surface/20 text-xs font-semibold uppercase tracking-wider text-white/40 select-none shrink-0 relative z-20">
            <div className="flex-1 py-3.5 flex items-center justify-center gap-2 border-b-2 border-emerald-500 text-emerald-400 bg-white/[0.01]">
              <MessageSquare className="w-3.5 h-3.5" />
              AI Assistant Workspace
            </div>
            <button
              onClick={() => router.push(`/builder/responses?id=${formId}`)}
              className="flex-1 py-3.5 flex items-center justify-center gap-2 border-b-2 border-transparent text-white/40 hover:text-white/90 transition-all"
            >
              <ListTodo className="w-3.5 h-3.5" />
              Responses Panel ({submissionsCount})
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`max-w-[90%] text-sm rounded-2xl px-3.5 py-2.5 animate-fade-up ${
                  m.role === 'user'
                    ? 'bg-emerald-500 text-canvas ml-auto rounded-br-sm font-medium shadow-sm'
                    : 'bg-surface2 text-white/80 rounded-bl-sm border border-white/5'
                }`}
              >
                {m.text}
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-white/40 text-xs px-2 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" /> Modifying schema layout structure...
              </div>
            )}
          </div>

          <form onSubmit={sendInstruction} className="p-3 border-t border-border flex gap-2 bg-canvas shrink-0">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g., Add a file upload box field"
              className="flex-1 bg-surface2 border border-white/5 text-white rounded-xl px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-emerald-400/30 placeholder:text-white/20"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/5 text-canvas disabled:text-white/30 rounded-xl px-3.5 shrink-0 transition-colors flex items-center justify-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Live Form Preview Frame View Panel */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.01),transparent_60%)]">
          <div className="max-w-lg mx-auto">
            <div className="glass rounded-2xl p-5 sm:p-8 shadow-2xl shadow-black/40 border border-white/[0.05]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold">Real-Time Canvas Preview</span>
              </div>
              
              <h2 className="font-display text-xl sm:text-2xl font-semibold mt-2 text-white tracking-tight">{form.title}</h2>
              {form.description && <p className="text-white/50 text-xs sm:text-sm mt-1.5 leading-relaxed">{form.description}</p>}

              <div className="mt-6 space-y-4">
                {fields.map((field) => (
                  <PreviewField key={field.id} field={field} accent={accent} />
                ))}
              </div>

              {fields.length > 0 && (
                <button
                  style={{ backgroundColor: accent }}
                  className="w-full mt-7 text-canvas font-medium rounded-xl py-3 text-sm opacity-30 cursor-not-allowed"
                  disabled
                >
                  Submit Form (Preview Framework)
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* NEW: Modular Cross-Platform Distribution Share Hub Modal Window Overlay Component */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#12151b] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
            
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-semibold text-white text-base">Share Public Form Link</h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1.5 hover:bg-white/5 rounded-lg text-white/40 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 bg-canvas/30">
              
              {/* Copy URL Clip Field Grid box */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-wide block">Direct Form Link</span>
                <div className="flex gap-2 p-2 rounded-xl bg-black/40 border border-white/5 items-center justify-between">
                  <span className="text-xs font-mono text-white/60 truncate pl-1 flex-1">{liveFormUrl}</span>
                  <button
                    onClick={copyLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg font-semibold bg-white/5 hover:bg-white/15 text-white/90 transition-all shrink-0 border border-white/5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Native App Distribution Share Grid Hub Row elements */}
              <div className="space-y-2">
                <span className="text-[10px] uppercase font-bold text-white/30 tracking-wide block">Share via Platforms</span>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Please fill out this form: ${liveFormUrl}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/20 text-[#25D366] py-3 rounded-xl text-xs font-semibold transition-all"
                  >
                    <MessageCircle className="w-4 h-4" /> WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(liveFormUrl)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#0077B5]/10 hover:bg-[#0077B5]/20 border border-[#0077B5]/20 text-[#0077B5] py-3 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Linkedin className="w-4 h-4" /> LinkedIn
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out my form built via Formix: ${liveFormUrl}`)}`}
                    target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 text-white/90 py-3 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Twitter className="w-4 h-4 fill-white" /> Twitter / X
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(form.title)}&body=${encodeURIComponent(`Please take a minute to submit your response here: ${liveFormUrl}`)}`}
                    className="flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 py-3 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Mail className="w-4 h-4" /> Email Client
                  </a>
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-white/5 bg-[#12151b] flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl font-semibold text-xs border border-white/5 text-white/60 transition-all"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

function PreviewField({ field, accent }) {
  const Icon = FIELD_ICONS[field.type] || Type;

  return (
    <div className="animate-fade-up text-left">
      <label className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-white/80 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-white/30" />
        {field.label}
        {field.required && <span style={{ color: accent }}>*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea placeholder={field.placeholder} disabled rows={3} className="w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white resize-none outline-none cursor-not-allowed" />
      ) : field.type === 'select' ? (
        <select disabled className="w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white/40 cursor-not-allowed">
          <option>{field.placeholder || 'Select option'}</option>
        </select>
      ) : field.type === 'radio' || field.type === 'checkbox' ? (
        <div className="space-y-1 pl-0.5">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2 text-xs sm:text-sm text-white/50 cursor-not-allowed">
              <span className="w-3 h-3 rounded-full border border-white/20 bg-[#12151b] inline-block" style={field.type === 'checkbox' ? { borderRadius: 3 } : {}} />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === 'rating' ? (
        <div className="flex gap-1 pl-0.5">
          {[1, 2, 3, 4, 5].map((i) => <Star key={i} className="w-4 h-4 text-white/20" />)}
        </div>
      ) : field.type === 'file' ? (
        <div className="w-full bg-[#12151b] border border-dashed border-white/10 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-not-allowed">
          <Paperclip className="w-4 h-4 text-white/20 mb-1" />
          <span className="text-[11px] text-white/30">{field.placeholder || 'File Attachment field preview Box'}</span>
        </div>
      ) : (
        <input type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'} placeholder={field.placeholder} disabled className="w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white outline-none cursor-not-allowed" />
      )}
    </div>
  );
}

export default function BuilderPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white/40 bg-[#0a0c10]">Loading workspace...</div>}>
      <BuilderInner />
    </Suspense>
  );
}