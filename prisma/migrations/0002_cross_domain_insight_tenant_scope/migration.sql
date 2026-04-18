-- Add tenant scope to CrossDomainInsight. Nullable for back-compat:
-- pre-migration rows stay accessible as read-only demo data, new rows
-- are required to set environmentId (enforced at the API layer).

-- AlterTable
ALTER TABLE "CrossDomainInsight"
  ADD COLUMN "environmentId" TEXT;

-- AddForeignKey
ALTER TABLE "CrossDomainInsight"
  ADD CONSTRAINT "CrossDomainInsight_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "CrossDomainInsight_environmentId_idx"
  ON "CrossDomainInsight"("environmentId");
