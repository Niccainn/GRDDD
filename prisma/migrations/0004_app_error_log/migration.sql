-- Self-hosted error log — zero external SaaS dependency.
-- Writes from lib/observability/errors.ts; read by the admin tools
-- and the hardened /api/health readiness probe.

CREATE TABLE "AppError" (
  "id"            TEXT PRIMARY KEY,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "level"         TEXT NOT NULL,
  "scope"         TEXT NOT NULL,
  "message"       TEXT NOT NULL,
  "environmentId" TEXT,
  "identityId"    TEXT,
  "context"       TEXT
);

CREATE INDEX "AppError_createdAt_idx"     ON "AppError"("createdAt");
CREATE INDEX "AppError_scope_idx"         ON "AppError"("scope");
CREATE INDEX "AppError_level_idx"         ON "AppError"("level");
CREATE INDEX "AppError_environmentId_idx" ON "AppError"("environmentId");
