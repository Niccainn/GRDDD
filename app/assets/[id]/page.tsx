'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

type AssetVersion = {
  id: string;
  name: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  version: number;
  createdAt: string;
  identity: { id: string; name: string };
};

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
  versions: AssetVersion[];
  _count: { versions: number };
  createdAt: string;
  updatedAt: string;
};

const CATEGORIES = ['illustration', 'photo', 'icon', 'logo', 'video', 'document', 'other'];

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

function isImage(mime: string) { return mime.startsWith('image/'); }
function isVideo(mime: string) { return mime.startsWith('video/'); }

function FileTypeIcon({ mimeType, size = 80 }: { mimeType: string; size?: number }) {
  const color = 'var(--text-3)';
  if (isVideo(mimeType)) {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" stroke={color} strokeWidth="1.2">
        <rect x="10" y="16" width="60" height="48" rx="6" />
        <polygon points="33,28 55,40 33,52" fill={color} stroke="none" />
      </svg>
    );
  }
  if (mimeType === 'application/pdf') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" stroke={color} strokeWidth="1.2">
        <path d="M20 8h26l16 16v46a6 6 0 01-6 6H20a6 6 0 01-6-6V14a6 6 0 016-6z" />
        <path d="M46 8v16h16" strokeLinecap="round" />
        <text x="22" y="54" fill={color} fontSize="16" fontFamily="sans-serif" stroke="none">PDF</text>
      </svg>
    );
  }
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" stroke={color} strokeWidth="1.2">
      <path d="M20 8h26l16 16v46a6 6 0 01-6 6H20a6 6 0 01-6-6V14a6 6 0 016-6z" />
      <path d="M46 8v16h16" strokeLinecap="round" />
      <path d="M26 40h28M26 50h18" strokeLinecap="round" />
    </svg>
  );
}

export default function AssetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const [versionProgress, setVersionProgress] = useState(0);
  const versionInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    fetch(`/api/assets/${id}`)
      .then(r => r.json())
      .then(d => {
        setAsset(d);
        setName(d.name);
        setDescription(d.description);
        setCategory(d.category);
        setTags(parseTags(d.tags));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!asset) return;
    setSaving(true);
    await fetch(`/api/assets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description, category, tags }),
    });
    setSaving(false);
    setEditing(false);
    load();
  };

  const handleDelete = async () => {
    await fetch(`/api/assets/${id}`, { method: 'DELETE' });
    router.push('/assets');
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags(tags.filter(tag => tag !== t));
  };

  const uploadNewVersion = async (file: File) => {
    if (!asset) return;
    setUploadingVersion(true);
    setVersionProgress(10);

    const interval = setInterval(() => {
      setVersionProgress(p => Math.min(p + 8, 90));
    }, 100);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('environmentId', asset.environmentId);
    formData.append('parentId', asset.id);
    formData.append('name', asset.name);
    formData.append('category', asset.category);
    formData.append('tags', parseTags(asset.tags).join(','));

    try {
      const res = await fetch('/api/assets', { method: 'POST', body: formData });
      clearInterval(interval);
      if (res.ok) {
        setVersionProgress(100);
        setTimeout(() => {
          setUploadingVersion(false);
          setVersionProgress(0);
          load();
        }, 500);
      } else {
        setUploadingVersion(false);
        setVersionProgress(0);
      }
    } catch {
      clearInterval(interval);
      setUploadingVersion(false);
      setVersionProgress(0);
    }
  };

  const copyUrl = () => {
    if (asset) {
      navigator.clipboard.writeText(window.location.origin + asset.path);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-5 h-5 border border-white/10 border-t-white/30 rounded-full animate-spin" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Asset not found</p>
      </div>
    );
  }

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 min-h-screen">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.push('/assets')} className="text-xs font-light transition-colors hover:underline" style={{ color: 'var(--text-3)' }}>
          Asset Library
        </button>
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>/</span>
        <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{asset.name}</span>
      </div>

      <div className="flex gap-6">
        {/* Preview Area */}
        <div className="flex-1 min-w-0">
          <div
            className="rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)', minHeight: 400, maxHeight: 600 }}
          >
            {isImage(asset.mimeType) ? (
              <img
                src={asset.path}
                alt={asset.name}
                className="max-w-full max-h-[500px] object-contain"
              />
            ) : isVideo(asset.mimeType) ? (
              <video src={asset.path} controls className="max-w-full max-h-[500px]" />
            ) : (
              <div className="py-20">
                <FileTypeIcon mimeType={asset.mimeType} size={120} />
              </div>
            )}
          </div>

          {/* Action bar below preview */}
          <div className="flex items-center gap-3 mt-4">
            <a
              href={asset.path}
              download={asset.filename}
              className="px-4 py-2 rounded-xl text-xs font-light flex items-center gap-2 transition-all hover:bg-white/5"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M6 1v8M3 6l3 3 3-3" />
                <path d="M1 10h10" />
              </svg>
              Download original
            </a>
            <button
              onClick={copyUrl}
              className="px-4 py-2 rounded-xl text-xs font-light flex items-center gap-2 transition-all hover:bg-white/5"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-2)' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <rect x="4" y="4" width="7" height="7" rx="1.5" />
                <path d="M8 4V2.5A1.5 1.5 0 006.5 1h-4A1.5 1.5 0 001 2.5v4A1.5 1.5 0 002.5 8H4" />
              </svg>
              Copy URL
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-xl text-xs font-light flex items-center gap-2 transition-all hover:bg-red-500/10"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: '#FF6B6B' }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <path d="M2 3h8M4 3V2h4v1M3 3v7a1 1 0 001 1h4a1 1 0 001-1V3" />
              </svg>
              Delete
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="w-[320px] shrink-0 space-y-5">
          <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}>
            {/* Name */}
            <div>
              <label className="block text-[10px] font-light uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Name</label>
              {editing ? (
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-light outline-none"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
                />
              ) : (
                <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{asset.name}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-light uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Description</label>
              {editing ? (
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg px-3 py-2 text-xs font-light outline-none resize-none"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
                />
              ) : (
                <p className="text-xs font-light" style={{ color: asset.description ? 'var(--text-2)' : 'var(--text-3)' }}>
                  {asset.description || 'No description'}
                </p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-light uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Category</label>
              {editing ? (
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-xs font-light outline-none"
                  style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <span
                  className="inline-block px-2 py-0.5 rounded text-[10px] font-light"
                  style={{ background: `${CATEGORY_COLORS[asset.category] || 'rgba(255,255,255,0.1)'}20`, color: CATEGORY_COLORS[asset.category] || 'var(--text-3)' }}
                >
                  {asset.category}
                </span>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-[10px] font-light uppercase tracking-wider mb-1" style={{ color: 'var(--text-3)' }}>Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {(editing ? tags : parseTags(asset.tags)).map(t => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-light"
                    style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)', border: '1px solid var(--glass-border)' }}
                  >
                    {t}
                    {editing && (
                      <button onClick={() => removeTag(t)} className="hover:text-red-400 transition-colors" style={{ color: 'var(--text-3)' }}>
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M2 2l4 4M6 2l-4 4" />
                        </svg>
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editing && (
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    placeholder="Add tag..."
                    className="flex-1 rounded-lg px-3 py-1.5 text-[10px] font-light outline-none"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}
                  />
                  <button
                    onClick={addTag}
                    className="px-2 py-1 rounded-lg text-[10px] font-light"
                    style={{ background: 'rgba(113,147,237,0.1)', color: '#7193ED', border: '1px solid rgba(113,147,237,0.2)' }}
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Edit/Save buttons */}
            <div className="flex gap-2 pt-1">
              {editing ? (
                <>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-light transition-all"
                    style={{ background: 'rgba(113,147,237,0.15)', color: '#7193ED', border: '1px solid rgba(113,147,237,0.3)' }}
                  >
                    {saving ? 'Saving...' : 'Save changes'}
                  </button>
                  <button
                    onClick={() => { setEditing(false); setName(asset.name); setDescription(asset.description); setCategory(asset.category); setTags(parseTags(asset.tags)); }}
                    className="px-3 py-2 rounded-xl text-xs font-light transition-all hover:bg-white/5"
                    style={{ color: 'var(--text-3)', border: '1px solid var(--glass-border)' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-2 rounded-xl text-xs font-light transition-all hover:bg-white/5"
                  style={{ color: 'var(--text-2)', border: '1px solid var(--glass-border)' }}
                >
                  Edit details
                </button>
              )}
            </div>
          </div>

          {/* File Info */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}>
            <p className="text-[10px] font-light uppercase tracking-wider mb-3" style={{ color: 'var(--text-3)' }}>File Info</p>
            <div className="space-y-2.5">
              {[
                ['Filename', asset.filename],
                ['Size', formatSize(asset.size)],
                ['Type', asset.mimeType],
                ['Dimensions', asset.width && asset.height ? `${asset.width} x ${asset.height}` : '--'],
                ['Uploaded', new Date(asset.createdAt).toLocaleString()],
                ['By', asset.identity.name],
                ['Environment', asset.environment.name],
                ['Version', `v${asset.version}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span className="text-[10px] font-light text-right max-w-[180px] truncate" style={{ color: 'var(--text-2)' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Version History */}
          <div className="rounded-2xl p-5" style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-light uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>Version History</p>
              <button
                onClick={() => versionInputRef.current?.click()}
                disabled={uploadingVersion}
                className="px-2 py-1 rounded-lg text-[10px] font-light transition-all hover:bg-white/5"
                style={{ background: 'rgba(113,147,237,0.1)', color: '#7193ED', border: '1px solid rgba(113,147,237,0.2)' }}
              >
                Upload new version
              </button>
              <input
                ref={versionInputRef}
                type="file"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) uploadNewVersion(file);
                  if (versionInputRef.current) versionInputRef.current.value = '';
                }}
              />
            </div>

            {uploadingVersion && (
              <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'var(--glass)' }}>
                <p className="text-[10px] font-light mb-1" style={{ color: 'var(--text-2)' }}>Uploading new version...</p>
                <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${versionProgress}%`, background: versionProgress === 100 ? '#15AD70' : 'rgba(113,147,237,0.6)' }}
                  />
                </div>
              </div>
            )}

            {/* Current version */}
            <div className="px-3 py-2 rounded-lg mb-1" style={{ background: 'rgba(113,147,237,0.06)', border: '1px solid rgba(113,147,237,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-light" style={{ color: '#7193ED' }}>v{asset.version} (current)</span>
                <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{new Date(asset.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-3)' }}>{asset.identity.name}</p>
            </div>

            {/* Previous versions */}
            {asset.versions.length > 0 && (
              <div className="space-y-1 mt-1">
                {asset.versions.map(v => (
                  <div key={v.id} className="px-3 py-2 rounded-lg transition-colors hover:bg-white/[0.02]" style={{ background: 'var(--glass)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-2)' }}>v{v.version}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{new Date(v.createdAt).toLocaleDateString()}</span>
                        <a
                          href={v.path}
                          download={v.filename}
                          className="p-1 rounded transition-colors hover:bg-white/5"
                          style={{ color: 'var(--text-3)' }}
                          title="Download this version"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                            <path d="M5 1v6M2.5 5L5 7.5 7.5 5" />
                            <path d="M1 8.5h8" />
                          </svg>
                        </a>
                      </div>
                    </div>
                    <p className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-3)' }}>{v.identity.name} -- {formatSize(v.size)}</p>
                  </div>
                ))}
              </div>
            )}

            {asset.versions.length === 0 && (
              <p className="text-[10px] font-light mt-2" style={{ color: 'var(--text-3)' }}>No previous versions</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
          <div className="rounded-2xl p-6 w-full max-w-sm" style={{ background: 'var(--glass-deep)', border: '1px solid var(--glass-border)' }}>
            <h3 className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>Delete asset?</h3>
            <p className="text-xs font-light mb-5" style={{ color: 'var(--text-3)' }}>
              This will permanently delete &quot;{asset.name}&quot; and all {asset._count.versions} version{asset._count.versions !== 1 ? 's' : ''}. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-light transition-colors hover:bg-white/5"
                style={{ color: 'var(--text-2)', border: '1px solid var(--glass-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 rounded-xl text-xs font-light transition-all"
                style={{ background: 'rgba(255,87,87,0.12)', color: '#FF5757', border: '1px solid rgba(255,87,87,0.25)' }}
              >
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
