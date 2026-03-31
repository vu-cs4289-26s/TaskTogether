-- AlterTable
ALTER TABLE "User" ADD COLUMN     "timezone" TEXT,
ADD COLUMN     "timezoneAuto" BOOLEAN NOT NULL DEFAULT true;
