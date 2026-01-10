/*
  Warnings:

  - The primary key for the `Fashion` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Household` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Movie` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Other` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Restaurant` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[entityId]` on the table `Fashion` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entityId]` on the table `Household` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entityId]` on the table `Movie` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entityId]` on the table `Other` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[entityId]` on the table `Restaurant` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Fashion" DROP CONSTRAINT "Fashion_pkey";

-- AlterTable
ALTER TABLE "Household" DROP CONSTRAINT "Household_pkey";

-- AlterTable
ALTER TABLE "Movie" DROP CONSTRAINT "Movie_pkey";

-- AlterTable
ALTER TABLE "Other" DROP CONSTRAINT "Other_pkey";

-- AlterTable
ALTER TABLE "Restaurant" DROP CONSTRAINT "Restaurant_pkey";

-- CreateTable
CREATE TABLE "CommunityTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 1,
    "isPromoted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunityTag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommunityTag_categoryId_idx" ON "CommunityTag"("categoryId");

-- CreateIndex
CREATE INDEX "CommunityTag_usageCount_idx" ON "CommunityTag"("usageCount");

-- CreateIndex
CREATE INDEX "CommunityTag_isPromoted_idx" ON "CommunityTag"("isPromoted");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityTag_tag_categoryId_key" ON "CommunityTag"("tag", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Fashion_entityId_key" ON "Fashion"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Household_entityId_key" ON "Household"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Movie_entityId_key" ON "Movie"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Other_entityId_key" ON "Other"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Restaurant_entityId_key" ON "Restaurant"("entityId");

-- AddForeignKey
ALTER TABLE "CommunityTag" ADD CONSTRAINT "CommunityTag_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
