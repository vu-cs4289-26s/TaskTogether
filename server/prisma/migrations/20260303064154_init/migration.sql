-- CreateEnum
CREATE TYPE "IssuePriority" AS ENUM ('URGENT', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('MAINTENANCE', 'HOUSEMATE_CONFLICT', 'NOISE_COMPLAINT', 'CLEANLINESS', 'OTHER');

-- DropIndex
DROP INDEX "Issue_createdAt_idx";

-- DropIndex
DROP INDEX "Issue_reportedById_idx";

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "priority" "IssuePriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "type" "IssueType" NOT NULL DEFAULT 'MAINTENANCE';

-- CreateIndex
CREATE INDEX "Issue_type_idx" ON "Issue"("type");

-- CreateIndex
CREATE INDEX "Issue_priority_idx" ON "Issue"("priority");
