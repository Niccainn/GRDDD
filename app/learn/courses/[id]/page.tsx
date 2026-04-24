'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type QuizQuestion = {
  id: string;
  prompt: string;
  type: string;
  choices: string | null;
  correctAnswer: string | null;
  order: number;
};
type Quiz = { id: string; passingScore: number; questions: QuizQuestion[] };
type Lesson = {
  id: string;
  title: string;
  body: string;
  videoUrl: string | null;
  estimatedMinutes: number | null;
  order: number;
  quiz: Quiz | null;
};
type Module = { id: string; title: string; order: number; lessons: Lesson[] };
type Course = {
  id: string;
  title: string;
  summary: string | null;
  skillTag: string | null;
  published: boolean;
  environment: { id: string; name: string; slug: string; color: string | null } | null;
  author: { id: string; name: string };
  modules: Module[];
};
type EnrollmentCompletion = { lessonId: string; quizScore: number | null; completedAt: string };
type Enrollment = {
  id: string;
  status: string;
  progress: number;
  completedAt: string | null;
  completions: EnrollmentCompletion[];
};

function parseChoices(raw: string | null): string[] {
  if (!raw) return [];
  try { const arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch { return []; }
}

export default function CoursePlayerPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
  const [course, setCourse] = useState<Course | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);

  const load = useCallback(() => {
    if (!id) return;
    fetch(`/api/courses/${id}`)
      .then(r => r.json())
      .then(d => {
        setCourse(d.course);
        setEnrollment(d.enrollment ?? null);
        if (!currentLessonId && d.course?.modules?.[0]?.lessons?.[0]?.id) {
          setCurrentLessonId(d.course.modules[0].lessons[0].id);
        }
      })
      .finally(() => setLoaded(true));
  }, [id, currentLessonId]);

  useEffect(() => { load(); }, [load]);

  async function enroll() {
    const res = await fetch(`/api/courses/${id}/enroll`, { method: 'POST' });
    if (res.ok) load();
  }

  const allLessons = useMemo(() => {
    if (!course) return [] as Lesson[];
    return course.modules.flatMap(m => m.lessons);
  }, [course]);

  const currentLesson = useMemo(
    () => allLessons.find(l => l.id === currentLessonId) ?? null,
    [allLessons, currentLessonId]
  );

  const completedIds = useMemo(
    () => new Set(enrollment?.completions.map(c => c.lessonId) ?? []),
    [enrollment]
  );

  async function completeLesson() {
    if (!currentLesson) return;
    let quizScore: number | null = null;
    if (currentLesson.quiz && currentLesson.quiz.questions.length > 0) {
      const total = currentLesson.quiz.questions.length;
      const correct = currentLesson.quiz.questions.reduce((n, q) => {
        const ans = quizAnswers[q.id];
        if (ans === undefined) return n;
        return String(ans) === q.correctAnswer ? n + 1 : n;
      }, 0);
      quizScore = Math.round((correct / total) * 100);
      if (quizScore < (currentLesson.quiz.passingScore ?? 70)) {
        alert(`You scored ${quizScore}%. Passing is ${currentLesson.quiz.passingScore}%. Review and try again.`);
        return;
      }
    }
    setSubmittingQuiz(true);
    const res = await fetch(`/api/lessons/${currentLesson.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizScore }),
    });
    setSubmittingQuiz(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error ?? 'Failed to save');
      return;
    }
    const data = await res.json();
    if (data.justFinished && data.skillAdvanced) {
      window.dispatchEvent(new CustomEvent('grid:skill-advanced', { detail: { skillTag: data.skillAdvanced, courseId: id } }));
    }
    window.dispatchEvent(new CustomEvent('grid:course-changed'));
    // Advance to next lesson
    const idx = allLessons.findIndex(l => l.id === currentLesson.id);
    const next = allLessons[idx + 1];
    setQuizAnswers({});
    if (next) setCurrentLessonId(next.id);
    else load();
  }

  if (!loaded) {
    return <div className="p-6"><div className="h-40 rounded-xl animate-pulse" style={{ background: 'var(--glass)' }} /></div>;
  }
  if (!course) {
    return <div className="p-6"><p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Course not found. <Link href="/learn/courses" className="underline">Back</Link></p></div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/learn/courses" className="text-[11px] font-light" style={{ color: 'var(--text-3)' }}>← Courses</Link>
        {course.author && (
          <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
            By {course.author.name}
          </span>
        )}
      </div>

      {/* Hero */}
      <div className="glass-deep rounded-2xl p-5 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {course.environment && (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: course.environment.color || 'var(--text-3)' }} />
                  <span className="text-[10px] tracking-wider uppercase font-light" style={{ color: 'var(--text-3)' }}>
                    {course.environment.name}
                  </span>
                </span>
              )}
              {course.skillTag && (
                <span className="text-[10px] font-light px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(191,159,241,0.08)', border: '1px solid rgba(191,159,241,0.2)', color: '#BF9FF1' }}>
                  advances {course.skillTag}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-extralight leading-tight mb-2"
              style={{ color: 'var(--text-1)', letterSpacing: '-0.02em' }}>{course.title}</h1>
            {course.summary && <p className="text-sm font-light max-w-2xl" style={{ color: 'var(--text-2)' }}>{course.summary}</p>}
          </div>
          {!enrollment && (
            <button onClick={enroll} className="shrink-0 text-xs font-light px-3 py-1.5 rounded-full transition-all"
              style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
              Enroll
            </button>
          )}
        </div>
        {enrollment && (
          <div className="mt-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${enrollment.progress}%`, background: enrollment.status === 'COMPLETED' ? '#C8F26B' : '#7193ED' }} />
              </div>
              <span className="stat-number text-sm font-extralight tabular-nums" style={{ color: 'var(--text-1)' }}>
                {enrollment.progress}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
        {/* Sidebar: module/lesson list */}
        <aside className="glass-deep rounded-2xl p-4 md:sticky md:top-4 md:self-start">
          <h3 className="text-[10px] tracking-[0.14em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
            Contents
          </h3>
          <div className="space-y-4">
            {course.modules.map(mod => (
              <div key={mod.id}>
                <p className="text-[10px] tracking-wider uppercase font-light mb-1.5" style={{ color: 'var(--text-3)' }}>
                  {mod.title}
                </p>
                <ul className="space-y-0.5">
                  {mod.lessons.map(l => {
                    const active = l.id === currentLessonId;
                    const done = completedIds.has(l.id);
                    return (
                      <li key={l.id}>
                        <button onClick={() => { setCurrentLessonId(l.id); setQuizAnswers({}); }}
                          className="w-full text-left px-2 py-1.5 rounded-md transition-colors flex items-center gap-2"
                          style={{
                            background: active ? 'rgba(200,242,107,0.06)' : 'transparent',
                            color: active ? 'var(--text-1)' : 'var(--text-2)',
                          }}>
                          <span className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center"
                            style={{
                              background: done ? '#C8F26B22' : 'transparent',
                              border: `1px solid ${done ? '#C8F26B' : 'var(--glass-border)'}`,
                            }}>
                            {done && <span className="text-[7px]" style={{ color: '#C8F26B' }}>✓</span>}
                          </span>
                          <span className="text-xs font-light truncate">{l.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Player */}
        <main className="glass-deep rounded-2xl p-5 md:p-6 min-h-[400px]">
          {!currentLesson && (
            <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>
              No lessons yet.
              {course.author && ` Ask ${course.author.name} when it'll be ready.`}
            </p>
          )}
          {currentLesson && (
            <>
              <h2 className="text-xl font-extralight mb-3" style={{ letterSpacing: '-0.02em' }}>
                {currentLesson.title}
              </h2>
              {currentLesson.estimatedMinutes && (
                <p className="text-[10px] font-light mb-4" style={{ color: 'var(--text-3)' }}>
                  ≈ {currentLesson.estimatedMinutes} min
                </p>
              )}
              {currentLesson.videoUrl && (
                <div className="mb-5 rounded-lg overflow-hidden" style={{ aspectRatio: '16 / 9', background: '#000' }}>
                  <video src={currentLesson.videoUrl} controls className="w-full h-full" />
                </div>
              )}
              <div className="text-sm font-light leading-relaxed whitespace-pre-wrap mb-6" style={{ color: 'var(--text-1)' }}>
                {currentLesson.body || <em style={{ color: 'var(--text-3)' }}>No body content yet.</em>}
              </div>

              {currentLesson.quiz && currentLesson.quiz.questions.length > 0 && (
                <div className="rounded-xl p-4 mb-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--glass-border)' }}>
                  <h3 className="text-[10px] tracking-[0.14em] uppercase font-light mb-3" style={{ color: 'var(--text-3)' }}>
                    Quick check · pass {currentLesson.quiz.passingScore}%
                  </h3>
                  <ol className="space-y-4">
                    {currentLesson.quiz.questions.map((q, qi) => {
                      const choices = parseChoices(q.choices);
                      return (
                        <li key={q.id}>
                          <p className="text-sm font-light mb-2" style={{ color: 'var(--text-1)' }}>
                            {qi + 1}. {q.prompt}
                          </p>
                          <div className="space-y-1.5">
                            {choices.map((c, ci) => {
                              const selected = quizAnswers[q.id] === ci;
                              return (
                                <label key={ci} className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded-md transition-colors"
                                  style={{ background: selected ? 'rgba(200,242,107,0.06)' : 'transparent' }}>
                                  <input type="radio" name={q.id} className="sr-only"
                                    onChange={() => setQuizAnswers(a => ({ ...a, [q.id]: ci }))} />
                                  <span className="w-3 h-3 rounded-full border shrink-0"
                                    style={{
                                      borderColor: selected ? '#C8F26B' : 'var(--glass-border)',
                                      background: selected ? '#C8F26B' : 'transparent',
                                    }} />
                                  <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{c}</span>
                                </label>
                              );
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}

              <div className="flex items-center justify-end">
                <button onClick={completeLesson} disabled={submittingQuiz || !enrollment}
                  title={!enrollment ? 'Enroll first to complete lessons' : undefined}
                  className="text-xs font-light px-3 py-1.5 rounded-full transition-all disabled:opacity-50"
                  style={{ background: 'var(--brand-soft)', border: '1px solid var(--brand-border)', color: 'var(--brand)' }}>
                  {completedIds.has(currentLesson.id) ? 'Mark again' : 'Complete lesson'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
