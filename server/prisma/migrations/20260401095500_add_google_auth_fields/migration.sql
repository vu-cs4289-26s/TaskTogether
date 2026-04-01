ALTER TABLE "User"
ADD COLUMN "googleId" TEXT,
ADD COLUMN "googleEmail" TEXT;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
