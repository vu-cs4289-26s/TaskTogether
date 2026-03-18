-- CreateTable
CREATE TABLE "WikiSection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "householdId" TEXT NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "WikiSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WikiSection_householdId_idx" ON "WikiSection"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "WikiSection_householdId_slug_key" ON "WikiSection"("householdId", "slug");

-- AddForeignKey
ALTER TABLE "WikiSection" ADD CONSTRAINT "WikiSection_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WikiSection" ADD CONSTRAINT "WikiSection_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
