'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { fetchObject } from '@/lib/api/safe-fetch';

type Author = { id: string; name: string; avatar: string | null };
type Reply = { id: string; body: string; createdAt: string; author: Author };
type Comment = { id: string; body: string; createdAt: string; author: Author; replies: Reply[] };

type CommentThreadProps = {
  entityType: string;
  entityId: string;
};

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function Avatar({ author }: { author: Author }) {
  const initials = author.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-medium flex-shrink-0"
      style={{ background: 'rgba(191,159,241,0.15)', color: '#BF9FF1', border: '1px solid rgba(191,159,241,0.2)' }}
    >
      {author.avatar ? (
        <Image src={author.avatar} alt="" width={28} height={28} className="w-full h-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </div>
  );
}

function CommentBubble({ comment, onReply, onDelete, currentUserId }: {
  comment: Comment | Reply;
  onReply?: () => void;
  onDelete: (id: string) => void;
  currentUserId: string;
}) {
  return (
    <div className="flex gap-2.5 group">
      <Avatar author={comment.author} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-1)' }}>{comment.author.name}</span>
          <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>{timeAgo(comment.createdAt)}</span>
          {comment.author.id === currentUserId && (
            <button
              onClick={() => onDelete(comment.id)}
              className="opacity-0 group-hover:opacity-100 text-[10px] transition-opacity"
              style={{ color: 'rgba(255,255,255,0.2)' }}
            >
              delete
            </button>
          )}
        </div>
        <p className="text-xs font-light leading-relaxed mt-0.5" style={{ color: 'var(--text-2)' }}>
          {comment.body}
        </p>
        {onReply && (
          <button
            onClick={onReply}
            className="text-[10px] mt-1 transition-all"
            style={{ color: 'rgba(191,159,241,0.5)' }}
          >
            Reply
          </button>
        )}
      </div>
    </div>
  );
}

export default function CommentThread({ entityType, entityId }: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState('');

  useEffect(() => {
    loadComments();
    fetchObject<{ id?: string }>('/api/me').then(d => setCurrentUserId(d?.id ?? ''));
  }, [entityType, entityId]);

  async function loadComments() {
    try {
      const res = await fetch(`/api/comments?entityType=${entityType}&entityId=${entityId}`);
      const data = await res.json();
      setComments(data.comments ?? []);
    } catch { /* ignore */ }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || posting) return;
    setPosting(true);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType,
          entityId,
          body: input.trim(),
          parentId: replyTo,
        }),
      });
      if (res.ok) {
        setInput('');
        setReplyTo(null);
        await loadComments();
      }
    } catch { /* ignore */ }
    setPosting(false);
  }

  async function handleDelete(id: string) {
    try {
      await fetch('/api/comments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await loadComments();
    } catch { /* ignore */ }
  }

  const replyComment = replyTo ? comments.find(c => c.id === replyTo) : null;

  return (
    <div className="mt-6">
      <h3 className="text-xs font-light mb-3 flex items-center gap-2" style={{ color: 'var(--text-3)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        COMMENTS
        {comments.length > 0 && <span style={{ color: 'rgba(255,255,255,0.15)' }}>{comments.length}</span>}
      </h3>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="space-y-4 mb-4">
          {comments.map(comment => (
            <div key={comment.id}>
              <CommentBubble
                comment={comment}
                onReply={() => setReplyTo(comment.id)}
                onDelete={handleDelete}
                currentUserId={currentUserId}
              />
              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-9 mt-2 space-y-3 pl-3" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
                  {comment.replies.map(reply => (
                    <CommentBubble
                      key={reply.id}
                      comment={reply}
                      onDelete={handleDelete}
                      currentUserId={currentUserId}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="relative">
        {replyTo && replyComment && (
          <div className="flex items-center gap-2 mb-1.5 text-[10px]" style={{ color: 'var(--text-3)' }}>
            <span>Replying to {replyComment.author.name}</span>
            <button type="button" onClick={() => setReplyTo(null)} style={{ color: 'rgba(255,255,255,0.2)' }}>
              cancel
            </button>
          </div>
        )}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={replyTo ? 'Write a reply...' : 'Add a comment... Use @name to mention'}
            disabled={posting}
            className="flex-1 text-xs font-light px-3 py-2.5 rounded-xl focus:outline-none"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'var(--text-1)',
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || posting}
            className="px-3 py-2.5 text-xs font-light rounded-xl transition-all disabled:opacity-30"
            style={{
              background: 'rgba(191,159,241,0.1)',
              border: '1px solid rgba(191,159,241,0.2)',
              color: '#BF9FF1',
            }}
          >
            {posting ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
