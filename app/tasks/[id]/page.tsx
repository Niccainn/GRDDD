'use client';

import { useEffect, useState, useCallback, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FileUpload from '@/components/FileUpload';
import AttachmentList from '@/components/AttachmentList';
import ConfirmDialog from '@/components/ConfirmDialog';

type TaskUser = { id: string; name: string; avatar: string | null };

type Comment = {
  id: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
};

type Subtask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignee: TaskUser | null;
  _count: { subtasks: number; comments: number };
};

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  completedAt: string | null;
  labels: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  creator: TaskUser;
  assignee: TaskUser | null;
  system: { id: string; name: string; color: string | null } | null;
  environment: { id: string; name: string; color: string | null };
  subtasks: Subtask[];
  comments: Comment[];
  _count: { subtasks: number; comments: number };
};

const STATUSES = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'CANCELLED'] as const;
const PRIORITIES = ['URGENT', 'HIGH', 'NORMAL', 'LOW'] as const;

const STATUS_LABEL: Record<string, string> = {
  BACKLOG: 'Backlog', TODO: 'To Do', IN_PROGRESS: 'In Progress', REVIEW: 'Review', DONE: 'Done', CANCELLED: 'Cancelled',
};
const STATUS_COLOR: Record<string, string> = {
  BACKLOG: 'rgba(255,255,255,0.2)', TODO: '#7193ED', IN_PROGRESS: '#BF9FF1', REVIEW: '#F7C700', DONE: '#15AD70', CANCELLED: 'rgba(255,255,255,0.15)',
};
const PRIORITY_COLOR: Record<string, string> = {
  URGENT: '#FF5757', HIGH: '#F7C700', NORMAL: 'rgba(255,255,255,0.3)', LOW: 'rgba(255,255,255,0.15)',
};
const PRIORITY_LABEL: Record<string, string> = {
  URGENT: 'Urgent', HIGH: 'High', NORMAL: 'Normal', LOW: 'Low',
};

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function Initials({ name, size = 24 }: { name: string; size?: number }) {
  const i = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: 'var(--brand-glow)', color: 'var(--brand)', border: '1px solid var(--brand-border)', fontSize: size * 0.4 }}>
      {i}
    </div>
  );
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [attachmentRefresh, setAttachmentRefresh] = useState(0);

  const load = useCallback(() => {
    fetch(`/api/tasks/${id}`).then(r => {
      if (!r.ok) { router.push('/tasks'); return null; }
      return r.json();
    }).then(d => {
      if (d) { setTask(d); setEditTitle(d.title); setEditDesc(d.description ?? ''); }
      setLoaded(true);
    });
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  async function update(data: Record<string, unknown>) {
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask(t => t ? { ...t, ...updated } : t);
    }
  }

  async function saveEdit() {
    await update({ title: editTitle, description: editDesc || null });
    setEditing(false);
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    await fetch(`/api/tasks/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: commentText }),
    });
    setCommentText('');
    setPosting(false);
    load();
  }

  async function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!subtaskTitle.trim() || !task) return;
    setAddingSubtask(true);
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: subtaskTitle,
        environmentId: task.environment.id,
        systemId: task.system?.id,
        parentId: id,
      }),
    });
    setSubtaskTitle('');
    setAddingSubtask(false);
    load();
  }

  async function deleteTask() {
    setDeleting(true);
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    router.push('/tasks');
  }

  async function toggleSubtask(subtaskId: string, currentStatus: string) {
    await fetch(`/api/tasks/${subtaskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: currentStatus === 'DONE' ? 'TODO' : 'DONE' }),
    });
    load();
  }

  if (!loaded) {
    return (
      <div className="px-10 py-10 min-h-screen">
        <div className="h-8 w-48 rounded-lg animate-pulse mb-4" style={{ background: 'var(--glass)' }} />
        <div className="h-64 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
      </div>
    );
  }

  if (!task) return null;

  const parsedLabels: string[] = task.labels ? JSON.parse(task.labels) : [];

  return (
    <div className="px-10 py-10 min-h-screen max-w-4xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <Link href="/tasks" className="text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
          Tasks
        </Link>
        <span style={{ color: 'var(--text-3)' }}>/</span>
        {task.parentId && (
          <>
            <Link href={`/tasks/${task.parentId}`} className="text-xs font-light transition-colors hover:text-white/60" style={{ color: 'var(--text-3)' }}>
              Parent
            </Link>
            <span style={{ color: 'var(--text-3)' }}>/</span>
          </>
        )}
        <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{task.title}</span>
      </div>

      <div className="grid grid-cols-3 gap-8">
        {/* Main content */}
        <div className="col-span-2 space-y-6">
          {/* Title + Description */}
          <div className="glass-deep rounded-xl p-6">
            {editing ? (
              <div className="space-y-3">
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full text-xl font-extralight px-0 py-1 bg-transparent focus:outline-none"
                  style={{ color: 'var(--text-1)', borderBottom: '1px solid var(--glass-border)' }} />
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  placeholder="Add a description..."
                  rows={4}
                  className="w-full text-sm font-light px-0 py-1 bg-transparent focus:outline-none resize-none"
                  style={{ color: 'var(--text-2)', borderBottom: '1px solid var(--glass-border)' }} />
                <div className="flex gap-2">
                  <button onClick={saveEdit} className="text-xs font-light px-3 py-1.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>Save</button>
                  <button onClick={() => setEditing(false)} className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div onClick={() => setEditing(true)} className="cursor-pointer group">
                <h1 className="text-xl font-extralight tracking-tight mb-2 group-hover:text-white/80 transition-colors"
                  style={{ color: task.status === 'DONE' ? 'var(--text-3)' : 'var(--text-1)', textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>
                  {task.title}
                </h1>
                {task.description ? (
                  <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{task.description}</p>
                ) : (
                  <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Click to add a description...</p>
                )}
              </div>
            )}
          </div>

          {/* Subtasks */}
          <div className="glass-deep rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs tracking-[0.1em]" style={{ color: 'var(--text-3)' }}>
                SUBTASKS ({task.subtasks.length})
              </p>
            </div>
            <div className="space-y-1.5 mb-3">
              {task.subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all hover:bg-white/[0.02]">
                  <button onClick={() => toggleSubtask(sub.id, sub.status)}
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{
                      border: `1.5px solid ${STATUS_COLOR[sub.status]}`,
                      background: sub.status === 'DONE' ? STATUS_COLOR['DONE'] : 'transparent',
                    }}>
                    {sub.status === 'DONE' && (
                      <svg width="7" height="7" viewBox="0 0 12 12" fill="none">
                        <path d="M3 6l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  <Link href={`/tasks/${sub.id}`} className="flex-1 text-sm font-light hover:underline"
                    style={{
                      color: sub.status === 'DONE' ? 'var(--text-3)' : 'var(--text-1)',
                      textDecoration: sub.status === 'DONE' ? 'line-through' : 'none',
                    }}>
                    {sub.title}
                  </Link>
                  {sub.assignee && <Initials name={sub.assignee.name} size={18} />}
                </div>
              ))}
            </div>
            <form onSubmit={addSubtask} className="flex gap-2">
              <input value={subtaskTitle} onChange={e => setSubtaskTitle(e.target.value)}
                placeholder="Add subtask..."
                className="flex-1 text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'white' }} />
              <button type="submit" disabled={!subtaskTitle.trim() || addingSubtask}
                className="text-xs font-light px-3 py-2 rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}>
                {addingSubtask ? '...' : 'Add'}
              </button>
            </form>
          </div>

          {/* Comments */}
          <div className="glass-deep rounded-xl p-5">
            <p className="text-xs tracking-[0.1em] mb-4" style={{ color: 'var(--text-3)' }}>
              ACTIVITY ({task.comments.length})
            </p>
            <div className="space-y-4 mb-4">
              {task.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Initials name={c.authorName} size={28} />
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-xs font-light" style={{ color: 'var(--text-1)' }}>{c.authorName}</span>
                      <span className="text-xs" style={{ color: 'var(--text-3)' }}>{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm font-light leading-relaxed" style={{ color: 'var(--text-2)' }}>{c.body}</p>
                  </div>
                </div>
              ))}
              {task.comments.length === 0 && (
                <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>No comments yet</p>
              )}
            </div>
            <form onSubmit={postComment} className="flex gap-2">
              <input value={commentText} onChange={e => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 text-sm font-light px-3 py-2.5 rounded-lg focus:outline-none"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'white' }} />
              <button type="submit" disabled={!commentText.trim() || posting}
                className="text-xs font-light px-4 py-2 rounded-lg disabled:opacity-30 transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
                {posting ? '...' : 'Post'}
              </button>
            </form>
          </div>

          {/* Attachments */}
          <div className="glass-deep rounded-xl p-5">
            <p className="text-xs tracking-[0.1em] mb-4" style={{ color: 'var(--text-3)' }}>
              ATTACHMENTS
            </p>
            <div className="space-y-3">
              <AttachmentList
                entityType="task"
                entityId={id}
                editable
                refreshKey={attachmentRefresh}
              />
              <FileUpload
                entityType="task"
                entityId={id}
                onUpload={() => setAttachmentRefresh(k => k + 1)}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <div className="glass-deep rounded-xl p-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Status</p>
            <div className="flex flex-wrap gap-1.5">
              {STATUSES.map(s => (
                <button key={s} onClick={() => update({ status: s })}
                  className="text-xs font-light px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    background: task.status === s ? `${STATUS_COLOR[s]}25` : 'rgba(255,255,255,0.03)',
                    color: task.status === s ? STATUS_COLOR[s] : 'var(--text-3)',
                    border: `1px solid ${task.status === s ? `${STATUS_COLOR[s]}40` : 'transparent'}`,
                  }}>
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div className="glass-deep rounded-xl p-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Priority</p>
            <div className="flex gap-1.5">
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => update({ priority: p })}
                  className="text-xs font-light px-2.5 py-1.5 rounded-lg transition-all"
                  style={{
                    background: task.priority === p ? `${PRIORITY_COLOR[p]}20` : 'rgba(255,255,255,0.03)',
                    color: task.priority === p ? PRIORITY_COLOR[p] : 'var(--text-3)',
                    border: `1px solid ${task.priority === p ? `${PRIORITY_COLOR[p]}35` : 'transparent'}`,
                  }}>
                  {PRIORITY_LABEL[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee */}
          <div className="glass-deep rounded-xl p-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Assignee</p>
            {task.assignee ? (
              <div className="flex items-center gap-2">
                <Initials name={task.assignee.name} size={24} />
                <span className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{task.assignee.name}</span>
                <button onClick={() => update({ assigneeId: null })} className="ml-auto text-xs" style={{ color: 'var(--text-3)' }}>x</button>
              </div>
            ) : (
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Unassigned</p>
            )}
          </div>

          {/* Due date */}
          <div className="glass-deep rounded-xl p-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Due date</p>
            <input type="date" value={task.dueDate ? task.dueDate.slice(0, 10) : ''}
              onChange={e => update({ dueDate: e.target.value || null })}
              className="w-full text-sm font-light px-2 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'rgba(255,255,255,0.6)', colorScheme: 'dark' }} />
          </div>

          {/* Environment + System */}
          <div className="glass-deep rounded-xl p-4">
            <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Environment</p>
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: task.environment.color ?? 'var(--text-3)' }} />
              <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>{task.environment.name}</span>
            </span>
            {task.system && (
              <div className="mt-2">
                <p className="text-xs mb-1" style={{ color: 'var(--text-3)' }}>System</p>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: task.system.color ?? 'var(--text-3)' }} />
                  <span className="text-sm font-light" style={{ color: 'var(--text-2)' }}>{task.system.name}</span>
                </span>
              </div>
            )}
          </div>

          {/* Labels */}
          {parsedLabels.length > 0 && (
            <div className="glass-deep rounded-xl p-4">
              <p className="text-xs mb-2" style={{ color: 'var(--text-3)' }}>Labels</p>
              <div className="flex flex-wrap gap-1.5">
                {parsedLabels.map((l: string) => (
                  <span key={l} className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', border: '1px solid var(--glass-border)' }}>
                    {l}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="glass-deep rounded-xl p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Created</span>
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{timeAgo(task.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>Creator</span>
              <span className="text-xs" style={{ color: 'var(--text-2)' }}>{task.creator.name}</span>
            </div>
            {task.completedAt && (
              <div className="flex justify-between">
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Completed</span>
                <span className="text-xs" style={{ color: '#15AD70' }}>{timeAgo(task.completedAt)}</span>
              </div>
            )}
          </div>

          {/* Delete */}
          <button onClick={() => setConfirmDeleteOpen(true)} disabled={deleting}
            className="w-full text-xs font-light py-2 rounded-lg transition-all"
            style={{ color: 'rgba(255,77,77,0.4)', border: '1px solid rgba(255,77,77,0.1)' }}>
            {deleting ? 'Deleting...' : 'Delete task'}
          </button>
          <ConfirmDialog
            open={confirmDeleteOpen}
            onConfirm={deleteTask}
            onCancel={() => setConfirmDeleteOpen(false)}
            title="Delete task?"
            message="This action cannot be undone."
            confirmLabel="Delete"
            variant="danger"
          />
        </div>
      </div>
    </div>
  );
}
