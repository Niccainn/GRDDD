-- EnvironmentInvitation — email invite → accept flow → EnvironmentMembership
CREATE TABLE "EnvironmentInvitation" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "email" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'CONTRIBUTOR',
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "environmentId" TEXT NOT NULL,
  "inviterId" TEXT NOT NULL,
  CONSTRAINT "EnvironmentInvitation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "EnvironmentInvitation" ADD CONSTRAINT "EnvironmentInvitation_environmentId_fkey"
  FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EnvironmentInvitation" ADD CONSTRAINT "EnvironmentInvitation_inviterId_fkey"
  FOREIGN KEY ("inviterId") REFERENCES "Identity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "EnvironmentInvitation_tokenHash_key" ON "EnvironmentInvitation"("tokenHash");
CREATE INDEX "EnvironmentInvitation_environmentId_idx" ON "EnvironmentInvitation"("environmentId");
CREATE INDEX "EnvironmentInvitation_tokenHash_idx" ON "EnvironmentInvitation"("tokenHash");
