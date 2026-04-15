'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import type { FormField } from '@/lib/forms';

type FormMeta = {
  id: string;
  name: string;
  fields: FormField[];
  slug: string;
};

type Submission = {
  id: string;
  data: Record<string, unknown>;
  metadata: Record<string, string>;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

export default function SubmissionsPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<FormMeta | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/forms/${id}`)
      .then((r) => r.json())
      .then((data) => setForm(data));
  }, [id]);

  useEffect(() => {
    fetch(`/api/forms/${id}/submissions?page=${page}&limit=50`)
      .then((r) => r.json())
      .then((data) => {
        setSubmissions(data.submissions ?? []);
        setTotal(data.total ?? 0);
        setPages(data.pages ?? 1);
        setLoaded(true);
      });
  }, [id, page]);

  const inputFields = (form?.fields ?? []).filter(
    (f) => f.type !== 'heading' && f.type !== 'divider',
  );

  function exportCsv() {
    if (!form || submissions.length === 0) return;

    const headers = [...inputFields.map((f) => f.label), 'Submitted at'];
    const rows = submissions.map((s) => [
      ...inputFields.map((f) => {
        const val = s.data[f.id];
        if (Array.isArray(val)) return val.join(', ');
        if (val === true) return 'Yes';
        if (val === false) return 'No';
        return String(val ?? '');
      }),
      formatDate(s.createdAt),
    ]);

    const csv =
      [headers, ...rows]
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell);
              return str.includes(',') || str.includes('"') || str.includes('\n')
                ? `"${str.replace(/"/g, '""')}"`
                : str;
            })
            .join(','),
        )
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${form.name.replace(/[^a-z0-9]/gi, '_')}_submissions.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!loaded || !form) {
    return (
      <div className="px-10 py-10 min-h-screen">
        <div className="h-8 w-48 rounded-lg animate-pulse mb-6" style={{ background: 'var(--glass)' }} />
        <div className="h-96 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
      </div>
    );
  }

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href={`/forms/${id}`}
              className="text-xs font-light"
              style={{ color: 'var(--text-3)' }}
            >
              &larr; Builder
            </Link>
          </div>
          <h1 className="text-2xl font-extralight tracking-tight mb-1">
            {form.name} -- Submissions
          </h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {total} submission{total !== 1 ? 's' : ''}
          </p>
        </div>
        {submissions.length > 0 && (
          <button
            onClick={exportCsv}
            className="text-xs font-light px-3 py-2 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            Export CSV
          </button>
        )}
      </div>

      {/* Table */}
      {submissions.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 rounded-xl"
          style={{ border: '1px dashed var(--glass-border)' }}
        >
          <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>
            No submissions yet
          </p>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            Share your form to start collecting responses
          </p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden"
          style={{ border: '1px solid var(--glass-border)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                  {inputFields.map((f) => (
                    <th
                      key={f.id}
                      className="text-[10px] font-light tracking-wider uppercase text-left px-4 py-3"
                      style={{ color: 'var(--text-3)' }}
                    >
                      {f.label}
                    </th>
                  ))}
                  <th
                    className="text-[10px] font-light tracking-wider uppercase text-left px-4 py-3"
                    style={{ color: 'var(--text-3)' }}
                  >
                    Submitted
                  </th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <>
                    <tr
                      key={s.id}
                      onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                      className="cursor-pointer transition-colors hover:bg-white/[0.02]"
                      style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {inputFields.map((f) => {
                        const val = s.data[f.id];
                        let display = '';
                        if (Array.isArray(val)) display = val.join(', ');
                        else if (val === true) display = 'Yes';
                        else if (val === false) display = 'No';
                        else display = String(val ?? '--');

                        return (
                          <td
                            key={f.id}
                            className="text-xs font-light px-4 py-3 max-w-[200px] truncate"
                            style={{ color: 'var(--text-2)' }}
                          >
                            {display}
                          </td>
                        );
                      })}
                      <td
                        className="text-xs font-light px-4 py-3 whitespace-nowrap"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {formatDate(s.createdAt)}
                      </td>
                    </tr>
                    {expandedId === s.id && (
                      <tr key={`${s.id}-detail`}>
                        <td colSpan={inputFields.length + 1} className="px-4 py-4">
                          <div
                            className="rounded-xl p-4"
                            style={{
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.06)',
                            }}
                          >
                            <div className="grid grid-cols-2 gap-3">
                              {inputFields.map((f) => {
                                const val = s.data[f.id];
                                let display = '';
                                if (Array.isArray(val)) display = val.join(', ');
                                else if (val === true) display = 'Yes';
                                else if (val === false) display = 'No';
                                else display = String(val ?? '--');

                                return (
                                  <div key={f.id}>
                                    <p
                                      className="text-[10px] mb-0.5"
                                      style={{ color: 'var(--text-3)' }}
                                    >
                                      {f.label}
                                    </p>
                                    <p
                                      className="text-xs font-light"
                                      style={{ color: 'var(--text-1)' }}
                                    >
                                      {display}
                                    </p>
                                  </div>
                                );
                              })}
                            </div>
                            {Object.keys(s.metadata).length > 0 && (
                              <div
                                className="mt-3 pt-3 flex gap-4"
                                style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                              >
                                {s.metadata.ip && (
                                  <span
                                    className="text-[10px]"
                                    style={{ color: 'var(--text-3)' }}
                                  >
                                    IP: {s.metadata.ip}
                                  </span>
                                )}
                                {s.metadata.referrer && (
                                  <span
                                    className="text-[10px]"
                                    style={{ color: 'var(--text-3)' }}
                                  >
                                    Referrer: {s.metadata.referrer}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
            >
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="text-xs font-light px-3 py-1.5 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--text-3)' }}
              >
                Previous
              </button>
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page >= pages}
                className="text-xs font-light px-3 py-1.5 rounded-lg disabled:opacity-30"
                style={{ color: 'var(--text-3)' }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
