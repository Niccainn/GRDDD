import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';

/**
 * PUT /api/lessons/[id]/quiz
 * Replaces the entire quiz for a lesson in one shot. Body:
 *   { passingScore?: number, questions: [{ prompt, choices: string[], correctAnswer: string (index as string) }] }
 * Delete the quiz by PUTting an empty questions array.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const { id } = await params;
  const lesson = await prisma.lesson.findFirst({
    where: { id, module: { course: { authorId: identity.id } } },
    include: { quiz: true },
  });
  if (!lesson) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json();
  const passingScore = typeof body.passingScore === 'number' ? body.passingScore : 70;
  const questions: Array<{ prompt: string; choices: string[]; correctAnswer: string }> =
    Array.isArray(body.questions) ? body.questions : [];

  if (questions.length === 0) {
    if (lesson.quiz) await prisma.quiz.delete({ where: { id: lesson.quiz.id } });
    return Response.json({ quiz: null });
  }

  const quiz = await prisma.quiz.upsert({
    where: { lessonId: id },
    create: { lessonId: id, passingScore },
    update: { passingScore },
  });

  // Replace questions: easiest correct impl for small sets.
  await prisma.quizQuestion.deleteMany({ where: { quizId: quiz.id } });
  await prisma.quizQuestion.createMany({
    data: questions.map((q, i) => ({
      quizId: quiz.id,
      prompt: String(q.prompt ?? '').trim(),
      type: 'MCQ',
      choices: JSON.stringify(q.choices ?? []),
      correctAnswer: String(q.correctAnswer ?? '0'),
      order: i,
    })),
  });

  const full = await prisma.quiz.findUnique({
    where: { id: quiz.id },
    include: { questions: { orderBy: { order: 'asc' } } },
  });
  return Response.json({ quiz: full });
}
