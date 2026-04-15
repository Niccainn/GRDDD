'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FIELD_CATEGORIES,
  createDefaultField,
  fieldTypeLabel,
  type FormField,
  type FormSettings,
  type FieldType,
} from '@/lib/forms';

type FormData = {
  id: string;
  name: string;
  description: string;
  fields: FormField[];
  settings: FormSettings;
  slug: string;
  isPublished: boolean;
  environmentId: string;
  environmentName: string;
  submissions: number;
};

export default function FormBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState<FormData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [copied, setCopied] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`/api/forms/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setForm(data);
        setLoaded(true);
      });
  }, [id]);

  const save = useCallback(
    async (updates: Partial<FormData>) => {
      if (!form) return;
      setSaving(true);
      const body: Record<string, unknown> = {};
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.description !== undefined) body.description = updates.description;
      if (updates.fields !== undefined) body.fields = updates.fields;
      if (updates.settings !== undefined) body.settings = updates.settings;
      if (updates.isPublished !== undefined) body.isPublished = updates.isPublished;

      await fetch(`/api/forms/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setSaving(false);
      setLastSaved(new Date());
    },
    [form, id],
  );

  const debouncedSave = useCallback(
    (updates: Partial<FormData>) => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(() => save(updates), 800);
    },
    [save],
  );

  function updateForm(updates: Partial<FormData>) {
    if (!form) return;
    const next = { ...form, ...updates };
    setForm(next);
    debouncedSave(updates);
  }

  function addField(type: FieldType) {
    if (!form) return;
    const field = createDefaultField(type);
    const fields = [...form.fields, field];
    updateForm({ fields });
    setSelectedFieldId(field.id);
  }

  function removeField(fieldId: string) {
    if (!form) return;
    const fields = form.fields.filter((f) => f.id !== fieldId);
    updateForm({ fields });
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    if (!form) return;
    const idx = form.fields.findIndex((f) => f.id === fieldId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= form.fields.length) return;
    const fields = [...form.fields];
    [fields[idx], fields[newIdx]] = [fields[newIdx], fields[idx]];
    updateForm({ fields });
  }

  function updateField(fieldId: string, updates: Partial<FormField>) {
    if (!form) return;
    const fields = form.fields.map((f) =>
      f.id === fieldId ? { ...f, ...updates } : f,
    );
    updateForm({ fields });
  }

  function copyShareLink() {
    if (!form) return;
    navigator.clipboard.writeText(`${window.location.origin}/f/${form.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const selectedField = form?.fields.find((f) => f.id === selectedFieldId) ?? null;

  if (!loaded) {
    return (
      <div className="px-10 py-10 min-h-screen">
        <div className="h-8 w-48 rounded-lg animate-pulse mb-6" style={{ background: 'var(--glass)' }} />
        <div className="h-[600px] rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
      </div>
    );
  }

  if (!form) {
    return (
      <div className="px-10 py-10 min-h-screen">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Form not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center gap-4">
          <Link
            href="/forms"
            className="text-xs font-light transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            &larr; Forms
          </Link>
          <input
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
            className="text-sm font-light bg-transparent border-none outline-none"
            style={{ color: 'var(--text-1)', minWidth: '200px' }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
            {saving ? 'Saving...' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : ''}
          </span>
          <Link
            href={`/forms/${id}/submissions`}
            className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-3)',
            }}
          >
            {form.submissions} submission{form.submissions !== 1 ? 's' : ''}
          </Link>
          <button
            onClick={copyShareLink}
            className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: copied ? '#15AD70' : 'var(--text-3)',
            }}
          >
            {copied ? 'Copied' : 'Share'}
          </button>
          <a
            href={`/f/${form.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-3)',
            }}
          >
            Preview
          </a>
          <button
            onClick={() => updateForm({ isPublished: !form.isPublished })}
            className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: form.isPublished
                ? 'rgba(21,173,112,0.1)'
                : 'rgba(255,255,255,0.06)',
              border: form.isPublished
                ? '1px solid rgba(21,173,112,0.25)'
                : '1px solid rgba(255,255,255,0.1)',
              color: form.isPublished ? '#15AD70' : 'rgba(255,255,255,0.5)',
            }}
          >
            {form.isPublished ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Builder */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel -- field palette */}
        <div
          className="w-[200px] flex-shrink-0 overflow-y-auto p-4"
          style={{ borderRight: '1px solid var(--glass-border)' }}
        >
          <p
            className="text-[10px] tracking-[0.12em] uppercase mb-4"
            style={{ color: 'var(--text-3)' }}
          >
            Fields
          </p>
          {FIELD_CATEGORIES.map((cat) => (
            <div key={cat.name} className="mb-4">
              <p
                className="text-[10px] font-light mb-2"
                style={{ color: 'var(--text-3)' }}
              >
                {cat.name}
              </p>
              <div className="flex flex-col gap-1">
                {cat.types.map((type) => (
                  <button
                    key={type}
                    onClick={() => addField(type)}
                    className="text-xs font-light px-3 py-2 rounded-lg text-left transition-all hover:bg-white/5"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    {fieldTypeLabel(type)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Center -- form preview */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-xl mx-auto">
            {/* Form header */}
            <div className="mb-6">
              <input
                value={form.name}
                onChange={(e) => updateForm({ name: e.target.value })}
                className="text-xl font-extralight bg-transparent border-none outline-none w-full mb-2"
                style={{ color: 'var(--text-1)' }}
                placeholder="Form name"
              />
              <input
                value={form.description}
                onChange={(e) => updateForm({ description: e.target.value })}
                className="text-sm font-light bg-transparent border-none outline-none w-full"
                style={{ color: 'var(--text-3)' }}
                placeholder="Add a description..."
              />
            </div>

            {/* Fields */}
            {form.fields.length === 0 ? (
              <div
                className="flex flex-col items-center justify-center py-16 rounded-2xl"
                style={{ border: '1px dashed var(--glass-border)' }}
              >
                <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
                  No fields yet
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Click a field type on the left to add it
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {form.fields.map((field, idx) => (
                  <div
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    className="group relative rounded-xl p-4 transition-all cursor-pointer"
                    style={{
                      background: 'var(--glass)',
                      border:
                        selectedFieldId === field.id
                          ? '1px solid rgba(113,147,237,0.5)'
                          : '1px solid var(--glass-border)',
                    }}
                  >
                    {/* Controls */}
                    <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(field.id, -1);
                        }}
                        disabled={idx === 0}
                        className="text-xs px-1.5 py-0.5 rounded disabled:opacity-20"
                        style={{ color: 'var(--text-3)' }}
                      >
                        &uarr;
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveField(field.id, 1);
                        }}
                        disabled={idx === form.fields.length - 1}
                        className="text-xs px-1.5 py-0.5 rounded disabled:opacity-20"
                        style={{ color: 'var(--text-3)' }}
                      >
                        &darr;
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeField(field.id);
                        }}
                        className="text-xs px-1.5 py-0.5 rounded transition-colors hover:text-red-400"
                        style={{ color: 'var(--text-3)' }}
                      >
                        &times;
                      </button>
                    </div>

                    {/* Field preview */}
                    <FieldPreview field={field} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel -- field config */}
        <div
          className="w-[280px] flex-shrink-0 overflow-y-auto p-4"
          style={{ borderLeft: '1px solid var(--glass-border)' }}
        >
          {selectedField ? (
            <FieldConfig
              field={selectedField}
              onUpdate={(updates) => updateField(selectedField.id, updates)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <p className="text-xs font-light text-center" style={{ color: 'var(--text-3)' }}>
                Select a field to configure it
              </p>
            </div>
          )}

          {/* Form settings section */}
          <div className="mt-8 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <p
              className="text-[10px] tracking-[0.12em] uppercase mb-4"
              style={{ color: 'var(--text-3)' }}
            >
              Settings
            </p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
                  Submit button label
                </label>
                <input
                  value={form.settings.submitLabel ?? ''}
                  onChange={(e) =>
                    updateForm({
                      settings: { ...form.settings, submitLabel: e.target.value },
                    })
                  }
                  placeholder="Submit"
                  className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
                  Success message
                </label>
                <input
                  value={form.settings.successMessage ?? ''}
                  onChange={(e) =>
                    updateForm({
                      settings: { ...form.settings, successMessage: e.target.value },
                    })
                  }
                  placeholder="Thank you for your submission."
                  className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                  }}
                />
              </div>
              <div>
                <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
                  Redirect URL (after submit)
                </label>
                <input
                  value={form.settings.redirectUrl ?? ''}
                  onChange={(e) =>
                    updateForm({
                      settings: { ...form.settings, redirectUrl: e.target.value },
                    })
                  }
                  placeholder="https://"
                  className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----- Field Preview Component -----

function FieldPreview({ field }: { field: FormField }) {
  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--glass-border)',
    color: 'rgba(255,255,255,0.5)',
  };

  if (field.type === 'heading') {
    return (
      <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
        {field.label}
      </p>
    );
  }

  if (field.type === 'divider') {
    return <hr style={{ borderColor: 'var(--glass-border)' }} />;
  }

  return (
    <div>
      <label className="text-xs font-light mb-1.5 block" style={{ color: 'var(--text-2)' }}>
        {field.label}
        {field.required && (
          <span className="ml-1" style={{ color: 'rgba(239,68,68,0.7)' }}>
            *
          </span>
        )}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          placeholder={field.placeholder}
          disabled
          className="w-full text-xs font-light px-3 py-2 rounded-lg resize-none h-20"
          style={inputStyle}
        />
      ) : field.type === 'select' || field.type === 'multiselect' ? (
        <select
          disabled
          className="w-full text-xs font-light px-3 py-2 rounded-lg appearance-none"
          style={inputStyle}
        >
          <option>{field.placeholder || 'Select...'}</option>
          {(field.options ?? []).map((opt, i) => (
            <option key={i}>{opt}</option>
          ))}
        </select>
      ) : field.type === 'checkbox' ? (
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border"
            style={{ borderColor: 'var(--glass-border)', background: 'rgba(255,255,255,0.05)' }}
          />
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            {field.placeholder || field.label}
          </span>
        </div>
      ) : (
        <input
          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
          placeholder={field.placeholder}
          disabled
          className="w-full text-xs font-light px-3 py-2 rounded-lg"
          style={inputStyle}
        />
      )}
    </div>
  );
}

// ----- Field Config Component -----

function FieldConfig({
  field,
  onUpdate,
}: {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
}) {
  const isLayout = field.type === 'heading' || field.type === 'divider';

  return (
    <div>
      <p
        className="text-[10px] tracking-[0.12em] uppercase mb-4"
        style={{ color: 'var(--text-3)' }}
      >
        {fieldTypeLabel(field.type)} Field
      </p>

      <div className="flex flex-col gap-3">
        {/* Label */}
        {field.type !== 'divider' && (
          <div>
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
              Label
            </label>
            <input
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'white',
              }}
            />
          </div>
        )}

        {/* Placeholder */}
        {!isLayout && (
          <div>
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
              Placeholder
            </label>
            <input
              value={field.placeholder ?? ''}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'white',
              }}
            />
          </div>
        )}

        {/* Required toggle */}
        {!isLayout && (
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              Required
            </span>
            <button
              onClick={() => onUpdate({ required: !field.required })}
              className="w-8 h-[18px] rounded-full transition-all relative"
              style={{
                background: field.required
                  ? 'rgba(21,173,112,0.3)'
                  : 'rgba(255,255,255,0.1)',
              }}
            >
              <span
                className="absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all"
                style={{
                  background: field.required ? '#15AD70' : 'rgba(255,255,255,0.3)',
                  left: field.required ? '16px' : '2px',
                }}
              />
            </button>
          </div>
        )}

        {/* Width toggle */}
        {!isLayout && (
          <div className="flex items-center justify-between">
            <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>
              Width
            </span>
            <div className="flex gap-1">
              {(['full', 'half'] as const).map((w) => (
                <button
                  key={w}
                  onClick={() => onUpdate({ width: w })}
                  className="text-[10px] px-2 py-1 rounded transition-all"
                  style={{
                    background:
                      field.width === w ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                    border:
                      field.width === w
                        ? '1px solid rgba(255,255,255,0.2)'
                        : '1px solid rgba(255,255,255,0.06)',
                    color: field.width === w ? 'white' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options (for select/multiselect) */}
        {(field.type === 'select' || field.type === 'multiselect') && (
          <div>
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
              Options
            </label>
            {(field.options ?? []).map((opt, i) => (
              <div key={i} className="flex items-center gap-1 mb-1">
                <input
                  value={opt}
                  onChange={(e) => {
                    const options = [...(field.options ?? [])];
                    options[i] = e.target.value;
                    onUpdate({ options });
                  }}
                  className="flex-1 text-xs font-light px-2 py-1.5 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                  }}
                />
                <button
                  onClick={() => {
                    const options = (field.options ?? []).filter((_, j) => j !== i);
                    onUpdate({ options });
                  }}
                  className="text-xs px-1 transition-colors hover:text-red-400"
                  style={{ color: 'var(--text-3)' }}
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const options = [
                  ...(field.options ?? []),
                  `Option ${(field.options ?? []).length + 1}`,
                ];
                onUpdate({ options });
              }}
              className="text-[10px] font-light mt-1"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              + Add option
            </button>
          </div>
        )}

        {/* Validation (for number) */}
        {field.type === 'number' && (
          <div>
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
              Validation
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  value={field.validation?.min ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        min: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="Min"
                  className="w-full text-xs font-light px-2 py-1.5 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                  }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  value={field.validation?.max ?? ''}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        max: e.target.value ? Number(e.target.value) : undefined,
                      },
                    })
                  }
                  placeholder="Max"
                  className="w-full text-xs font-light px-2 py-1.5 rounded-lg focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--glass-border)',
                    color: 'white',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Pattern validation (for text/email/url/phone) */}
        {['text', 'email', 'url', 'phone'].includes(field.type) && (
          <div>
            <label className="text-[10px] mb-1 block" style={{ color: 'var(--text-3)' }}>
              Regex pattern
            </label>
            <input
              value={field.validation?.pattern ?? ''}
              onChange={(e) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    pattern: e.target.value || undefined,
                  },
                })
              }
              placeholder="e.g. ^[A-Z].*"
              className="w-full text-xs font-light px-3 py-2 rounded-lg focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--glass-border)',
                color: 'white',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
