-- GDPR Article 7 — provable consent.
-- Append-only log: if a user withdraws consent, a new row with
-- granted=false is written. Existing rows never mutate.
-- identityId nullable so consent captured before an account is
-- created (e.g. at waitlist) still has a home.

CREATE TABLE "ConsentLog" (
  "id"            TEXT PRIMARY KEY,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "identityId"    TEXT,
  "kind"          TEXT NOT NULL,
  "granted"       BOOLEAN NOT NULL,
  "policyVersion" TEXT NOT NULL,
  "ipHash"        TEXT,
  "userAgent"     TEXT,
  "metadata"      TEXT,
  CONSTRAINT "ConsentLog_identity_fkey"
    FOREIGN KEY ("identityId") REFERENCES "Identity"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ConsentLog_identityId_idx" ON "ConsentLog"("identityId");
CREATE INDEX "ConsentLog_kind_idx"       ON "ConsentLog"("kind");
CREATE INDEX "ConsentLog_createdAt_idx"  ON "ConsentLog"("createdAt");
