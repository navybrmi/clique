-- CreateEnum
CREATE TYPE "CliqueMembershipRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'CLIQUE_JOIN_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE 'CLIQUE_JOIN_APPROVED';
ALTER TYPE "NotificationType" ADD VALUE 'CLIQUE_JOIN_REJECTED';

-- CreateTable
CREATE TABLE "CliqueMembershipRequest" (
    "id" TEXT NOT NULL,
    "cliqueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inviteToken" TEXT NOT NULL,
    "status" "CliqueMembershipRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "CliqueMembershipRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CliqueMembershipRequest_cliqueId_status_idx" ON "CliqueMembershipRequest"("cliqueId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CliqueMembershipRequest_cliqueId_userId_key" ON "CliqueMembershipRequest"("cliqueId", "userId");

-- AddForeignKey
ALTER TABLE "CliqueMembershipRequest" ADD CONSTRAINT "CliqueMembershipRequest_cliqueId_fkey" FOREIGN KEY ("cliqueId") REFERENCES "Clique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueMembershipRequest" ADD CONSTRAINT "CliqueMembershipRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
