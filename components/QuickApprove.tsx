'use client';

import { useEffect, useState, useCallback } from 'react';

type ApprovalStep = {
  order: number;
  approverId: string;
  approverName?: string;
  status: string;
  comment?: string;
  decidedAt?: string;
};

type ApprovalData = {
  id: string;
  title: string;
  status: string;
  steps: ApprovalStep[];
  currentStep: number;
};

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending:            { bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.2)', text: '#7193ED', label: 'Pending' },
  approved:           { bg: 'rgba(200,242,107,0.08)',  border: 'rgba(200,242,107,0.2)',  text: '#C8F26B', label: 'Approved' },
  rejected:           { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#EF4444', label: 'Rejected' },
  changes_requested:  { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   text: '#EAB308', label: 'Changes Requested' },
};

export default function QuickApprove({
  entityType,
  entityId,
  compact = false,
}: {
  entityType: string;
  entityId: string;
  compact?: boolean;
}) {
  const [approval, setApproval] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [showRequest, setShowRequest] = useState(false);

  useEffect(() => {
    fetch('/api/me').then(r => r.json()).then(u => setUserId(u.id)).catch(() => {});

    fetch(`/api/approvals?type=${entityType}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const match = data.find((a: ApprovalData & { entityId?: string }) => a.entityId === entityId);
          if (match) setApproval(match);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [entityType, entityId]);

  const handleAction = useCallback(async (action: string) => {
    if (!approval) return;
    setActing(true);
    const res = await fetch(`/api/approvals/${approval.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setApproval(prev => prev ? { ...prev, status: updated.status, currentStep: updated.currentStep } : null);
    }
    setActing(false);
  }, [approval]);

  const handleCreateRequest = useCallback(async () => {
    setShowRequest(false);
    if (!userId) return;
    const res = await fetch('/api/approvals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: `Approval for ${entityType} ${entityId}`,
        entityType,
        entityId,
        steps: [{ approverId: userId, approverName: 'You' }],
        environmentId: '',
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setApproval({ id: data.id, title: data.title, status: data.status, steps: [], currentStep: 0 });
    }
  }, [entityType, entityId, userId]);

  if (loading) return null;

  const statusStyle = STATUS_STYLES[approval?.status ?? ''] ?? STATUS_STYLES.pending;
  const isCurrentApprover = approval && approval.status === 'pending' && userId &&
    approval.steps[approval.currentStep]?.approverId === userId;

  if (!approval) {
    return (
      <button
        onClick={() => compact ? handleCreateRequest() : setShowRequest(true)}
        className="text-xs font-light px-3 py-1.5 rounded-lg transition-all"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
      >
        Request approval
      </button>
    );
  }

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-light px-2 py-0.5 rounded-full"
          style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text }}
        >
          {statusStyle.label}
        </span>
        {isCurrentApprover && (
          <button
            onClick={() => handleAction('approved')}
            disabled={acting}
            className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all disabled:opacity-40"
            style={{ background: 'rgba(200,242,107,0.1)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}
          >
            Approve
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="p-3 rounded-xl"
      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
    >
      <div className="flex items-center justify-between">
        <span
          className="text-xs font-light px-2.5 py-1 rounded-full"
          style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text }}
        >
          {statusStyle.label}
        </span>
        {isCurrentApprover && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleAction('approved')}
              disabled={acting}
              className="text-xs font-light px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(200,242,107,0.1)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}
            >
              Approve
            </button>
            <button
              onClick={() => handleAction('rejected')}
              disabled={acting}
              className="text-xs font-light px-2.5 py-1 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#EF4444' }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
