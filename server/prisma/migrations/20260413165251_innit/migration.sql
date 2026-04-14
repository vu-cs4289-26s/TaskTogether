/*
  Warnings:

  - You are about to drop the column `photoUrl` on the `Issue` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Issue" DROP COLUMN "photoUrl",
ADD COLUMN     "photoUrls" TEXT[];
