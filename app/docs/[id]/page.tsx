'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { renderMarkdown, countWords } from '@/lib/markdown';

type DocDetail = {
  id: string;
  title: string;
  content: string;
  icon: string | null;
  coverImage: string | null;
  isArchived: boolean;
  parentId: string | null;
  environmentId: string;
  identityId: string;
  createdAt: string;
  updatedAt: string;
  environment: { id: string; name: string; slug: string; color: string | null };
  parent: { id: string; title: string; icon: string | null } | null;
  children: { id: string; title: string; icon: string | null; updatedAt: string }[];
};

type ViewMode = 'edit' | 'preview' | 'split';

const DOC_ICONS = [
  '\u{1F4C4}', '\u{1F4DD}', '\u{1F4D3}', '\u{1F4D6}', '\u{1F4CB}',
  '\u{1F4CC}', '\u{1F4CE}', '\u{1F4D0}', '\u{1F4DA}', '\u{1F4D1}',
  '\u{2B50}', '\u{1F4A1}', '\u{1F680}', '\u{1F3AF}', '\u{2699}',
  '\u{1F4CA}', '\u{1F50D}', '\u{1F512}', '\u{2764}', '\u{26A1}',
];

export default function DocEditorPage() {
  const router = useRouter();
  const params = useParams();
  const docId = params.id as string;

  const [doc, setDoc] = useState<DocDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle');
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [showIconPicker, setShowIconPicker] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/docs/${docId}`);
      if (!res.ok) {
        router.push('/docs');
        return;
      }
      const data = await res.json();
      setDoc(data);
      setContent(data.content);
      setTitle(data.title);
      setLoading(false);
    } catch {
      router.push('/docs');
    }
  }, [docId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (updates: Record<string, unknown>) => {
    setSaveStatus('saving');
    try {
      await fetch(`/api/docs/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('idle');
    }
  }, [docId]);

  const handleContentChange = (value: string) => {
    setContent(value);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      save({ content: value });
    }, 1000);
  };

  const handleTitleBlur = () => {
    const newTitle = titleRef.current?.textContent || 'Untitled';
    if (newTitle !== doc?.title) {
      setTitle(newTitle);
      save({ title: newTitle });
    }
  };

  const handleIconSelect = (icon: string) => {
    setShowIconPicker(false);
    setDoc(prev => prev ? { ...prev, icon } : prev);
    save({ icon });
  };

  const createSubPage = async () => {
    if (!doc) return;
    const res = await fetch('/api/docs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environmentId: doc.environmentId, parentId: doc.id }),
    });
    if (res.ok) {
      const newDoc = await res.json();
      router.push(`/docs/${newDoc.id}`);
    }
  };

  const words = countWords(content);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--glass-border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!doc) return null;

  const renderedHtml = renderMarkdown(content);

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-30 px-6 py-3 flex items-center justify-between"
        style={{ background: 'rgba(8,8,12,0.85)', backdropFilter: 'blur(40px)', borderBottom: '1px solid var(--glass-border)' }}>
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm font-light min-w-0">
          <Link href="/docs" className="transition-colors" style={{ color: 'var(--text-3)' }}>
            Documents
          </Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <Link href={`/environments/${doc.environment.slug}`} className="transition-colors truncate" style={{ color: 'var(--text-3)' }}>
            {doc.environment.name}
          </Link>
          {doc.parent && (
            <>
              <span style={{ color: 'var(--text-3)' }}>/</span>
              <Link href={`/docs/${doc.parent.id}`} className="transition-colors truncate" style={{ color: 'var(--text-3)' }}>
                {doc.parent.icon || '\u{1F4C4}'} {doc.parent.title}
              </Link>
            </>
          )}
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span className="truncate" style={{ color: 'var(--text-2)' }}>
            {title}
          </span>
        </div>

        {/* Save status + view toggle */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : ''}
          </span>
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
            {(['edit', 'split', 'preview'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className="px-3 py-1.5 text-xs font-light capitalize transition-all"
                style={{
                  background: viewMode === mode ? 'var(--glass-deep)' : 'transparent',
                  color: viewMode === mode ? 'var(--text-1)' : 'var(--text-3)',
                }}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Main editor area */}
        <div className="flex-1 max-w-4xl mx-auto px-6 md:px-12 py-8">
          {/* Icon + Title */}
          <div className="mb-8">
            <div className="relative inline-block mb-3">
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="text-4xl p-2 rounded-xl transition-all"
                style={{ background: showIconPicker ? 'var(--glass)' : 'transparent' }}
                title="Change icon"
              >
                {doc.icon || '\u{1F4C4}'}
              </button>
              {showIconPicker && (
                <div
                  className="absolute left-0 top-full mt-2 z-50 rounded-2xl p-3 grid grid-cols-5 gap-1"
                  style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(40px)' }}
                >
                  {DOC_ICONS.map(icon => (
                    <button
                      key={icon}
                      onClick={() => handleIconSelect(icon)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all"
                      style={{ background: 'transparent' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div
              ref={titleRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={handleTitleBlur}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); titleRef.current?.blur(); } }}
              className="text-4xl font-light tracking-wide outline-none"
              style={{ color: 'var(--text-1)', minHeight: '1.2em' }}
            >
              {title}
            </div>
          </div>

          {/* Editor / Preview */}
          {viewMode === 'split' ? (
            <div className="grid grid-cols-2 gap-6">
              <div>
                <textarea
                  value={content}
                  onChange={e => handleContentChange(e.target.value)}
                  placeholder="Start writing in markdown..."
                  className="w-full min-h-[60vh] resize-none outline-none text-sm font-light leading-relaxed"
                  style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    padding: '20px',
                    color: 'var(--text-1)',
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
                  }}
                />
              </div>
              <div
                className="min-h-[60vh] text-sm leading-relaxed prose-custom"
                style={{
                  background: 'var(--glass)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '16px',
                  padding: '20px',
                  color: 'var(--text-2)',
                  overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: renderedHtml }}
              />
            </div>
          ) : viewMode === 'preview' ? (
            <div
              className="min-h-[60vh] text-sm leading-relaxed prose-custom"
              style={{
                color: 'var(--text-2)',
              }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          ) : (
            <textarea
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              placeholder="Start writing in markdown..."
              className="w-full min-h-[60vh] resize-none outline-none text-sm font-light leading-relaxed"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-1)',
                fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
              }}
            />
          )}

          {/* Bottom bar */}
          <div className="flex items-center justify-between mt-6 pt-4" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              {words} word{words !== 1 ? 's' : ''}
            </span>
            <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              Markdown supported
            </span>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="hidden lg:block w-72 flex-shrink-0 p-6">
          <div className="sticky top-20 space-y-6">
            {/* Doc info */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <h3 className="text-xs font-light tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>
                DOCUMENT INFO
              </h3>
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs font-light">
                  <span style={{ color: 'var(--text-3)' }}>Environment</span>
                  <Link href={`/environments/${doc.environment.slug}`} style={{ color: 'var(--text-2)' }}>
                    {doc.environment.name}
                  </Link>
                </div>
                <div className="flex justify-between text-xs font-light">
                  <span style={{ color: 'var(--text-3)' }}>Created</span>
                  <span style={{ color: 'var(--text-2)' }}>{new Date(doc.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs font-light">
                  <span style={{ color: 'var(--text-3)' }}>Updated</span>
                  <span style={{ color: 'var(--text-2)' }}>{new Date(doc.updatedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-xs font-light">
                  <span style={{ color: 'var(--text-3)' }}>Words</span>
                  <span style={{ color: 'var(--text-2)' }}>{words}</span>
                </div>
              </div>
            </div>

            {/* Sub-pages */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-light tracking-wider" style={{ color: 'var(--text-3)' }}>
                  SUB-PAGES
                </h3>
                <button
                  onClick={createSubPage}
                  className="text-xs font-light px-2 py-1 rounded-lg transition-all"
                  style={{ color: 'var(--text-3)', background: 'var(--glass-deep)' }}
                >
                  + Add
                </button>
              </div>
              {doc.children.length === 0 ? (
                <p className="text-xs font-light" style={{ color: 'var(--text-3)', opacity: 0.5 }}>
                  No sub-pages yet
                </p>
              ) : (
                <div className="space-y-1">
                  {doc.children.map(child => (
                    <Link
                      key={child.id}
                      href={`/docs/${child.id}`}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-light transition-all"
                      style={{ color: 'var(--text-2)' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-deep)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <span>{child.icon || '\u{1F4C4}'}</span>
                      <span className="truncate">{child.title}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="rounded-2xl p-4" style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <button
                onClick={() => router.push('/docs')}
                className="w-full text-left px-2 py-1.5 rounded-lg text-xs font-light transition-all"
                style={{ color: 'var(--text-3)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--glass-deep)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                Back to all documents
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Click-away for icon picker */}
      {showIconPicker && (
        <div className="fixed inset-0 z-40" onClick={() => setShowIconPicker(false)} />
      )}

      {/* Prose styles for rendered markdown */}
      <style jsx global>{`
        .prose-custom h1 { font-size: 1.75rem; font-weight: 300; margin: 1.5rem 0 0.75rem; color: var(--text-1); }
        .prose-custom h2 { font-size: 1.35rem; font-weight: 300; margin: 1.25rem 0 0.5rem; color: var(--text-1); }
        .prose-custom h3 { font-size: 1.1rem; font-weight: 300; margin: 1rem 0 0.5rem; color: var(--text-1); }
        .prose-custom p { margin: 0.5rem 0; }
        .prose-custom ul, .prose-custom ol { padding-left: 1.5rem; margin: 0.5rem 0; }
        .prose-custom li { margin: 0.25rem 0; }
        .prose-custom ul { list-style-type: disc; }
        .prose-custom ol { list-style-type: decimal; }
        .prose-custom blockquote {
          border-left: 2px solid var(--glass-border);
          padding-left: 1rem;
          margin: 0.75rem 0;
          color: var(--text-3);
          font-style: italic;
        }
        .prose-custom pre {
          background: var(--glass-deep);
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 1rem;
          overflow-x: auto;
          margin: 0.75rem 0;
        }
        .prose-custom code {
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
          font-size: 0.85em;
        }
        .prose-custom p code, .prose-custom li code {
          background: var(--glass-deep);
          padding: 0.15rem 0.4rem;
          border-radius: 4px;
          font-size: 0.85em;
        }
        .prose-custom a {
          color: var(--brand, #7193ED);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .prose-custom hr {
          border: none;
          border-top: 1px solid var(--glass-border);
          margin: 1.5rem 0;
        }
        .prose-custom strong { font-weight: 500; color: var(--text-1); }
        .prose-custom em { font-style: italic; }
      `}</style>
    </div>
  );
}
