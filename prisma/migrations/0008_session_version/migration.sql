-- Identity.sessionVersion — bumped on plan/role/password change to invalidate old sessions
ALTER TABLE "Identity" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- Session.version — snapshot of Identity.sessionVersion at session-creation time
ALTER TABLE "Session" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
