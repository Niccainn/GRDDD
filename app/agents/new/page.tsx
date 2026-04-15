'use client';

/**
 * /agents/new — create-agent surface, blueprint-first.
 *
 * Three steps, all rendered on one page so it feels like a single
 * focused conversation instead of a multi-step wizard:
 *
 *   1. PICK — a grid of blueprints (shape-of-thinking, not personas)
 *      grouped loosely by category. Also a "Start from scratch"
 *      escape hatch for power users.
 *
 *   2. SHAPE — 2–4 short questions specific to the chosen blueprint.
 *      Answers feed token substitution in the skeleton, so every
 *      business walks away with a materially different prompt even
 *      when they forked from the same blueprint. An optional
 *      "Refine with Claude" pass makes another personalization layer
 *      via the BYOK client for further business-specific adaptation.
 *
 *   3. REVIEW — the generated prompt, editable before saving. This
 *      is the moment the user sees clearly that the agent is THEIRS,
 *      not a template wearing a fake name.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type Environment = {
  id: string;
  name: string;
  slug: string;
  color: string | null;
};

type BlueprintSummary = {
  id: string;
  title: string;
  emoji: string;
  category: string;
  tagline: string;
  questionCount: number;
};

type ShapeResponse = {
  blueprintId: string;
  title: string;
  emoji: string;
  defaultName: string;
  defaultDescription: string;
  prompt: string;
  refinedPrompt?: string;
  refineError?: string;
};

const MODELS = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6', hint: 'Balanced · $3/$15 per MTok' },
  { id: 'claude-haiku-4-5', label: 'Haiku 4.5', hint: 'Fast · $0.80/$4 per MTok' },
  { id: 'claude-opus-4-6', label: 'Opus 4.6', hint: 'Deepest reasoning · $15/$75 per MTok' },
];

const CATEGORY_ORDER: Array<{ key: string; label: string }> = [
  { key: 'marketing', label: 'Marketing' },
  { key: 'revenue', label: 'Revenue' },
  { key: 'ops', label: 'Operations' },
  { key: 'product', label: 'Product' },
  { key: 'finance', label: 'Finance' },
  { key: 'people', label: 'People' },
];

type Step = 'pick' | 'shape' | 'review';

export default function NewAgentPage() {
  const router = useRouter();

  // Page-wide state
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [envId, setEnvId] = useState<string>('');
  const [blueprints, setBlueprints] = useState<BlueprintSummary[]>([]);
  const [step, setStep] = useState<Step>('pick');

  // Blueprint flow state
  const [picked, setPicked] = useState<BlueprintSummary | null>(null);
  const [questions, setQuestions] = useState<
    Array<{ key: string; label: string; placeholder: string; default?: string; kind?: string }>
  >([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [shaping, setShaping] = useState(false);
  const [shapeResult, setShapeResult] = useState<ShapeResponse | null>(null);
  const [refining, setRefining] = useState(false);

  // Final agent state (review step)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('◆');
  const [promptTemplate, setPromptTemplate] = useState('');
  const [model, setModel] = useState('claude-sonnet-4-6');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/environments')
      .then((r) => r.json())
      .then((envs: Environment[]) => {
        setEnvironments(envs);
        if (envs.length > 0) setEnvId(envs[0].id);
      });
    fetch('/api/agents/templates')
      .then((r) => r.json())
      .then((data: BlueprintSummary[]) => setBlueprints(data));
  }, []);

  // ─── Blueprint flow ──────────────────────────────────────────────────────

  async function pickBlueprint(b: BlueprintSummary) {
    setPicked(b);
    setShapeResult(null);
    // Fetch the full question list for this blueprint via a shape
    // call with empty answers. The hydrated prompt returned here is
    // the "before refinement" baseline.
    if (!envId) return;
    setShaping(true);
    const res = await fetch(`/api/agents/templates/${b.id}/shape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environmentId: envId, answers: {}, refine: false }),
    });
    const data = await res.json();
    // We don't ship question defs in the summary list — fetch them
    // by importing the module-level questions map. For now the shape
    // endpoint doesn't return them either, so we fall back to the
    // second round-trip: the /shape endpoint is authoritative for the
    // prompt; questions are fetched in parallel from /templates/[id]
    // (a separate GET would be overkill). Inline the question set
    // here by calling a secondary endpoint.
    const qs = await fetch(`/api/agents/templates/${b.id}`).then((r) => r.json()).catch(() => null);
    if (qs?.questions) setQuestions(qs.questions);
    setShapeResult(data);
    setShaping(false);
    setStep('shape');
  }

  async function handleShape(refine: boolean) {
    if (!picked || !envId) return;
    refine ? setRefining(true) : setShaping(true);
    const res = await fetch(`/api/agents/templates/${picked.id}/shape`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ environmentId: envId, answers, refine }),
    });
    const data: ShapeResponse = await res.json();
    setShapeResult(data);
    refine ? setRefining(false) : setShaping(false);
  }

  function adoptShapedPrompt(useRefined: boolean) {
    if (!shapeResult || !picked) return;
    const finalPrompt =
      useRefined && shapeResult.refinedPrompt ? shapeResult.refinedPrompt : shapeResult.prompt;
    setName(shapeResult.defaultName);
    setDescription(shapeResult.defaultDescription);
    setEmoji(shapeResult.emoji);
    setPromptTemplate(finalPrompt);
    setStep('review');
  }

  function startFromScratch() {
    setPicked(null);
    setShapeResult(null);
    setQuestions([]);
    setName('');
    setDescription('');
    setEmoji('◆');
    setPromptTemplate('');
    setStep('review');
  }

  // ─── Final submit ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!envId || !name.trim() || !promptTemplate.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environmentId: envId,
          name: name.trim(),
          description: description.trim() || undefined,
          emoji: emoji || undefined,
          promptTemplate: promptTemplate.trim(),
          model,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to create agent');
        setSaving(false);
        return;
      }
      router.push(`/agents/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create agent');
      setSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="px-10 py-10 min-h-screen max-w-4xl">
      <Link
        href="/agents"
        className="text-xs font-light mb-8 inline-flex items-center gap-1.5"
        style={{ color: 'var(--text-3)' }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M6 2L3 5l3 3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Agents
      </Link>

      <StepBreadcrumbs step={step} onJump={(s) => setStep(s)} hasPicked={!!picked} />

      {/* Environment picker lives above every step when >1 envs */}
      {environments.length > 1 && (
        <div className="mb-6">
          <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
            For which environment?
          </label>
          <select
            value={envId}
            onChange={(e) => setEnvId(e.target.value)}
            className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none appearance-none max-w-xs"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              color: 'rgba(255,255,255,0.8)',
            }}
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id} style={{ background: '#111' }}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 'pick' && (
        <PickStep
          blueprints={blueprints}
          onPick={pickBlueprint}
          onScratch={startFromScratch}
        />
      )}

      {step === 'shape' && picked && shapeResult && (
        <ShapeStep
          blueprint={picked}
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          shapeResult={shapeResult}
          shaping={shaping}
          refining={refining}
          onReshape={() => handleShape(false)}
          onRefine={() => handleShape(true)}
          onAdopt={adoptShapedPrompt}
          onBack={() => setStep('pick')}
        />
      )}

      {step === 'review' && (
        <ReviewStep
          name={name}
          setName={setName}
          description={description}
          setDescription={setDescription}
          emoji={emoji}
          setEmoji={setEmoji}
          promptTemplate={promptTemplate}
          setPromptTemplate={setPromptTemplate}
          model={model}
          setModel={setModel}
          saving={saving}
          error={error}
          envId={envId}
          onSubmit={handleSubmit}
          onBack={() => (picked ? setStep('shape') : setStep('pick'))}
        />
      )}
    </div>
  );
}

// ─── Step 0 · Breadcrumbs ────────────────────────────────────────────────────

function StepBreadcrumbs({
  step,
  onJump,
  hasPicked,
}: {
  step: Step;
  onJump: (s: Step) => void;
  hasPicked: boolean;
}) {
  const steps: Array<{ key: Step; label: string }> = [
    { key: 'pick', label: 'Pick' },
    { key: 'shape', label: 'Shape' },
    { key: 'review', label: 'Review' },
  ];
  return (
    <div className="flex items-center gap-2 mb-8 text-xs">
      {steps.map((s, i) => {
        const active = s.key === step;
        const reachable = s.key === 'pick' || (s.key === 'shape' && hasPicked) || s.key === 'review';
        return (
          <div key={s.key} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!reachable}
              onClick={() => reachable && onJump(s.key)}
              className="px-3 py-1 rounded-full tracking-[0.12em] transition-all disabled:opacity-30"
              style={{
                background: active ? 'var(--brand-soft)' : 'rgba(255,255,255,0.04)',
                border: active
                  ? '1px solid var(--brand-border)'
                  : '1px solid rgba(255,255,255,0.08)',
                color: active ? 'var(--brand)' : 'var(--text-3)',
              }}
            >
              {`${i + 1}. ${s.label}`}
            </button>
            {i < steps.length - 1 && (
              <span style={{ color: 'var(--text-3)', opacity: 0.4 }}>·</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1 · Pick a blueprint ───────────────────────────────────────────────

function PickStep({
  blueprints,
  onPick,
  onScratch,
}: {
  blueprints: BlueprintSummary[];
  onPick: (b: BlueprintSummary) => void;
  onScratch: () => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-extralight tracking-tight mb-2">Start with a blueprint</h1>
      <p className="text-xs mb-8 max-w-xl" style={{ color: 'var(--text-3)' }}>
        A blueprint is a shape of thinking, not a persona. Pick one that sounds close to what you
        want — the next step asks a few questions so this agent comes out specific to your
        business, not a clone of somebody else&apos;s.
      </p>

      {CATEGORY_ORDER.map(({ key, label }) => {
        const group = blueprints.filter((b) => b.category === key);
        if (group.length === 0) return null;
        return (
          <div key={key} className="mb-8">
            <p
              className="text-[10px] tracking-[0.18em] mb-3"
              style={{ color: 'var(--text-3)' }}
            >
              {label.toUpperCase()}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => onPick(b)}
                  className="text-left p-5 rounded-xl transition-all hover:scale-[1.005]"
                  style={{
                    background: 'var(--glass)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      {b.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>
                        {b.title}
                      </p>
                      <p
                        className="text-xs font-light mt-1 leading-relaxed"
                        style={{ color: 'var(--text-3)' }}
                      >
                        {b.tagline}
                      </p>
                      <p
                        className="text-[10px] mt-3 tracking-wider"
                        style={{ color: 'var(--text-3)', opacity: 0.6 }}
                      >
                        {b.questionCount} SHAPING QUESTIONS →
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );
      })}

      <div
        className="mt-10 pt-6 flex items-center justify-between"
        style={{ borderTop: '1px solid var(--glass-border)' }}
      >
        <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
          Don&apos;t see what you need?
        </p>
        <button
          type="button"
          onClick={onScratch}
          className="text-xs font-light px-4 py-2 rounded-lg transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-2)',
          }}
        >
          Start from scratch →
        </button>
      </div>
    </div>
  );
}

// ─── Step 2 · Shape the blueprint ────────────────────────────────────────────

function ShapeStep({
  blueprint,
  questions,
  answers,
  setAnswers,
  shapeResult,
  shaping,
  refining,
  onReshape,
  onRefine,
  onAdopt,
  onBack,
}: {
  blueprint: BlueprintSummary;
  questions: Array<{
    key: string;
    label: string;
    placeholder: string;
    default?: string;
    kind?: string;
  }>;
  answers: Record<string, string>;
  setAnswers: (a: Record<string, string>) => void;
  shapeResult: ShapeResponse;
  shaping: boolean;
  refining: boolean;
  onReshape: () => void;
  onRefine: () => void;
  onAdopt: (useRefined: boolean) => void;
  onBack: () => void;
}) {
  const hasRefined = !!shapeResult.refinedPrompt;
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {blueprint.emoji}
        </div>
        <div>
          <h1 className="text-xl font-extralight tracking-tight">{blueprint.title}</h1>
          <p className="text-xs" style={{ color: 'var(--text-3)' }}>
            {blueprint.tagline}
          </p>
        </div>
      </div>

      <p className="text-xs mb-6 max-w-xl" style={{ color: 'var(--text-3)' }}>
        Answer as much as you can — anything left blank gets a sensible default. The prompt
        regenerates as you answer.
      </p>

      <div className="space-y-4 mb-6">
        {questions.map((q) => (
          <div key={q.key}>
            <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
              {q.label}
            </label>
            {q.kind === 'textarea' ? (
              <textarea
                value={answers[q.key] ?? ''}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                placeholder={q.placeholder}
                rows={2}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'white',
                }}
              />
            ) : (
              <input
                value={answers[q.key] ?? ''}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                placeholder={q.placeholder}
                className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--glass-border)',
                  color: 'white',
                }}
              />
            )}
            {q.default && !answers[q.key] && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-3)' }}>
                Default: {q.default}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <button
          type="button"
          onClick={onReshape}
          disabled={shaping || refining}
          className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'var(--text-2)',
          }}
        >
          {shaping ? 'Regenerating…' : 'Regenerate prompt'}
        </button>
        <button
          type="button"
          onClick={onRefine}
          disabled={shaping || refining}
          className="text-xs font-light px-4 py-2 rounded-lg transition-all disabled:opacity-40"
          style={{
            background: 'var(--nova-soft)',
            border: '1px solid rgba(191,159,241,0.3)',
            color: 'var(--nova)',
          }}
        >
          {refining ? 'Refining with Claude…' : '✧ Refine for my business'}
        </button>
      </div>

      {shapeResult.refineError && (
        <div
          className="mb-4 p-3 rounded-lg text-xs"
          style={{
            background: 'rgba(220,180,60,0.08)',
            border: '1px solid rgba(220,180,60,0.25)',
            color: '#d4a855',
          }}
        >
          {shapeResult.refineError}
        </div>
      )}

      {/* Hydrated prompt preview */}
      <div
        className="p-5 rounded-xl mb-4"
        style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
            HYDRATED PROMPT
          </p>
          <button
            type="button"
            onClick={() => onAdopt(false)}
            className="text-xs font-light px-3 py-1 rounded-lg transition-all"
            style={{
              background: 'rgba(21,173,112,0.1)',
              border: '1px solid rgba(21,173,112,0.25)',
              color: '#15AD70',
            }}
          >
            Use this →
          </button>
        </div>
        <pre
          className="text-xs font-mono font-light whitespace-pre-wrap break-words"
          style={{ color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, margin: 0 }}
        >
          {shapeResult.prompt}
        </pre>
      </div>

      {hasRefined && shapeResult.refinedPrompt && (
        <div
          className="p-5 rounded-xl mb-6"
          style={{
            background: 'rgba(191,159,241,0.04)',
            border: '1px solid rgba(191,159,241,0.2)',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.18em]" style={{ color: 'var(--nova)' }}>
              ✧ REFINED FOR YOUR BUSINESS
            </p>
            <button
              type="button"
              onClick={() => onAdopt(true)}
              className="text-xs font-light px-3 py-1 rounded-lg transition-all"
              style={{
                background: 'var(--nova-soft)',
                border: '1px solid rgba(191,159,241,0.3)',
                color: 'var(--nova)',
              }}
            >
              Use this →
            </button>
          </div>
          <pre
            className="text-xs font-mono font-light whitespace-pre-wrap break-words"
            style={{ color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, margin: 0 }}
          >
            {shapeResult.refinedPrompt}
          </pre>
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="text-xs font-light"
        style={{ color: 'var(--text-3)' }}
      >
        ← Back to blueprints
      </button>
    </div>
  );
}

// ─── Step 3 · Review & create ────────────────────────────────────────────────

function ReviewStep({
  name,
  setName,
  description,
  setDescription,
  emoji,
  setEmoji,
  promptTemplate,
  setPromptTemplate,
  model,
  setModel,
  saving,
  error,
  envId,
  onSubmit,
  onBack,
}: {
  name: string;
  setName: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  emoji: string;
  setEmoji: (v: string) => void;
  promptTemplate: string;
  setPromptTemplate: (v: string) => void;
  model: string;
  setModel: (v: string) => void;
  saving: boolean;
  error: string | null;
  envId: string;
  onSubmit: (e: React.FormEvent) => void | Promise<void>;
  onBack: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <h1 className="text-2xl font-extralight tracking-tight mb-1">Review &amp; create</h1>
      <p className="text-xs mb-6" style={{ color: 'var(--text-3)' }}>
        This is your agent — every field here is editable. When you&apos;re ready, hit create and
        you&apos;ll land on the detail page to run it.
      </p>

      <div className="flex gap-3">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
          maxLength={2}
          className="w-14 text-center text-lg rounded-lg focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: 'white',
          }}
        />
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name this agent"
          autoFocus
          className="flex-1 text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: 'white',
          }}
        />
      </div>

      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
          Description <span style={{ opacity: 0.5 }}>(optional)</span>
        </label>
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What does this agent do?"
          className="w-full text-sm font-light px-3 py-2 rounded-lg focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            color: 'white',
          }}
        />
      </div>

      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
          Model
        </label>
        <div className="grid grid-cols-3 gap-2">
          {MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setModel(m.id)}
              className="text-left p-3 rounded-lg transition-all"
              style={{
                background:
                  model === m.id ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${
                  model === m.id ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'
                }`,
              }}
            >
              <p
                className="text-xs font-light"
                style={{
                  color: model === m.id ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
                }}
              >
                {m.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-3)' }}>
                {m.hint}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-xs mb-1.5 block" style={{ color: 'var(--text-3)' }}>
          Prompt
        </label>
        <textarea
          value={promptTemplate}
          onChange={(e) => setPromptTemplate(e.target.value)}
          placeholder="Write or paste the prompt…"
          rows={16}
          className="w-full text-sm font-light px-3 py-3 rounded-lg focus:outline-none font-mono"
          style={{
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--glass-border)',
            color: 'rgba(255,255,255,0.9)',
            lineHeight: 1.6,
          }}
        />
      </div>

      {error && (
        <p className="text-xs" style={{ color: '#dc6b6b' }}>
          {error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={!envId || !name.trim() || !promptTemplate.trim() || saving}
          className="text-xs font-light px-5 py-2.5 rounded-lg transition-all disabled:opacity-40"
          style={{
            background: 'rgba(21,173,112,0.1)',
            border: '1px solid rgba(21,173,112,0.25)',
            color: '#15AD70',
          }}
        >
          {saving ? 'Creating…' : 'Create agent'}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-light"
          style={{ color: 'var(--text-3)' }}
        >
          ← Back
        </button>
      </div>
    </form>
  );
}
