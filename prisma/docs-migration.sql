-- Migration: Add Document table for Notion-like content workspace
-- Run against your database to add the Document model.

CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL DEFAULT 'Untitled',
    "content" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "coverImage" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "environmentId" TEXT NOT NULL,
    "identityId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Document_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_identityId_fkey" FOREIGN KEY ("identityId") REFERENCES "Identity" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Document_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Document" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Document_environmentId_idx" ON "Document"("environmentId");
CREATE INDEX "Document_parentId_idx" ON "Document"("parentId");
CREATE INDEX "Document_identityId_idx" ON "Document"("identityId");
