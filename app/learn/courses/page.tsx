'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Enrollment = { id: string; status: string; progress: number; completedAt: string | null } | null;
type Course = {
  id: string;
  title: string;
  summary: string | null;
  published: boolean;
  skillTag: string | null;
  environment: { id: string; name: string; slug: string; color: string | null } | null;
  author: { id: string; name: string };
  totalLessons: number;
  totalModules: number;
  enrollment: Enrollment;
};

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<'all' | 'enrolled' | 'authored'>('all');

  useEffect(() => {
    fetch('/api/courses')
      .then(r => r.json())
      .then(d => setCourses(Array.isArray(d.courses) ? d.courses : []))
      .finally(() => setLoaded(true));
  }, []);

  const visible = courses.filter(c => {
    if (tab === 'enrolled') return !!c.enrollment;
    if (tab === 'authored') return false; // see note below
    return c.published || !!c.enrollment;
  });

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/learn" className="text-[10px] tracking-wider uppercase font-light hover:text-white/70" style={{ color: 'var(--text-3)' }}>
            ← Nova Academy
          </Link>
          <h1 className="text-2xl font-extralight tracking-tight mt-1" style={{ letterSpacing: '-0.02em' }}>
            Courses
          </h1>
          <p className="text-sm font-light mt-1" style={{ color: 'var(--text-3)' }}>
            Completing a course advances the learner's node in SkillSpace. Learning and fluency share one graph.
          </p>
        </div>
        <Link href="/learn/author" className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
          style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
          New course
        </Link>
      </div>

      <div className="flex items-center gap-1" role="tablist">
        {(['all', 'enrolled'] as const).map(t => {
          const active = t === tab;
          const count = t === 'all' ? courses.filter(c => c.published || c.enrollment).length : courses.filter(c => c.enrollment).length;
          return (
            <button key={t} role="tab" aria-selected={active} onClick={() => setTab(t)}
              className="text-[11px] font-light px-3 py-1.5 rounded-full transition-colors"
              style={{
                background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
                border: `1px solid ${active ? 'var(--glass-border)' : 'transparent'}`,
                color: active ? 'var(--text-1)' : 'var(--text-3)',
              }}>
              {t === 'all' ? 'All' : 'Enrolled'} · <span className="tabular-nums">{count}</span>
            </button>
          );
        })}
      </div>

      {!loaded && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      )}

      {loaded && visible.length === 0 && (
        <div className="glass-deep rounded-xl p-8 text-center">
          <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
            No courses yet. <Link href="/learn/author" className="underline">Author one</Link> — lessons, quizzes, and a skill tag.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map(c => {
          const pct = c.enrollment?.progress ?? 0;
          const completed = c.enrollment?.status === 'COMPLETED';
          return (
            <Link key={c.id} href={`/learn/courses/${c.id}`}
              className="glass-deep rounded-xl p-5 block transition-colors hover:bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {c.environment && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.environment.color || 'var(--text-3)' }} />
                    <span className="text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>
                      {c.environment.name}
                    </span>
                  </span>
                )}
                {!c.published && (
                  <span className="text-[10px] font-light px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(245,215,110,0.08)', border: '1px solid rgba(245,215,110,0.2)', color: '#F5D76E' }}>
                    Draft
                  </span>
                )}
                {completed && (
                  <span className="text-[10px] font-light px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(200,242,107,0.08)', border: '1px solid rgba(200,242,107,0.2)', color: '#C8F26B' }}>
                    Completed
                  </span>
                )}
              </div>
              <h2 className="text-base font-light leading-snug mb-1" style={{ color: 'var(--text-1)' }}>{c.title}</h2>
              {c.summary && <p className="text-xs font-light line-clamp-2 mb-3" style={{ color: 'var(--text-2)' }}>{c.summary}</p>}
              <div className="flex items-center gap-3 text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                <span>{c.totalModules} module{c.totalModules === 1 ? '' : 's'}</span>
                <span>·</span>
                <span>{c.totalLessons} lesson{c.totalLessons === 1 ? '' : 's'}</span>
                {c.skillTag && <><span>·</span><span style={{ color: '#BF9FF1' }}>skill: {c.skillTag}</span></>}
              </div>
              {c.enrollment && (
                <div className="mt-3">
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full" style={{
                      width: `${Math.min(100, pct)}%`,
                      background: completed ? '#C8F26B' : '#7193ED',
                      transition: 'width 0.7s',
                    }} />
                  </div>
                  <span className="text-[10px] font-light tabular-nums mt-1 inline-block" style={{ color: 'var(--text-3)' }}>
                    {pct}%
                  </span>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
