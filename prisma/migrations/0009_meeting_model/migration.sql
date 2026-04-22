-- Meeting model — native scheduled meetings shown on the calendar
CREATE TABLE "Meeting" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime" TIMESTAMP(3) NOT NULL,
  "location" TEXT,
  "videoLink" TEXT,
  "attendees" TEXT,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "environmentId" TEXT NOT NULL,
  "creatorId" TEXT NOT NULL,
  CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Meeting" ADD CONSTRAINT "Meeting_creatorId_fkey"
  FOREIGN KEY ("creatorId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Meeting_environmentId_idx" ON "Meeting"("environmentId");
CREATE INDEX "Meeting_startTime_idx" ON "Meeting"("startTime");
CREATE INDEX "Meeting_creatorId_idx" ON "Meeting"("creatorId");
