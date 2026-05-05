-- Closed-beta invite flow.
-- Adds the Invite model for single-use, time-bound signup tokens, and
-- the WaitlistEntry.invitedAt back-reference so the admin view can
-- show "invited" without joining.

ALTER TABLE "WaitlistEntry"
  ADD COLUMN "invitedAt" TIMESTAMP(3);

CREATE TABLE "Invite" (
  "id"          TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "email"       TEXT NOT NULL,
  "tokenHash"   TEXT NOT NULL,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "usedAt"      TIMESTAMP(3),
  "issuedById"  TEXT,
  "cohort"      TEXT,
  CONSTRAINT "Invite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invite_tokenHash_key" ON "Invite" ("tokenHash");
CREATE INDEX "Invite_email_idx" ON "Invite" ("email");
CREATE INDEX "Invite_expiresAt_idx" ON "Invite" ("expiresAt");
CREATE INDEX "Invite_usedAt_idx" ON "Invite" ("usedAt");
