'use client';

import { useState, useEffect, use } from 'react';
import {
  Sparkles, Star, Loader2, CheckCircle2, Type, Mail, Phone, Hash,
  AlignLeft, ChevronDown, Calendar,
} from 'lucide-react';

// FIX: Added the explicit fallback backend endpoint to match AuthContext and Builder configurations
const API = process.env.NEXT_PUBLIC_API_URL || 'https://ai-form-builder-h6bz.onrender.com/api';

const ICONS = {
  text: Type, email: Mail, phone: Phone, number: Hash, textarea: AlignLeft,
  select: ChevronDown, date: Calendar,
};

export default function PublicFormPage({ params }) {
  // Safely unwrap reactive parameters object for modern Next.js environments
  const unwrappedParams = use(params);
  const id = unwrappedParams?.id;

  const [form, setForm] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) {
      console.log("No id present")
    }
    
    // Public non-auth fetch to grab the schema structure
    fetch(`${API}/forms/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Form not found');
        return r.json();
      })
      .then(setForm)
      .catch((err) => {
        console.error("Fetch form error:", err);
        setError('This form could not be found or is no longer available.');
      });
  }, [id]);

  function setAnswer(fieldId, value) {
    setAnswers((a) => ({ ...a, [fieldId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      // POST directly to the public submission route we configured on the Express backend
      const res = await fetch(`${API}/forms/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) throw new Error('Submission failed');
      setSubmitted(true);
    } catch (err) {
      setError('Could not submit your responses. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !form) {
    return (
      <div className="h-screen flex items-center justify-center text-white/50 px-6 text-center bg-[#0a0c10]">
        <div className="glass rounded-2xl p-6 max-w-sm">
          <p className="text-sm font-medium text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0a0c10]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  const accent = form.theme?.primaryColor || '#10b981';
  const fields = form.schema || [];

  if (submitted) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-[#0a0c10]">
        <div className="glass rounded-3xl p-10 max-w-md w-full text-center animate-fade-up">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: accent }} />
          <h1 className="font-display text-2xl font-semibold">Thanks for that.</h1>
          <p className="text-white/50 text-sm mt-2">Your response to "{form.title}" has been recorded.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 sm:px-6 py-10 sm:py-16 relative overflow-hidden bg-[#0a0c10]">
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full blur-3xl opacity-20"
        style={{ background: accent }}
      />
      <div className="max-w-lg mx-auto relative">
        <div className="flex items-center gap-2 justify-center mb-6 text-white/30 text-xs uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" style={{ color: accent }} />
          Powered by Zetaform
        </div>

        <form onSubmit={handleSubmit} className="glass rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black/40 animate-fade-up">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold leading-tight">{form.title}</h1>
          {form.description && <p className="text-white/50 text-sm mt-2">{form.description}</p>}

          <div className="mt-8 space-y-6">
            {fields.map((field) => (
              <FormField key={field.id} field={field} value={answers[field.id]} onChange={(v) => setAnswer(field.id, v)} accent={accent} />
            ))}
          </div>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            style={{ backgroundColor: accent }}
            className="w-full mt-8 text-canvas font-medium rounded-xl py-3.5 text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit'}
          </button>
        </form>
      </div>
    </main>
  );
}

function FormField({ field, value, onChange, accent }) {
  const Icon = ICONS[field.type] || Type;
  const base = 'w-full bg-[#12151b] border border-white/10 rounded-xl px-3.5 py-3 text-sm placeholder:text-white/25 outline-none focus:ring-1 transition-shadow';

  return (
    <div>
      <label className="flex items-center gap-1.5 text-sm font-medium text-white/80 mb-2">
        <Icon className="w-3.5 h-3.5 text-white/30" />
        {field.label}
        {field.required && <span style={{ color: accent }}>*</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          required={field.required}
          placeholder={field.placeholder}
          rows={4}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={`${base} resize-none`}
          style={{ '--tw-ring-color': accent }}
        />
      ) : field.type === 'select' ? (
        <select
          required={field.required}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        >
          <option value="" disabled>
            {field.placeholder || 'Select an option'}
          </option>
          {(field.options || []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : field.type === 'radio' ? (
        <div className="space-y-2">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer">
              <input
                type="radio"
                name={field.id}
                value={o}
                required={field.required}
                checked={value === o}
                onChange={(e) => onChange(e.target.value)}
                style={{ accentColor: accent }}
                className="w-4 h-4"
              />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === 'checkbox' ? (
        <div className="space-y-2">
          {(field.options || []).map((o) => (
            <label key={o} className="flex items-center gap-2.5 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={Array.isArray(value) && value.includes(o)}
                onChange={(e) => {
                  const arr = Array.isArray(value) ? value : [];
                  onChange(e.target.checked ? [...arr, o] : arr.filter((v) => v !== o));
                }}
                style={{ accentColor: accent }}
                className="w-4 h-4 rounded"
              />
              {o}
            </label>
          ))}
        </div>
      ) : field.type === 'rating' ? (
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => onChange(i)}>
              <Star
                className="w-7 h-7 transition-colors"
                style={{ color: i <= (value || 0) ? accent : 'rgba(255,255,255,0.15)' }}
                fill={i <= (value || 0) ? accent : 'none'}
              />
            </button>
          ))}
        </div>
      ) : (
        <input
          type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
          required={field.required}
          placeholder={field.placeholder}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      )}
    </div>
  );
}