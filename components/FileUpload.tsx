'use client';

import { useState, useRef, useCallback } from 'react';

type Attachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  entityType: string;
  entityId: string;
  createdAt: string;
};

type FileUploadProps = {
  entityType: string;
  entityId: string;
  onUpload?: (attachment: Attachment) => void;
};

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'txt', 'md',
  'zip',
]);

export default function FileUpload({ entityType, entityId, onUpload }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validate = useCallback((file: File): string | null => {
    if (file.size > MAX_SIZE) return 'File exceeds 10MB limit';
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!ALLOWED_EXTENSIONS.has(ext)) return `File type .${ext} is not allowed`;
    return null;
  }, []);

  const upload = useCallback(async (file: File) => {
    const validationError = validate(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 4000);
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    // Simulate progress since fetch doesn't support upload progress natively
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90));
    }, 100);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('entityType', entityType);
      formData.append('entityId', entityId);

      const res = await fetch('/api/attachments', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setProgress(100);
      const attachment = await res.json();
      onUpload?.(attachment);

      setTimeout(() => {
        setProgress(0);
        setUploading(false);
      }, 600);
    } catch (err) {
      clearInterval(progressInterval);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
      setTimeout(() => setError(null), 4000);
    }
  }, [entityType, entityId, onUpload, validate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  }, [upload]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) upload(file);
    if (inputRef.current) inputRef.current.value = '';
  }, [upload]);

  return (
    <div className="relative">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="relative rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `1.5px dashed ${dragging ? 'rgba(113, 147, 237, 0.6)' : 'var(--glass-border)'}`,
          background: dragging
            ? 'rgba(113, 147, 237, 0.06)'
            : 'var(--glass)',
          boxShadow: dragging
            ? '0 0 24px rgba(113, 147, 237, 0.1)'
            : 'none',
        }}
      >
        <input
          ref={inputRef}
          type="file"
          onChange={handleChange}
          className="hidden"
        />

        {uploading ? (
          <div className="space-y-3">
            <p className="text-xs font-light" style={{ color: 'var(--text-2)' }}>
              Uploading...
            </p>
            <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${progress}%`,
                  background: 'linear-gradient(90deg, rgba(113,147,237,0.6), rgba(191,159,241,0.6))',
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex justify-center" style={{ color: 'var(--text-3)' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
              Drop files here or click to upload
            </p>
            <p className="text-xs font-light" style={{ color: 'rgba(255,255,255,0.15)' }}>
              Max 10MB -- images, documents, archives
            </p>
          </div>
        )}
      </div>

      {error && (
        <div
          className="mt-2 px-3 py-2 rounded-lg text-xs font-light"
          style={{ background: 'rgba(255,87,87,0.1)', color: '#FF5757', border: '1px solid rgba(255,87,87,0.2)' }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
