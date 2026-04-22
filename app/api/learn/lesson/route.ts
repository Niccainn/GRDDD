/**
 * GET /api/learn/lesson — today's lesson from Nova.
 *
 * Picks a deterministic lesson based on (a) the user's weakest
 * fluency capability and (b) the day of the year. Same user on the
 * same day sees the same lesson; weak capabilities get more airtime.
 *
 * A "lesson" is a short prompt paired with a question the user can
 * answer in one line. Answering it writes a NovaMemory entry so
 * Nova can fold the answer into future prompts. The loop is:
 *
 *    Nova asks → user teaches → Nova remembers → Nova acts better.
 *
 * POST /api/learn/lesson { answer, lessonId } — records the answer
 * as a NovaMemory entry with source = 'user_input' so future
 * computeFluency() runs count it toward context-giving.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { computeFluency, type FluencyCapability } from '@/lib/learn/fluency';

type Lesson = {
  id: string;
  capability: FluencyCapability | 'general';
  title: string;
  body: string;
  prompt: string;
  placeholder: string;
};

const LESSONS: Lesson[] = [
  {
    id: 'delegation-1',
    capability: 'delegation',
    title: 'What should Nova never do without asking?',
    body: "The fastest path to trusting Nova is naming the lines it must not cross. Tell it once and it'll remember.",
    prompt: 'What is one decision Nova should always escalate to you, no matter how confident it is?',
    placeholder: 'e.g. Never send an email to a client I have not personally approved.',
  },
  {
    id: 'delegation-2',
    capability: 'delegation',
    title: 'What do you hate doing on Monday morning?',
    body: 'Nova turns the thing you hate into a Workflow. The more specific the hate, the cleaner the automation.',
    prompt: 'Name one recurring Monday-morning chore that costs you more than ten minutes.',
    placeholder: 'e.g. Pulling weekend ticket numbers from three dashboards into one update.',
  },
  {
    id: 'review-1',
    capability: 'review',
    title: 'The single most important number on your work',
    body: 'A team optimizes what it measures. Nova can only help you move a number if you tell it which number matters.',
    prompt: 'What is the one number you most want to move this quarter?',
    placeholder: 'e.g. Cycle time from lead received to first response, p90.',
  },
  {
    id: 'review-2',
    capability: 'review',
    title: 'When is "good enough" actually good enough?',
    body: 'Perfectionism is expensive. Teach Nova the bar so it stops polishing past it.',
    prompt: 'For your most common work, how do you know when to stop iterating?',
    placeholder: 'e.g. A client email is done when it answers the question and costs them nothing to act on.',
  },
  {
    id: 'context-1',
    capability: 'context-giving',
    title: 'The unwritten rule of your team',
    body: 'Every team has one — the thing everybody knows but nobody writes down. Write it down now.',
    prompt: 'What is the one unwritten rule a new hire would need a month to learn?',
    placeholder: 'e.g. Never schedule a call on Fridays without asking. Fridays are deep work.',
  },
  {
    id: 'context-2',
    capability: 'context-giving',
    title: 'The last time Nova got it wrong',
    body: 'Corrections are the fastest tuning signal there is. Describe the miss in one line.',
    prompt: 'Think of the last time Nova proposed something you overrode — what was missing from its context?',
    placeholder: 'e.g. It suggested replying to a customer — but that customer is churning and needs a call from me, not an email.',
  },
  {
    id: 'trust-1',
    capability: 'trust-calibration',
    title: 'Where you tend to overcorrect',
    body: 'Most operators intervene more than they need to. Spotting the pattern is the first move.',
    prompt: 'Which one type of Nova action do you always second-guess, even when it ends up being right?',
    placeholder: 'e.g. Summary notes after meetings — I rewrite them every time. Nova is usually fine.',
  },
  {
    id: 'general-1',
    capability: 'general',
    title: 'The one thing you want to own in 12 months',
    body: 'Nova runs toward a goal best. Tell it where "there" is.',
    prompt: 'What outcome would make the next 12 months a clear success for you?',
    placeholder: 'e.g. Get inbound triage to zero touch by end of Q3. I stop reading email first thing.',
  },
];

function pickLesson(weakest: FluencyCapability | null): Lesson {
  // Two-part hash: capability filter + day-of-year rotation.
  const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
  const pool = weakest
    ? LESSONS.filter(l => l.capability === weakest)
    : LESSONS;
  const fallback = pool.length > 0 ? pool : LESSONS;
  return fallback[day % fallback.length];
}

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const { scores } = await computeFluency(identity.id);
  // Weakest capability — ties broken toward context-giving, which has
  // the highest teaching payoff.
  const weakest = scores.reduce<FluencyCapability | null>((acc, s) => {
    if (!acc) return s.capability;
    const accScore = scores.find(x => x.capability === acc)!.score;
    return s.score < accScore ? s.capability : acc;
  }, null);

  return Response.json({ lesson: pickLesson(weakest), weakestCapability: weakest });
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const lessonId = typeof body.lessonId === 'string' ? body.lessonId : null;
  const answer = typeof body.answer === 'string' ? body.answer.trim() : '';
  if (!lessonId || !answer) {
    return Response.json({ error: 'lessonId and answer required' }, { status: 400 });
  }
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return Response.json({ error: 'Unknown lesson' }, { status: 404 });

  // Record the answer as a NovaMemory. Future fluency computations
  // count this toward context-giving; future Nova prompts can RAG it.
  const memory = await prisma.novaMemory.create({
    data: {
      type: 'learned_preference',
      category: lesson.capability,
      title: lesson.title,
      content: `Lesson: ${lesson.prompt}\nAnswer: ${answer}`,
      source: 'user_input',
      confidence: 0.95,
    },
    select: { id: true },
  });

  return Response.json({ ok: true, memoryId: memory.id });
}
