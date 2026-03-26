/*
  Warnings:

  - You are about to drop the `Announcement` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DiscussionReply` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `DiscussionThread` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Mention` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_householdId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionReply" DROP CONSTRAINT "DiscussionReply_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionReply" DROP CONSTRAINT "DiscussionReply_threadId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionThread" DROP CONSTRAINT "DiscussionThread_authorId_fkey";

-- DropForeignKey
ALTER TABLE "DiscussionThread" DROP CONSTRAINT "DiscussionThread_householdId_fkey";

-- DropForeignKey
ALTER TABLE "Mention" DROP CONSTRAINT "Mention_announcementId_fkey";

-- DropForeignKey
ALTER TABLE "Mention" DROP CONSTRAINT "Mention_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "Mention" DROP CONSTRAINT "Mention_replyId_fkey";

-- DropForeignKey
ALTER TABLE "Mention" DROP CONSTRAINT "Mention_threadId_fkey";

-- DropForeignKey
ALTER TABLE "Mention" DROP CONSTRAINT "Mention_userId_fkey";

-- DropTable
DROP TABLE "Announcement";

-- DropTable
DROP TABLE "DiscussionReply";

-- DropTable
DROP TABLE "DiscussionThread";

-- DropTable
DROP TABLE "Mention";
