-- CreateTable
CREATE TABLE "Canvas" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "widgets" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "deletedAt" TIMESTAMP(3),
    "environmentId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,

    CONSTRAINT "Canvas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Canvas_environmentId_idx" ON "Canvas"("environmentId");

-- CreateIndex
CREATE INDEX "Canvas_ownerId_idx" ON "Canvas"("ownerId");

-- CreateIndex
CREATE INDEX "Canvas_environmentId_position_idx" ON "Canvas"("environmentId", "position");

-- AddForeignKey
ALTER TABLE "Canvas" ADD CONSTRAINT "Canvas_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "Environment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Canvas" ADD CONSTRAINT "Canvas_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "Identity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
