import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';

/**
 * POST /api/lessons/[id]/complete
 *
 * Marks a lesson complete for the authenticated learner, advances
 * their Enrollment progress, and — when the course finishes — writes
 * a NovaMemory entry tagged with the course's `skillTag` so the
 * SkillSpace graph picks up the advancement.
 *
 * This is the GRID wedge: learning advances the same skill graph the
 * org's work is graded against. Sana keeps fluency and Learn in
 * separate products.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { id } = await params;

  const lesson = await prisma.lesson.findFirst({
    where: {
      id,
      module: {
        course: {
          environment: {
            deletedAt: null,
            OR: [
              { ownerId: identity.id },
              { memberships: { some: { identityId: identity.id } } },
            ],
          },
        },
      },
    },
    include: {
      quiz: { include: { questions: true } },
      module: { include: { course: { select: { id: true, environmentId: true, skillTag: true, title: true } } } },
    },
  });
  if (!lesson) return Response.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const quizScore: number | null = typeof body.quizScore === 'number' ? body.quizScore : null;

  if (lesson.quiz && (lesson.quiz.questions?.length ?? 0) > 0) {
    if (quizScore === null) {
      return Response.json({ error: 'Quiz score required for this lesson' }, { status: 400 });
    }
    if (quizScore < lesson.quiz.passingScore) {
      return Response.json({ error: 'Quiz score below passing', passing: lesson.quiz.passingScore }, { status: 400 });
    }
  }

  // Ensure enrollment exists
  const enrollment = await prisma.enrollment.upsert({
    where: { identityId_courseId: { identityId: identity.id, courseId: lesson.module.course.id } },
    create: { identityId: identity.id, courseId: lesson.module.course.id },
    update: {},
  });

  // Record completion
  await prisma.lessonCompletion.upsert({
    where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: id } },
    create: { enrollmentId: enrollment.id, lessonId: id, quizScore },
    update: { quizScore },
  });

  // Recompute progress
  const totalLessons = await prisma.lesson.count({
    where: { module: { courseId: lesson.module.course.id } },
  });
  const completedCount = await prisma.lessonCompletion.count({
    where: { enrollmentId: enrollment.id },
  });
  const progress = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;
  const justFinished = progress === 100 && enrollment.status !== 'COMPLETED';

  const updatedEnrollment = await prisma.enrollment.update({
    where: { id: enrollment.id },
    data: {
      progress,
      status: justFinished ? 'COMPLETED' : enrollment.status,
      completedAt: justFinished ? new Date() : enrollment.completedAt,
    },
  });

  // Skill advancement — the wedge. On course completion with a skillTag,
  // write a NovaMemory row so the SkillSpace graph reflects it.
  if (justFinished && lesson.module.course.skillTag) {
    await prisma.novaMemory.create({
      data: {
        title: `Skill advanced: ${lesson.module.course.skillTag}`,
        content: `Completed course "${lesson.module.course.title}" — advances skill ${lesson.module.course.skillTag}.`,
        type: 'pattern',
        category: lesson.module.course.skillTag,
        source: 'execution_analysis',
        environmentId: lesson.module.course.environmentId,
        confidence: 0.9,
      },
    }).catch(() => {
      // Non-fatal: course completion still succeeds if memory write fails.
    });
  }

  return Response.json({
    enrollment: updatedEnrollment,
    progress,
    justFinished,
    skillAdvanced: justFinished ? lesson.module.course.skillTag : null,
  });
}
