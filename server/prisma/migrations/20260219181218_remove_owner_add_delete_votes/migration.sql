/*
  Warnings:

  - You are about to drop the column `ownerId` on the `Household` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Household" DROP CONSTRAINT "Household_ownerId_fkey";

-- DropIndex
DROP INDEX "Household_ownerId_idx";

-- AlterTable
ALTER TABLE "Household" DROP COLUMN "ownerId";

-- CreateTable
CREATE TABLE "HouseholdDeleteVote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "householdId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,

    CONSTRAINT "HouseholdDeleteVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HouseholdDeleteVote_householdId_idx" ON "HouseholdDeleteVote"("householdId");

-- CreateIndex
CREATE INDEX "HouseholdDeleteVote_voterId_idx" ON "HouseholdDeleteVote"("voterId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdDeleteVote_householdId_voterId_key" ON "HouseholdDeleteVote"("householdId", "voterId");

-- AddForeignKey
ALTER TABLE "HouseholdDeleteVote" ADD CONSTRAINT "HouseholdDeleteVote_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdDeleteVote" ADD CONSTRAINT "HouseholdDeleteVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
