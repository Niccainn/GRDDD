-- Environment hierarchy. Nullable for back-compat; existing flat orgs
-- stay unchanged. Child inherits brand DNA via the application layer.
ALTER TABLE "Environment"
  ADD COLUMN "parentEnvironmentId" TEXT;

ALTER TABLE "Environment"
  ADD CONSTRAINT "Environment_parent_fkey"
  FOREIGN KEY ("parentEnvironmentId") REFERENCES "Environment"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Environment_parentEnvironmentId_idx"
  ON "Environment"("parentEnvironmentId");

-- SystemAgent. One per System at most. Stores the persona + the
-- allow-list of tools that Nova may use when operating inside that
-- system. Absence of a row = "use the env-wide agent defaults."
CREATE TABLE "SystemAgent" (
  "id"           TEXT PRIMARY KEY,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "systemId"     TEXT NOT NULL UNIQUE,
  "name"         TEXT NOT NULL,
  "persona"      TEXT NOT NULL,
  "toolAllowList" TEXT NOT NULL, -- JSON array of tool names
  "autonomyTier" TEXT NOT NULL DEFAULT 'Suggest',
  CONSTRAINT "SystemAgent_system_fkey"
    FOREIGN KEY ("systemId") REFERENCES "System"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SystemAgent_systemId_idx" ON "SystemAgent"("systemId");

-- ShapeAbstraction. Gated cross-tenant pattern library — no rows
-- flow in until privacy/legal review. Shipping the shape so the
-- downstream wiring can land without another migration.
CREATE TABLE "ShapeAbstraction" (
  "id"          TEXT PRIMARY KEY,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "shape"       TEXT NOT NULL,              -- e.g. "creative_agency_small"
  "headcount"   INTEGER,
  "medianSystems" INTEGER,
  "commonWidgets" TEXT NOT NULL,            -- JSON array
  "commonIntegrations" TEXT NOT NULL,       -- JSON array
  "sampleSize"  INTEGER NOT NULL DEFAULT 0, -- how many envs contributed
  "gated"       BOOLEAN NOT NULL DEFAULT TRUE -- flip to false only after legal
);

CREATE INDEX "ShapeAbstraction_shape_idx" ON "ShapeAbstraction"("shape");
