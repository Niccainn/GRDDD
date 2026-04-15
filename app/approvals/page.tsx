'use client';

import { useEffect, useState, useCallback } from 'react';
import RequestApproval from '@/components/RequestApproval';

type ApprovalStep = {
  order: number;
  approverId: string;
  approverName?: string;
  status: string;
  comment?: string;
  decidedAt?: string;
};

type Approval = {
  id: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string | null;
  status: string;
  priority: string;
  requesterId: string;
  requesterName: string;
  requesterAvatar: string | null;
  steps: ApprovalStep[];
  currentStep: number;
  dueDate: string | null;
  completedAt: string | null;
  environmentId: string;
  environmentName: string;
  createdAt: string;
  updatedAt: string;
};

type Tab = 'review' | 'requests' | 'all';

const STATUS_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending:            { bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.2)', text: '#7193ED', label: 'Pending' },
  approved:           { bg: 'rgba(21,173,112,0.08)',  border: 'rgba(21,173,112,0.2)',  text: '#15AD70', label: 'Approved' },
  rejected:           { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   text: '#EF4444', label: 'Rejected' },
  changes_requested:  { bg: 'rgba(234,179,8,0.08)',   border: 'rgba(234,179,8,0.2)',   text: '#EAB308', label: 'Changes Requested' },
};

const PRIORITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  low:    { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.4)' },
  normal: { bg: 'rgba(113,147,237,0.06)', border: 'rgba(113,147,237,0.15)', text: '#7193ED' },
  high:   { bg: 'rgba(245,158,11,0.06)', border: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  urgent: { bg: 'rgba(239,68,68,0.06)',  border: 'rgba(239,68,68,0.15)',  text: '#EF4444' },
};

const ENTITY_STYLES: Record<string, { bg: string; border: string; text: string }> = {
  expense:  { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)', text: '#F59E0B' },
  invoice:  { bg: 'rgba(21,173,112,0.08)', border: 'rgba(21,173,112,0.2)', text: '#15AD70' },
  design:   { bg: 'rgba(191,159,241,0.08)', border: 'rgba(191,159,241,0.2)', text: '#BF9FF1' },
  document: { bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.2)', text: '#7193ED' },
  task:     { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.2)',  text: '#3B82F6' },
  custom:   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.5)' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isOverdue(dueDate: string | null) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Approval chain stepper visualization
function ApprovalChain({ steps, currentStep, status }: { steps: ApprovalStep[]; currentStep: number; status: string }) {
  return (
    <div className="flex items-start gap-0 mt-4 overflow-x-auto pb-2">
      {steps.map((step, idx) => {
        let stepStatus: 'completed' | 'current' | 'pending' | 'rejected' = 'pending';
        if (step.status === 'approved') stepStatus = 'completed';
        else if (step.status === 'rejected') stepStatus = 'rejected';
        else if (step.status === 'changes_requested') stepStatus = 'rejected';
        else if (idx === currentStep && status === 'pending') stepStatus = 'current';

        const circleStyles = {
          completed: { bg: 'rgba(21,173,112,0.15)', border: '1px solid rgba(21,173,112,0.4)', color: '#15AD70' },
          current:   { bg: 'rgba(113,147,237,0.15)', border: '1px solid rgba(113,147,237,0.4)', color: '#7193ED' },
          pending:   { bg: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' },
          rejected:  { bg: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' },
        }[stepStatus];

        const lineColor = step.status === 'approved'
          ? 'rgba(21,173,112,0.3)'
          : 'rgba(255,255,255,0.08)';

        return (
          <div key={idx} className="flex items-start" style={{ minWidth: 'fit-content' }}>
            <div className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-light relative"
                style={{ background: circleStyles.bg, border: circleStyles.border, color: circleStyles.color }}
              >
                {stepStatus === 'completed' ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2.5 6l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : stepStatus === 'rejected' ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                ) : (
                  getInitials(step.approverName || `S${idx + 1}`)
                )}
                {stepStatus === 'current' && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: 'rgba(113,147,237,0.15)', animationDuration: '2s' }}
                  />
                )}
              </div>
              <span className="text-[9px] font-light mt-1.5 max-w-[60px] text-center truncate" style={{ color: circleStyles.color }}>
                {step.approverName || `Step ${idx + 1}`}
              </span>
              {step.comment && (
                <span
                  className="text-[9px] font-light mt-1 max-w-[80px] text-center italic"
                  style={{ color: 'var(--text-3)' }}
                >
                  &ldquo;{step.comment}&rdquo;
                </span>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div
                className="h-px mt-4 self-start"
                style={{ width: '32px', background: lineColor, flexShrink: 0 }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>('review');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const fetchApprovals = useCallback(async () => {
    try {
      const [me, all] = await Promise.all([
        fetch('/api/me').then(r => r.json()),
        fetch('/api/approvals').then(r => r.json()),
      ]);
      setUserId(me.id);
      setApprovals(Array.isArray(all) ? all : []);
      setLoaded(true);
    } catch {
      setLoaded(true);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  const getFiltered = useCallback(() => {
    let list = [...approvals];

    // Tab filter
    if (tab === 'review') {
      list = list.filter(a => {
        if (a.status !== 'pending') return false;
        const step = a.steps[a.currentStep];
        return step && step.approverId === userId;
      });
    } else if (tab === 'requests') {
      list = list.filter(a => a.requesterId === userId);
    }

    // Status filter
    if (statusFilter) {
      list = list.filter(a => a.status === statusFilter);
    }

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        a.title.toLowerCase().includes(q) ||
        a.requesterName.toLowerCase().includes(q) ||
        a.entityType.toLowerCase().includes(q)
      );
    }

    return list;
  }, [approvals, tab, statusFilter, search, userId]);

  const handleAction = useCallback(async (id: string, action: string) => {
    setActing(true);
    const res = await fetch(`/api/approvals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, comment }),
    });
    if (res.ok) {
      setActionId(null);
      setActionType(null);
      setComment('');
      await fetchApprovals();
    }
    setActing(false);
  }, [comment, fetchApprovals]);

  const startAction = useCallback((id: string, type: string) => {
    if (actionId === id && actionType === type) {
      setActionId(null);
      setActionType(null);
      setComment('');
    } else {
      setActionId(id);
      setActionType(type);
      setComment('');
    }
  }, [actionId, actionType]);

  const filtered = getFiltered();

  const tabs: { key: Tab; label: string; count: number }[] = [
    {
      key: 'review',
      label: 'Needs My Review',
      count: approvals.filter(a => {
        if (a.status !== 'pending') return false;
        const step = a.steps[a.currentStep];
        return step && step.approverId === userId;
      }).length,
    },
    {
      key: 'requests',
      label: 'My Requests',
      count: approvals.filter(a => a.requesterId === userId).length,
    },
    { key: 'all', label: 'All', count: approvals.length },
  ];

  const statuses = ['pending', 'approved', 'rejected', 'changes_requested'];

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>
            Approvals
          </h1>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            {loaded
              ? `${approvals.filter(a => a.status === 'pending').length} pending / ${approvals.length} total`
              : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-light px-4 py-2.5 rounded-xl transition-all"
          style={{ background: 'rgba(113,147,237,0.08)', border: '1px solid rgba(113,147,237,0.2)', color: '#7193ED' }}
        >
          + New request
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setStatusFilter(null); }}
            className="text-xs font-light px-4 py-2 rounded-xl transition-all"
            style={{
              background: tab === t.key ? 'rgba(255,255,255,0.06)' : 'transparent',
              border: `1px solid ${tab === t.key ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
              color: tab === t.key ? 'var(--text-1)' : 'var(--text-3)',
            }}
          >
            {t.label}
            {t.count > 0 && (
              <span
                className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-3)' }}
              >
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Status filter pills */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => setStatusFilter(null)}
          className="text-[11px] font-light px-3 py-1.5 rounded-full transition-all"
          style={{
            background: !statusFilter ? 'rgba(255,255,255,0.08)' : 'transparent',
            border: `1px solid ${!statusFilter ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
            color: !statusFilter ? 'var(--text-1)' : 'var(--text-3)',
          }}
        >
          All statuses
        </button>
        {statuses.map(s => {
          const style = STATUS_STYLES[s];
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(active ? null : s)}
              className="text-[11px] font-light px-3 py-1.5 rounded-full transition-all"
              style={{
                background: active ? style.bg : 'transparent',
                border: `1px solid ${active ? style.border : 'rgba(255,255,255,0.06)'}`,
                color: active ? style.text : 'var(--text-3)',
              }}
            >
              {style.label}
            </button>
          );
        })}

        {/* Search (for All tab) */}
        {tab === 'all' && (
          <div className="relative ml-auto">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="11" height="11" viewBox="0 0 12 12" fill="none">
              <circle cx="5" cy="5" r="3.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2"/>
              <path d="M8 8l2.5 2.5" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search approvals..."
              className="text-sm font-light pl-8 pr-4 py-2 rounded-xl focus:outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)', width: '200px' }}
            />
          </div>
        )}
      </div>

      {/* Approval cards */}
      {!loaded ? (
        <div className="text-center py-20">
          <div className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Loading approvals...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-sm font-light mb-2" style={{ color: 'var(--text-3)' }}>
            {tab === 'review' ? 'No approvals waiting for your review' :
             tab === 'requests' ? 'You have not submitted any approval requests' :
             'No approvals found'}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs font-light px-4 py-2 rounded-xl transition-all mt-2"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
          >
            Create your first approval request
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => {
            const statusStyle = STATUS_STYLES[a.status] ?? STATUS_STYLES.pending;
            const priorityStyle = PRIORITY_STYLES[a.priority] ?? PRIORITY_STYLES.normal;
            const entityStyle = ENTITY_STYLES[a.entityType] ?? ENTITY_STYLES.custom;
            const expanded = expandedId === a.id;
            const isReviewTab = tab === 'review';
            const overdue = a.status === 'pending' && isOverdue(a.dueDate);

            return (
              <div
                key={a.id}
                className="rounded-2xl transition-all"
                style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
              >
                {/* Card header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2">
                        <h3 className="text-sm font-light truncate" style={{ color: 'var(--text-1)' }}>
                          {a.title}
                        </h3>
                        <span
                          className="flex-shrink-0 text-[10px] font-light px-2 py-0.5 rounded-full"
                          style={{ background: statusStyle.bg, border: `1px solid ${statusStyle.border}`, color: statusStyle.text }}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        {/* Requester */}
                        <span className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
                          by {a.requesterName}
                        </span>
                        {/* Entity type badge */}
                        <span
                          className="text-[10px] font-light px-2 py-0.5 rounded-full"
                          style={{ background: entityStyle.bg, border: `1px solid ${entityStyle.border}`, color: entityStyle.text }}
                        >
                          {a.entityType}
                        </span>
                        {/* Priority badge */}
                        {a.priority !== 'normal' && (
                          <span
                            className="text-[10px] font-light px-2 py-0.5 rounded-full"
                            style={{ background: priorityStyle.bg, border: `1px solid ${priorityStyle.border}`, color: priorityStyle.text }}
                          >
                            {a.priority}
                          </span>
                        )}
                        {/* Submitted time */}
                        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                          {timeAgo(a.createdAt)}
                        </span>
                        {/* Due date */}
                        {a.dueDate && (
                          <span
                            className="text-[10px] font-light"
                            style={{ color: overdue ? '#EF4444' : 'var(--text-3)' }}
                          >
                            Due {new Date(a.dueDate).toLocaleDateString()}
                            {overdue && ' (overdue)'}
                          </span>
                        )}
                        {/* Current step indicator for My Requests tab */}
                        {tab === 'requests' && a.status === 'pending' && (
                          <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                            Step {a.currentStep + 1} of {a.steps.length}
                            {a.steps[a.currentStep]?.approverName &&
                              ` -- reviewing: ${a.steps[a.currentStep].approverName}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons for review tab */}
                    {isReviewTab && a.status === 'pending' && (
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => startAction(a.id, 'approved')}
                          className="text-[11px] font-light px-3 py-1.5 rounded-xl transition-all"
                          style={{
                            background: actionId === a.id && actionType === 'approved' ? 'rgba(21,173,112,0.2)' : 'rgba(21,173,112,0.08)',
                            border: '1px solid rgba(21,173,112,0.25)',
                            color: '#15AD70',
                          }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => startAction(a.id, 'rejected')}
                          className="text-[11px] font-light px-3 py-1.5 rounded-xl transition-all"
                          style={{
                            background: actionId === a.id && actionType === 'rejected' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.08)',
                            border: '1px solid rgba(239,68,68,0.25)',
                            color: '#EF4444',
                          }}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => startAction(a.id, 'changes_requested')}
                          className="text-[11px] font-light px-3 py-1.5 rounded-xl transition-all"
                          style={{
                            background: actionId === a.id && actionType === 'changes_requested' ? 'rgba(234,179,8,0.2)' : 'rgba(234,179,8,0.08)',
                            border: '1px solid rgba(234,179,8,0.25)',
                            color: '#EAB308',
                          }}
                        >
                          Request Changes
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Comment input when action selected */}
                  {actionId === a.id && actionType && (
                    <div className="mt-3 flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                        placeholder="Add a comment (optional)..."
                        className="flex-1 text-xs font-light px-3 py-2 rounded-xl focus:outline-none"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-1)' }}
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAction(a.id, actionType);
                          if (e.key === 'Escape') { setActionId(null); setActionType(null); setComment(''); }
                        }}
                      />
                      <button
                        onClick={() => handleAction(a.id, actionType)}
                        disabled={acting}
                        className="text-[11px] font-light px-3 py-2 rounded-xl transition-all disabled:opacity-40"
                        style={{
                          background: actionType === 'approved' ? 'rgba(21,173,112,0.15)' :
                                     actionType === 'rejected' ? 'rgba(239,68,68,0.15)' :
                                     'rgba(234,179,8,0.15)',
                          border: `1px solid ${
                            actionType === 'approved' ? 'rgba(21,173,112,0.3)' :
                            actionType === 'rejected' ? 'rgba(239,68,68,0.3)' :
                            'rgba(234,179,8,0.3)'
                          }`,
                          color: actionType === 'approved' ? '#15AD70' :
                                 actionType === 'rejected' ? '#EF4444' :
                                 '#EAB308',
                        }}
                      >
                        {acting ? '...' : 'Confirm'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {expanded && (
                  <div
                    className="px-5 pb-5 pt-0"
                    style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    {a.description && (
                      <p className="text-xs font-light mt-4 mb-3 leading-relaxed" style={{ color: 'var(--text-2)' }}>
                        {a.description}
                      </p>
                    )}

                    {/* Approval chain visualization */}
                    {a.steps.length > 0 && (
                      <div>
                        <span className="text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
                          Approval chain
                        </span>
                        <ApprovalChain steps={a.steps} currentStep={a.currentStep} status={a.status} />
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="flex items-center gap-4 mt-4">
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                        Environment: {a.environmentName}
                      </span>
                      {a.completedAt && (
                        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                          Completed {timeAgo(a.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <RequestApproval
          entityType="custom"
          onSubmit={fetchApprovals}
          onClose={() => setShowCreate(false)}
        />
      )}
    </div>
  );
}
