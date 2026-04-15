'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';

type Asset = {
  id: string;
  name: string;
  description: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  thumbnailPath: string | null;
  width: number | null;
  height: number | null;
  tags: string;
  category: string;
  version: number;
  parentId: string | null;
  environmentId: string;
  environment: { id: string; name: string };
  identity: { id: string; name: string };
  _count: { versions: number };
  createdAt: string;
  updatedAt: string;
};

type Env = { id: string; name: string };

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'illustration', label: 'Illustrations' },
  { value: 'photo', label: 'Photos' },
  { value: 'icon', label: 'Icons' },
  { value: 'logo', label: 'Logos' },
  { value: 'video', label: 'Videos' },
  { value: 'document', label: 'Documents' },
  { value: 'other', label: 'Other' },
];

const CATEGORY_COLORS: Record<string, string> = {
  illustration: '#BF9FF1',
  photo: '#7193ED',
  icon: '#15AD70',
  logo: '#F7C700',
  video: '#FF6B6B',
  document: '#4DB8DB',
  other: 'rgba(255,255,255,0.3)',
  uncategorized: 'rgba(255,255,255,0.3)',
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function parseTags(tagsStr: string): string[] {
  try {
    return JSON.parse(tagsStr);
  } catch {
    return [];
  }
}

function isImage(mime: string) {
  return mime.startsWith('image/');
}

function isVideo(mime: string) {
  return mime.startsWith('video/');
}

function FileTypeIcon({ mimeType, size = 48 }: { mimeType: string; size?: number }) {
  const color = 'var(--text-3)';
  if (isImage(mimeType)) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="1.2">
        <rect x="6" y="8" width="36" height="32" rx="4" />
        <circle cx="16" cy="18" r="3" />
        <path d="M6 32l10-8 7 5 9-9 10 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (isVideo(mimeType)) {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="1.2">
        <rect x="6" y="10" width="36" height="28" rx="4" />
        <polygon points="20,17 32,24 20,31" fill={color} stroke="none" />
      </svg>
    );
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="1.2">
        <path d="M12 4h16l10 10v28a4 4 0 01-4 4H12a4 4 0 01-4-4V8a4 4 0 014-4z" />
        <path d="M28 4v10h10" strokeLinecap="round" />
        <text x="14" y="34" fill={color} fontSize="10" fontFamily="sans-serif" stroke="none">PDF</text>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M12 4h16l10 10v28a4 4 0 01-4 4H12a4 4 0 01-4-4V8a4 4 0 014-4z" />
      <path d="M28 4v10h10" strokeLinecap="round" />
      <path d="M16 24h16M16 30h10" strokeLinecap="round" />
    </svg>
  );
}

// ---- Upload Modal ----
function UploadModal({
  environments,
  onClose,
  onUploaded,
}: {
  environments: Env[];
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [envId, setEnvId] = useState(environments[0]?.id || '');
  const [category, setCategory] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (newFiles: FileList | File[]) => {
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
  };

  const removeFile = (idx: number) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpload = async () => {
    if (!files.length || !envId) return;
    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const key = `${file.name}-${i}`;
      setProgress(prev => ({ ...prev, [key]: 10 }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('environmentId', envId);
      if (category) formData.append('category', category);
      if (tagsInput) formData.append('tags', tagsInput);

      const interval = setInterval(() => {
        setProgress(prev => ({ ...prev, [key]: Math.min((prev[key] || 10) + 8, 90) }));
      }, 100);

      try {
        const res = await fetch('/api/assets', { method: 'POST', body: formData });
        clearInterval(interval);
        if (res.ok) {
          setProgress(prev => ({ ...prev, [key]: 100 }));
        } else {
          setProgress(prev => ({ ...prev, [key]: -1 }));
        }
      } catch {
        clearInterval(interval);
        setProgress(prev => ({ ...prev, [key]: -1 }));
      }
    }

    setUploading(false);
    onUploaded();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
      <div
        className="rounded-2xl p-6 w-full max-w-lg"
        style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-light" style={{ color: 'var(--text-1)' }}>Upload Assets</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: 'var(--text-3)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M4 4l8 8M12 4l-8 8" />
            </svg>
          </button>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
          className="rounded-xl p-8 text-center cursor-pointer transition-all duration-200 mb-4"
          style={{
            border: `1.5px dashed ${dragging ? 'rgba(113,147,237,0.6)' : 'var(--glass-border)'}`,
            background: dragging ? 'rgba(113,147,237,0.06)' : 'var(--glass)',
          }}
        >
          <input ref={inputRef} type="file" multiple onChange={e => e.target.files && addFiles(e.target.files)} className="hidden" />
          <div className="flex justify-center mb-2" style={{ color: 'var(--text-3)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>Drop files here or click to browse</p>
          <p className="text-xs font-light mt-1" style={{ color: 'var(--text-3)' }}>Images, videos, documents -- up to 50MB each</p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
            {files.map((f, i) => {
              const key = `${f.name}-${i}`;
              const p = progress[key];
              return (
                <div key={key} className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'var(--glass)' }}>
                  <span className="text-xs font-light truncate flex-1" style={{ color: 'var(--text-2)' }}>{f.name}</span>
                  <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>{formatSize(f.size)}</span>
                  {p !== undefined && p > 0 && p <= 100 && (
                    <div className="w-16 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${p}%`, background: p === 100 ? '#15AD70' : 'rgba(113,147,237,0.6)' }} />
                    </div>
                  )}
                  {p === -1 && <span className="text-xs" style={{ color: '#FF6B6B' }}>Failed</span>}
                  {!uploading && (
                    <button onClick={() => removeFile(i)} className="text-xs" style={{ color: 'var(--text-3)' }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M3 3l6 6M9 3l-6 6" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Options */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-light mb-1" style={{ color: 'var(--text-3)' }}>Environment</label>
            <select
              value={envId}
              onChange={e => setEnvId(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs font-light outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              {environments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-light mb-1" style={{ color: 'var(--text-3)' }}>Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs font-light outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              <option value="">Auto-detect</option>
              {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs font-light mb-1" style={{ color: 'var(--text-3)' }}>Tags (comma-separated)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={e => setTagsInput(e.target.value)}
            placeholder="brand, hero, campaign-q1"
            className="w-full rounded-lg px-3 py-2 text-xs font-light outline-none"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-light transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-2)', border: '1px solid var(--glass-border)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!files.length || !envId || uploading}
            className="px-4 py-2 rounded-xl text-xs font-light transition-all"
            style={{
              background: files.length ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.03)',
              color: files.length ? '#7193ED' : 'var(--text-3)',
              border: `1px solid ${files.length ? 'rgba(113,147,237,0.3)' : 'var(--glass-border)'}`,
            }}
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function AssetLibraryPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [environments, setEnvironments] = useState<Env[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [envFilter, setEnvFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showUpload, setShowUpload] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [activeTag, setActiveTag] = useState('');
  const [sortCol, setSortCol] = useState<'name' | 'size' | 'createdAt'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (envFilter) params.set('envId', envFilter);
    if (categoryFilter !== 'all') params.set('category', categoryFilter);
    if (search) params.set('q', search);
    if (activeTag) params.set('tags', activeTag);
    params.set('limit', '200');

    fetch(`/api/assets?${params}`)
      .then(r => r.json())
      .then(d => {
        setAssets(d.assets || []);
        setLoaded(true);
        // Collect all unique tags
        const tagSet = new Set<string>();
        (d.assets || []).forEach((a: Asset) => {
          parseTags(a.tags).forEach(t => tagSet.add(t));
        });
        setAllTags(Array.from(tagSet).sort());
      })
      .catch(() => setLoaded(true));
  }, [envFilter, categoryFilter, search, activeTag]);

  useEffect(() => {
    load();
    fetch('/api/environments').then(r => r.json()).then(setEnvironments).catch(() => {});
  }, [load]);

  // Apply type filter locally
  let filtered = assets;
  if (typeFilter === 'images') filtered = filtered.filter(a => isImage(a.mimeType));
  else if (typeFilter === 'videos') filtered = filtered.filter(a => isVideo(a.mimeType));
  else if (typeFilter === 'documents') filtered = filtered.filter(a => !isImage(a.mimeType) && !isVideo(a.mimeType));

  // Sort for list view
  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
    else if (sortCol === 'size') cmp = a.size - b.size;
    else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const toggleSort = (col: typeof sortCol) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this asset and all its versions?')) return;
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-tight" style={{ color: 'var(--text-1)' }}>
            Asset Library
          </h1>
          <p className="text-xs font-light mt-1" style={{ color: 'var(--text-3)' }}>
            {filtered.length} asset{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2.5 rounded-xl text-xs font-light flex items-center gap-2 transition-all"
          style={{
            background: 'rgba(113,147,237,0.12)',
            color: '#7193ED',
            border: '1px solid rgba(113,147,237,0.25)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M7 2v10M2 7h10" />
          </svg>
          Upload
        </button>
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="var(--text-3)" strokeWidth="1.2" strokeLinecap="round">
            <circle cx="6" cy="6" r="4.5" />
            <path d="M9.5 9.5L13 13" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full rounded-xl pl-9 pr-4 py-2.5 text-xs font-light outline-none transition-all"
            style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
          />
        </div>
        <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--glass-border)' }}>
          <button
            onClick={() => setView('grid')}
            className="px-3 py-2 transition-all"
            style={{ background: view === 'grid' ? 'rgba(113,147,237,0.12)' : 'var(--glass)', color: view === 'grid' ? '#7193ED' : 'var(--text-3)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2">
              <rect x="1" y="1" width="5" height="5" rx="1" />
              <rect x="8" y="1" width="5" height="5" rx="1" />
              <rect x="1" y="8" width="5" height="5" rx="1" />
              <rect x="8" y="8" width="5" height="5" rx="1" />
            </svg>
          </button>
          <button
            onClick={() => setView('list')}
            className="px-3 py-2 transition-all"
            style={{ background: view === 'list' ? 'rgba(113,147,237,0.12)' : 'var(--glass)', color: view === 'list' ? '#7193ED' : 'var(--text-3)', borderLeft: '1px solid var(--glass-border)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
              <path d="M1 3h12M1 7h12M1 11h12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar Filters */}
        <div className="w-[200px] shrink-0 space-y-6">
          {/* Category */}
          <div>
            <p className="text-[10px] font-light uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Category</p>
            <div className="space-y-0.5">
              {CATEGORIES.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCategoryFilter(c.value)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-light transition-all flex items-center gap-2"
                  style={{
                    background: categoryFilter === c.value ? 'rgba(113,147,237,0.08)' : 'transparent',
                    color: categoryFilter === c.value ? '#7193ED' : 'var(--text-2)',
                  }}
                >
                  {c.value !== 'all' && (
                    <span className="w-2 h-2 rounded-full" style={{ background: CATEGORY_COLORS[c.value] || 'var(--text-3)' }} />
                  )}
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Environment */}
          <div>
            <p className="text-[10px] font-light uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Environment</p>
            <select
              value={envFilter}
              onChange={e => setEnvFilter(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-xs font-light outline-none"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
            >
              <option value="">All environments</option>
              {environments.map(e => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>

          {/* File Type */}
          <div>
            <p className="text-[10px] font-light uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>File Type</p>
            <div className="space-y-0.5">
              {['all', 'images', 'videos', 'documents'].map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-light transition-all"
                  style={{
                    background: typeFilter === t ? 'rgba(113,147,237,0.08)' : 'transparent',
                    color: typeFilter === t ? '#7193ED' : 'var(--text-2)',
                  }}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Tag Cloud */}
          {allTags.length > 0 && (
            <div>
              <p className="text-[10px] font-light uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map(t => (
                  <button
                    key={t}
                    onClick={() => setActiveTag(activeTag === t ? '' : t)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-light transition-all"
                    style={{
                      background: activeTag === t ? 'rgba(113,147,237,0.15)' : 'rgba(255,255,255,0.04)',
                      color: activeTag === t ? '#7193ED' : 'var(--text-3)',
                      border: `1px solid ${activeTag === t ? 'rgba(113,147,237,0.3)' : 'var(--glass-border)'}`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {!loaded ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border border-white/10 border-t-white/30 rounded-full animate-spin" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>No assets found</p>
              <button
                onClick={() => setShowUpload(true)}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-light transition-all"
                style={{ background: 'rgba(113,147,237,0.12)', color: '#7193ED', border: '1px solid rgba(113,147,237,0.25)' }}
              >
                Upload your first asset
              </button>
            </div>
          ) : view === 'grid' ? (
            /* Grid View */
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sorted.map(asset => (
                <Link
                  key={asset.id}
                  href={`/assets/${asset.id}`}
                  className="group rounded-2xl overflow-hidden transition-all duration-200 hover:scale-[1.02]"
                  style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}
                >
                  {/* Preview */}
                  <div className="relative aspect-square flex items-center justify-center overflow-hidden" style={{ background: 'rgba(0,0,0,0.2)' }}>
                    {isImage(asset.mimeType) ? (
                      <img
                        src={asset.path}
                        alt={asset.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : isVideo(asset.mimeType) ? (
                      <video src={asset.path} className="w-full h-full object-cover" muted preload="metadata" />
                    ) : (
                      <FileTypeIcon mimeType={asset.mimeType} size={64} />
                    )}
                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
                    >
                      <span className="px-3 py-1.5 rounded-lg text-xs font-light" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--text-1)' }}>View</span>
                      {asset._count.versions > 0 && (
                        <span className="px-2 py-1 rounded-full text-[10px] font-light" style={{ background: 'rgba(113,147,237,0.2)', color: '#7193ED' }}>
                          v{asset.version} + {asset._count.versions}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    <p className="text-xs font-light truncate" style={{ color: 'var(--text-1)' }}>{asset.name}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-light"
                        style={{ background: `${CATEGORY_COLORS[asset.category] || 'rgba(255,255,255,0.1)'}20`, color: CATEGORY_COLORS[asset.category] || 'var(--text-3)' }}
                      >
                        {asset.category}
                      </span>
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{formatSize(asset.size)}</span>
                      {asset.width && asset.height && (
                        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{asset.width}x{asset.height}</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            /* List View */
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}>
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                    <th className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Preview</th>
                    <th
                      className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: 'var(--text-3)' }}
                      onClick={() => toggleSort('name')}
                    >
                      Name {sortCol === 'name' && (sortDir === 'asc' ? '/' : '\\')}
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Category</th>
                    <th className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Tags</th>
                    <th
                      className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: 'var(--text-3)' }}
                      onClick={() => toggleSort('size')}
                    >
                      Size {sortCol === 'size' && (sortDir === 'asc' ? '/' : '\\')}
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Dims</th>
                    <th
                      className="text-left px-4 py-3 text-[10px] font-light uppercase tracking-wider cursor-pointer select-none"
                      style={{ color: 'var(--text-3)' }}
                      onClick={() => toggleSort('createdAt')}
                    >
                      Uploaded {sortCol === 'createdAt' && (sortDir === 'asc' ? '/' : '\\')}
                    </th>
                    <th className="text-right px-4 py-3 text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(asset => (
                    <tr key={asset.id} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td className="px-4 py-2.5">
                        <Link href={`/assets/${asset.id}`}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.2)' }}>
                            {isImage(asset.mimeType) ? (
                              <Image src={asset.path} alt="" width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <FileTypeIcon mimeType={asset.mimeType} size={24} />
                            )}
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/assets/${asset.id}`} className="text-xs font-light hover:underline" style={{ color: 'var(--text-1)' }}>{asset.name}</Link>
                        <p className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{asset.filename}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="px-1.5 py-0.5 rounded text-[9px] font-light"
                          style={{ background: `${CATEGORY_COLORS[asset.category] || 'rgba(255,255,255,0.1)'}20`, color: CATEGORY_COLORS[asset.category] || 'var(--text-3)' }}
                        >
                          {asset.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {parseTags(asset.tags).map(t => (
                            <span key={t} className="px-1.5 py-0.5 rounded-full text-[9px] font-light" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-3)', border: '1px solid var(--glass-border)' }}>{t}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs font-light" style={{ color: 'var(--text-2)' }}>{formatSize(asset.size)}</td>
                      <td className="px-4 py-2.5 text-xs font-light" style={{ color: 'var(--text-3)' }}>
                        {asset.width && asset.height ? `${asset.width}x${asset.height}` : '--'}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-light" style={{ color: 'var(--text-3)' }}>
                        {new Date(asset.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={asset.path}
                            download={asset.filename}
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                            style={{ color: 'var(--text-3)' }}
                            title="Download"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                              <path d="M6 1v8M3 6l3 3 3-3" />
                              <path d="M1 10h10" />
                            </svg>
                          </a>
                          <button
                            onClick={() => handleDelete(asset.id)}
                            className="p-1.5 rounded-lg transition-colors hover:bg-white/5"
                            style={{ color: 'var(--text-3)' }}
                            title="Delete"
                          >
                            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                              <path d="M2 3h8M4 3V2h4v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <UploadModal
          environments={environments}
          onClose={() => setShowUpload(false)}
          onUploaded={() => { setShowUpload(false); load(); }}
        />
      )}
    </div>
  );
}
