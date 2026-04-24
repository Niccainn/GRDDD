-- Meeting intelligence — transcript / summary / recording + action items.
ALTER TABLE "Meeting" ADD COLUMN "transcript" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "summary" TEXT;
ALTER TABLE "Meeting" ADD COLUMN "recordingUrl" TEXT;

CREATE TABLE "MeetingActionItem" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "text" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "promotedToType" TEXT,
  "promotedToId" TEXT,
  "meetingId" TEXT NOT NULL,
  CONSTRAINT "MeetingActionItem_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "MeetingActionItem" ADD CONSTRAINT "MeetingActionItem_meetingId_fkey"
  FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MeetingActionItem_meetingId_idx" ON "MeetingActionItem"("meetingId");
CREATE INDEX "MeetingActionItem_status_idx" ON "MeetingActionItem"("status");

-- LEARN: Course → Module → Lesson + Quiz + Enrollment + LessonCompletion.
CREATE TABLE "Course" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "coverUrl" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "skillTag" TEXT,
  "environmentId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Course" ADD CONSTRAINT "Course_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Course" ADD CONSTRAINT "Course_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Course_environmentId_idx" ON "Course"("environmentId");
CREATE INDEX "Course_authorId_idx" ON "Course"("authorId");
CREATE INDEX "Course_published_idx" ON "Course"("published");

CREATE TABLE "Module" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  "courseId" TEXT NOT NULL,
  CONSTRAINT "Module_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Module" ADD CONSTRAINT "Module_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Module_courseId_idx" ON "Module"("courseId");
CREATE INDEX "Module_courseId_order_idx" ON "Module"("courseId", "order");

CREATE TABLE "Lesson" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "videoUrl" TEXT,
  "estimatedMinutes" INTEGER,
  "order" INTEGER NOT NULL DEFAULT 0,
  "moduleId" TEXT NOT NULL,
  CONSTRAINT "Lesson_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_moduleId_fkey"
  FOREIGN KEY ("moduleId") REFERENCES "Module"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Lesson_moduleId_idx" ON "Lesson"("moduleId");
CREATE INDEX "Lesson_moduleId_order_idx" ON "Lesson"("moduleId", "order");

CREATE TABLE "Quiz" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "passingScore" INTEGER NOT NULL DEFAULT 70,
  "lessonId" TEXT NOT NULL,
  CONSTRAINT "Quiz_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Quiz_lessonId_key" ON "Quiz"("lessonId");

ALTER TABLE "Quiz" ADD CONSTRAINT "Quiz_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "QuizQuestion" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prompt" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'MCQ',
  "choices" TEXT,
  "correctAnswer" TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  "quizId" TEXT NOT NULL,
  CONSTRAINT "QuizQuestion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "QuizQuestion" ADD CONSTRAINT "QuizQuestion_quizId_fkey"
  FOREIGN KEY ("quizId") REFERENCES "Quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "QuizQuestion_quizId_idx" ON "QuizQuestion"("quizId");

CREATE TABLE "Enrollment" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ENROLLED',
  "progress" INTEGER NOT NULL DEFAULT 0,
  "completedAt" TIMESTAMP(3),
  "identityId" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Enrollment_identityId_courseId_key" ON "Enrollment"("identityId", "courseId");

ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_identityId_fkey"
  FOREIGN KEY ("identityId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey"
  FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Enrollment_courseId_idx" ON "Enrollment"("courseId");
CREATE INDEX "Enrollment_status_idx" ON "Enrollment"("status");

CREATE TABLE "LessonCompletion" (
  "id" TEXT NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "quizScore" INTEGER,
  "enrollmentId" TEXT NOT NULL,
  "lessonId" TEXT NOT NULL,
  CONSTRAINT "LessonCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LessonCompletion_enrollmentId_lessonId_key" ON "LessonCompletion"("enrollmentId", "lessonId");

ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LessonCompletion" ADD CONSTRAINT "LessonCompletion_lessonId_fkey"
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "LessonCompletion_lessonId_idx" ON "LessonCompletion"("lessonId");
