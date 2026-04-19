'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { FormField } from '@/lib/forms';

type PublicForm = {
  name: string;
  description: string;
  fields: FormField[];
  settings: {
    submitLabel?: string;
    successMessage?: string;
  };
};

export default function PublicFormPage() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<PublicForm | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    fetch(`/api/forms/submit/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setForm(data);
        setLoaded(true);
      })
      .catch(() => {
        setNotFound(true);
        setLoaded(true);
      });
  }, [slug]);

  function setValue(fieldId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setErrors([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setErrors([]);

    const res = await fetch(`/api/forms/submit/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: values }),
    });

    const result = await res.json();

    if (!res.ok) {
      setErrors(result.errors ?? [result.error ?? 'Submission failed']);
      setSubmitting(false);
      return;
    }

    setSuccessMessage(result.message || 'Thank you for your submission.');

    if (result.redirectUrl) {
      window.location.href = result.redirectUrl;
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  if (!loaded) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div
          className="w-full max-w-xl mx-4 h-96 rounded-2xl animate-pulse"
          style={{ background: 'rgba(255,255,255,0.03)' }}
        />
      </div>
    );
  }

  if (notFound || !form) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div className="text-center">
          <p className="text-sm font-light mb-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Form not found
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
            This form may have been unpublished or deleted.
          </p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: '#0a0a0a' }}
      >
        <div className="w-full max-w-xl mx-4">
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{
                background: 'rgba(200,242,107,0.1)',
                border: '1px solid rgba(200,242,107,0.25)',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 10l4 4 6-8"
                  stroke="#C8F26B"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-sm font-light mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {successMessage}
            </p>
          </div>
          <div className="text-center mt-6">
            <a
              href="/"
              className="text-[10px] font-light transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              Powered by GRID
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start py-12 px-4"
      style={{ background: '#0a0a0a' }}
    >
      <div className="w-full max-w-xl">
        <div
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Form header */}
          <div className="mb-6">
            <h1
              className="text-xl font-extralight tracking-tight mb-1"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              {form.name}
            </h1>
            {form.description && (
              <p className="text-sm font-light leading-relaxed" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {form.description}
              </p>
            )}
          </div>

          {/* Errors */}
          {errors.length > 0 && (
            <div
              className="mb-4 p-3 rounded-xl text-xs font-light"
              style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.2)',
                color: 'rgba(239,68,68,0.8)',
              }}
            >
              {errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}

          {/* Fields */}
          <form onSubmit={handleSubmit}>
            <div className="flex flex-wrap gap-4">
              {form.fields.map((field) => (
                <div
                  key={field.id}
                  className={field.width === 'half' ? 'w-[calc(50%-8px)]' : 'w-full'}
                >
                  <PublicField
                    field={field}
                    value={values[field.id]}
                    onChange={(val) => setValue(field.id, val)}
                  />
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 w-full text-sm font-light py-3 rounded-xl transition-all disabled:opacity-50"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.8)',
              }}
            >
              {submitting ? 'Submitting...' : form.settings.submitLabel || 'Submit'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <a
            href="/"
            className="text-[10px] font-light transition-colors"
            style={{ color: 'rgba(255,255,255,0.2)' }}
          >
            Powered by GRID
          </a>
        </div>
      </div>
    </div>
  );
}

function PublicField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.8)',
  };

  if (field.type === 'heading') {
    return (
      <p
        className="text-sm font-light pt-2"
        style={{ color: 'rgba(255,255,255,0.7)' }}
      >
        {field.label}
      </p>
    );
  }

  if (field.type === 'divider') {
    return <hr className="my-2" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />;
  }

  return (
    <div className="mb-1">
      <label
        className="text-xs font-light mb-1.5 block"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        {field.label}
        {field.required && (
          <span className="ml-1" style={{ color: 'rgba(239,68,68,0.6)' }}>
            *
          </span>
        )}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20 resize-none h-24"
          style={inputStyle}
        />
      ) : field.type === 'select' ? (
        <select
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none"
          style={inputStyle}
        >
          <option value="" style={{ background: '#111' }}>
            {field.placeholder || 'Select...'}
          </option>
          {(field.options ?? []).map((opt, i) => (
            <option key={i} value={opt} style={{ background: '#111' }}>
              {opt}
            </option>
          ))}
        </select>
      ) : field.type === 'multiselect' ? (
        <div className="flex flex-wrap gap-1.5">
          {(field.options ?? []).map((opt) => {
            const selected = Array.isArray(value) && (value as string[]).includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? (value as string[]) : [];
                  if (selected) {
                    onChange(current.filter((v) => v !== opt));
                  } else {
                    onChange([...current, opt]);
                  }
                }}
                className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
                style={{
                  background: selected ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.05)',
                  border: selected
                    ? '1px solid rgba(113,147,237,0.3)'
                    : '1px solid rgba(255,255,255,0.1)',
                  color: selected ? '#7193ED' : 'rgba(255,255,255,0.5)',
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      ) : field.type === 'checkbox' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            className="rounded"
          />
          <span className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {field.placeholder || field.label}
          </span>
        </label>
      ) : field.type === 'date' ? (
        <input
          type="date"
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          required={field.required}
          className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20"
          style={inputStyle}
        />
      ) : (
        <input
          type={
            field.type === 'email'
              ? 'email'
              : field.type === 'number'
                ? 'number'
                : field.type === 'url'
                  ? 'url'
                  : field.type === 'phone'
                    ? 'tel'
                    : 'text'
          }
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          min={field.validation?.min}
          max={field.validation?.max}
          pattern={field.validation?.pattern}
          className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-white/20"
          style={inputStyle}
        />
      )}
    </div>
  );
}
