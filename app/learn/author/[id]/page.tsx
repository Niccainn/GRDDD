'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { fetchObject } from '@/lib/api/safe-fetch';

type Question = { id?: string; prompt: string; choices: string[]; correctAnswer: string };
type Lesson = {
  id: string;
  title: string;
  body: string;
  videoUrl: string | null;
  estimatedMinutes: number | null;
  order: number;
  quiz: { id: string; passingScore: number; questions: (Question & { id: string })[] } | null;
};
type Module = { id: string; title: string; order: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  summary: string | null;
  skillTag: string | null;
  published: boolean;
  modules: Module[];
};

export default function CourseAuthorPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const [course, setCourse] = useState<Course | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetchObject<{ course?: Course }>(`/api/courses/${id}`)
      .then(d => setCourse(d?.course ?? null))
      .finally(() => setLoaded(true));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function patchCourse(patch: Partial<Course>) {
    setSavingMeta(true);
    await fetch(`/api/courses/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) });
    setSavingMeta(false);
    load();
  }

  async function addModule() {
    const title = prompt('Module title?');
    if (!title?.trim()) return;
    await fetch(`/api/courses/${id}/modules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title }) });
    load();
  }

  async function addLesson(moduleId: string) {
    const title = prompt('Lesson title?');
    if (!title?.trim()) return;
    await fetch(`/api/modules/${moduleId}/lessons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, body: '' }) });
    load();
  }

  if (!loaded) return <div className="p-6"><div className="h-32 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} /></div>;
  if (!course) return <div className="p-6"><p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Course not found or you're not the author. <Link href="/learn/author" className="underline">Back</Link></p></div>;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/learn/author" className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>← Author</Link>
        <div className="flex items-center gap-3">
          <Link href={`/learn/courses/${id}`} className="text-[11px] font-light transition-colors hover:text-white/70" style={{ color: 'var(--text-3)' }}>
            Preview →
          </Link>
          <button onClick={() => patchCourse({ published: !course.published })}
            className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
            style={{
              background: course.published ? 'rgba(200,242,107,0.08)' : 'var(--brand-soft)',
              border: `1px solid ${course.published ? 'rgba(200,242,107,0.25)' : 'var(--brand-border)'}`,
              color: course.published ? '#C8F26B' : 'var(--brand)',
            }}>
            {course.published ? 'Published' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Meta editor */}
      <div className="glass-deep rounded-2xl p-5">
        <h3 className="text-[10px] tracking-[0.14em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
          Course {savingMeta && <span className="ml-2">saving…</span>}
        </h3>
        <div className="space-y-3">
          <MetaField label="Title" value={course.title} onBlur={v => patchCourse({ title: v })} />
          <MetaField label="Summary" value={course.summary ?? ''} onBlur={v => patchCourse({ summary: v })} />
          <MetaField label="Skill tag" value={course.skillTag ?? ''} onBlur={v => patchCourse({ skillTag: v })}
            hint="e.g. delegation, pricing, ad-ops. Completion advances this skill in SkillSpace." />
        </div>
      </div>

      {/* Modules */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] tracking-[0.14em] uppercase font-light" style={{ color: 'var(--text-3)' }}>
          Modules
        </h3>
        <button onClick={addModule} className="text-[11px] font-light transition-colors hover:text-white/70" style={{ color: 'var(--text-2)' }}>
          + Add module
        </button>
      </div>
      <div className="space-y-3">
        {course.modules.map(mod => (
          <div key={mod.id} className="glass-deep rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{mod.title}</h4>
              <div className="flex items-center gap-2">
                <button onClick={() => addLesson(mod.id)} className="text-[10px] font-light transition-colors hover:text-white/70" style={{ color: 'var(--text-3)' }}>
                  + Lesson
                </button>
                <button onClick={async () => {
                  if (!confirm(`Delete module "${mod.title}"?`)) return;
                  await fetch(`/api/modules/${mod.id}`, { method: 'DELETE' });
                  load();
                }} className="text-[10px] font-light transition-colors hover:text-white/70" style={{ color: 'var(--text-3)' }}>Delete</button>
              </div>
            </div>
            <div className="space-y-2">
              {mod.lessons.length === 0 && (
                <p className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>No lessons. Click + Lesson to add one.</p>
              )}
              {mod.lessons.map(l => <LessonEditor key={l.id} lesson={l} onChange={load} />)}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3">
        <button onClick={async () => {
          if (!confirm('Delete this course? This cannot be undone.')) return;
          const res = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
          if (res.ok) router.push('/learn/author');
        }} className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>
          Delete course
        </button>
      </div>
    </div>
  );
}

function MetaField({ label, value, onBlur, hint }: { label: string; value: string; onBlur: (v: string) => void; hint?: string }) {
  const [local, setLocal] = useState(value);
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <div>
      <label className="text-[10px] tracking-wider uppercase font-light block mb-1.5" style={{ color: 'var(--text-3)' }}>{label}</label>
      <input type="text" value={local} onChange={e => setLocal(e.target.value)} onBlur={() => local !== value && onBlur(local)}
        className="w-full px-3 py-2 rounded-lg text-sm font-light outline-none"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
      {hint && <p className="text-[10px] font-light mt-1" style={{ color: 'var(--text-3)' }}>{hint}</p>}
    </div>
  );
}

function parseChoices(raw: string | null | undefined | string[]): string[] {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

function LessonEditor({ lesson, onChange }: { lesson: Lesson; onChange: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [body, setBody] = useState(lesson.body);
  const [videoUrl, setVideoUrl] = useState(lesson.videoUrl ?? '');
  const [estMin, setEstMin] = useState(lesson.estimatedMinutes ?? 0);
  const [questions, setQuestions] = useState<Question[]>(() =>
    (lesson.quiz?.questions ?? []).map(q => ({ id: q.id, prompt: q.prompt, choices: parseChoices((q as unknown as { choices: string | null }).choices), correctAnswer: q.correctAnswer ?? '0' }))
  );

  async function save() {
    await fetch(`/api/lessons/${lesson.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, videoUrl: videoUrl || null, estimatedMinutes: estMin || null }),
    });
    await fetch(`/api/lessons/${lesson.id}/quiz`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions: questions.filter(q => q.prompt.trim() && q.choices.length >= 2) }),
    });
    onChange();
  }

  async function remove() {
    if (!confirm(`Delete lesson "${title}"?`)) return;
    await fetch(`/api/lessons/${lesson.id}`, { method: 'DELETE' });
    onChange();
  }

  function addQuestion() {
    setQuestions(q => [...q, { prompt: '', choices: ['', ''], correctAnswer: '0' }]);
  }

  function updateQuestion(i: number, patch: Partial<Question>) {
    setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q));
  }

  return (
    <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
      <div className="flex items-center justify-between gap-2">
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          className="text-sm font-light bg-transparent outline-none flex-1 min-w-0"
          style={{ color: 'var(--text-1)' }}/>
        <button onClick={() => setExpanded(v => !v)} className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
          {expanded ? 'Collapse' : 'Edit'}
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Lesson body (markdown supported)"
            className="w-full px-3 py-2 rounded-md text-sm font-light outline-none resize-y"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="Video URL (optional)"
              className="px-3 py-2 rounded-md text-xs font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
            <input type="number" min={0} value={estMin} onChange={e => setEstMin(Number(e.target.value))} placeholder="Estimated min"
              className="px-3 py-2 rounded-md text-xs font-light outline-none"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>Quiz</h5>
              <button onClick={addQuestion} className="text-[10px] font-light" style={{ color: 'var(--text-2)' }}>+ Question</button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="rounded-md p-2 mb-2" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                <input type="text" value={q.prompt} onChange={e => updateQuestion(i, { prompt: e.target.value })} placeholder="Question"
                  className="w-full bg-transparent outline-none text-sm font-light mb-2"
                  style={{ color: 'var(--text-1)' }}/>
                {q.choices.map((c, ci) => (
                  <div key={ci} className="flex items-center gap-2 mb-1">
                    <input type="radio" name={`q-${lesson.id}-${i}`} checked={q.correctAnswer === String(ci)}
                      onChange={() => updateQuestion(i, { correctAnswer: String(ci) })}/>
                    <input type="text" value={c} onChange={e => {
                      const copy = [...q.choices];
                      copy[ci] = e.target.value;
                      updateQuestion(i, { choices: copy });
                    }} placeholder={`Choice ${ci + 1}`}
                      className="flex-1 px-2 py-1 rounded text-xs font-light outline-none"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)', color: 'var(--text-1)' }}/>
                  </div>
                ))}
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => updateQuestion(i, { choices: [...q.choices, ''] })} className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>+ choice</button>
                  <button onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))} className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>remove question</button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={remove} className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>Delete</button>
            <button onClick={save}
              className="text-[11px] font-light px-3 py-1.5 rounded-full transition-all"
              style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
