/*
  Warnings:

  - You are about to drop the `Like` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_recommendationId_fkey";

-- DropForeignKey
ALTER TABLE "Like" DROP CONSTRAINT "Like_userId_fkey";

-- DropTable
DROP TABLE "Like";

-- CreateTable
CREATE TABLE "UpVote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,

    CONSTRAINT "UpVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UpVote_userId_idx" ON "UpVote"("userId");

-- CreateIndex
CREATE INDEX "UpVote_recommendationId_idx" ON "UpVote"("recommendationId");

-- CreateIndex
CREATE UNIQUE INDEX "UpVote_userId_recommendationId_key" ON "UpVote"("userId", "recommendationId");

-- AddForeignKey
ALTER TABLE "UpVote" ADD CONSTRAINT "UpVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpVote" ADD CONSTRAINT "UpVote_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
