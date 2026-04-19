-- Task.sourceSignalId — provenance link from inbox signal → task.
-- Enables the one-click "Turn signal into task" conversion without
-- losing the original signal context. SET NULL on delete so deleting
-- an old signal doesn't cascade-remove tasks that were inspired by it.

ALTER TABLE "Task"
  ADD COLUMN "sourceSignalId" TEXT;

ALTER TABLE "Task"
  ADD CONSTRAINT "Task_sourceSignalId_fkey"
  FOREIGN KEY ("sourceSignalId") REFERENCES "Signal"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Task_sourceSignalId_idx" ON "Task"("sourceSignalId");
