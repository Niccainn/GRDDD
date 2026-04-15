'use client';

import { useEffect, useState, useCallback } from 'react';

type StepDraft = {
  approverId: string;
  approverName: string;
};

type Environment = { id: string; name: string };

export default function RequestApproval({
  entityType,
  entityId,
  title: defaultTitle,
  onSubmit,
  onClose,
}: {
  entityType: string;
  entityId?: string;
  title?: string;
  onSubmit?: () => void;
  onClose: () => void;
}) {
  const [titleVal, setTitleVal] = useState(defaultTitle ?? '');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [dueDate, setDueDate] = useState('');
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [envId, setEnvId] = useState('');
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/me').then(r => r.json()),
      fetch('/api/environments').then(r => r.json()).catch(() => []),
    ]).then(([me, envs]) => {
      setUserId(me.id);
      setUserName(me.name);
      const envList = Array.isArray(envs) ? envs : [];
      setEnvironments(envList);
      if (envList.length > 0) setEnvId(envList[0].id);
      // Default first step to current user
      if (steps.length === 0) {
        setSteps([{ approverId: me.id, approverName: me.name }]);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStep = useCallback(() => {
    setSteps(prev => [...prev, { approverId: userId, approverName: userName }]);
  }, [userId, userName]);

  const removeStep = useCallback((idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const moveStep = useCallback((idx: number, dir: -1 | 1) => {
    setSteps(prev => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleVal.trim() || !envId || steps.length === 0) return;
    setSubmitting(true);

    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: titleVal.trim(),
        description,
        entityType,
        entityId: entityId ?? null,
        steps: steps.map(s => ({ approverId: s.approverId, approverName: s.approverName })),
        priority,
        dueDate: dueDate || null,
        environmentId: envId,
      }),
    });

    setSubmitting(false);
    if (res.ok) {
      onSubmit?.();
      onClose();
    }
  }, [titleVal, description, entityType, entityId, steps, priority, dueDate, envId, onSubmit, onClose]);

  const priorityOptions = [
    { value: 'low', label: 'Low', color: 'rgba(255,255,255,0.4)' },
    { value: 'normal', label: 'Normal', color: '#7193ED' },
    { value: 'high', label: 'High', color: '#F59E0B' },
    { value: 'urgent', label: 'Urgent', color: '#EF4444' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{ background: 'var(--glass-deep, rgba(10,10,15,0.95))', border: '1px solid var(--glass-border)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-extralight tracking-tight" style={{ color: 'var(--text-1)' }}>
            Request Approval
          </h2>
          <button
            onClick={onClose}
            className="text-xs font-light p-1 rounded-lg transition-colors"
            style={{ color: 'var(--text-3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Title</label>
            <input
              value={titleVal}
              onChange={e => setTitleVal(e.target.value)}
              placeholder="What needs approval?"
              className="w-full text-sm font-light px-3 py-2.5 rounded-xl focus:outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Additional context..."
              rows={3}
              className="w-full text-sm font-light px-3 py-2.5 rounded-xl focus:outline-none resize-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            />
          </div>

          {/* Priority + Due Date row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Priority</label>
              <div className="flex items-center gap-1">
                {priorityOptions.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className="text-[11px] font-light px-2.5 py-1.5 rounded-lg transition-all"
                    style={{
                      background: priority === p.value ? `${p.color}15` : 'transparent',
                      border: `1px solid ${priority === p.value ? `${p.color}40` : 'rgba(255,255,255,0.06)'}`,
                      color: priority === p.value ? p.color : 'var(--text-3)',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full text-sm font-light px-3 py-2 rounded-xl focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-1)', colorScheme: 'dark' }}
              />
            </div>
          </div>

          {/* Environment */}
          <div>
            <label className="text-xs font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>Environment</label>
            <select
              value={envId}
              onChange={e => setEnvId(e.target.value)}
              className="w-full text-sm font-light px-3 py-2.5 rounded-xl focus:outline-none appearance-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              {environments.map(env => (
                <option key={env.id} value={env.id} style={{ background: '#111' }}>{env.name}</option>
              ))}
            </select>
          </div>

          {/* Approval chain */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Approval chain</label>
              <button
                type="button"
                onClick={addStep}
                className="text-[11px] font-light px-2 py-1 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
              >
                + Add step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span
                    className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-light"
                    style={{ background: 'rgba(113,147,237,0.1)', border: '1px solid rgba(113,147,237,0.2)', color: '#7193ED' }}
                  >
                    {idx + 1}
                  </span>
                  <div className="flex-1">
                    <select
                      value={step.approverId}
                      onChange={e => {
                        const newSteps = [...steps];
                        newSteps[idx] = { ...newSteps[idx], approverId: e.target.value };
                        setSteps(newSteps);
                      }}
                      className="w-full text-xs font-light px-2 py-1.5 rounded-lg focus:outline-none appearance-none"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
                    >
                      <option value={userId} style={{ background: '#111' }}>{userName || 'Current user'}</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveStep(idx, -1)}
                      disabled={idx === 0}
                      className="p-1 rounded transition-all disabled:opacity-20"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 2L5 8M5 2L2 5M5 2L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStep(idx, 1)}
                      disabled={idx === steps.length - 1}
                      className="p-1 rounded transition-all disabled:opacity-20"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M5 8L5 2M5 8L2 5M5 8L8 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(idx)}
                        className="p-1 rounded transition-all"
                        style={{ color: 'rgba(239,68,68,0.5)' }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-light px-4 py-2.5 rounded-xl transition-all"
              style={{ color: 'var(--text-3)' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!titleVal.trim() || !envId || steps.length === 0 || submitting}
              className="text-xs font-light px-5 py-2.5 rounded-xl transition-all disabled:opacity-40"
              style={{ background: 'rgba(113,147,237,0.12)', border: '1px solid rgba(113,147,237,0.25)', color: '#7193ED' }}
            >
              {submitting ? 'Submitting...' : 'Submit for approval'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
