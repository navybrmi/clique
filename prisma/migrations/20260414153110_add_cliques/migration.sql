-- CreateEnum
CREATE TYPE "CliqueInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CLIQUE_INVITE');

-- CreateTable
CREATE TABLE "Clique" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CliqueMember" (
    "cliqueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliqueMember_pkey" PRIMARY KEY ("cliqueId","userId")
);

-- CreateTable
CREATE TABLE "CliqueInvite" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "cliqueId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "email" TEXT,
    "status" "CliqueInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliqueInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CliqueRecommendation" (
    "cliqueId" TEXT NOT NULL,
    "recommendationId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CliqueRecommendation_pkey" PRIMARY KEY ("cliqueId","recommendationId")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Clique_creatorId_idx" ON "Clique"("creatorId");

-- CreateIndex
CREATE INDEX "CliqueMember_userId_idx" ON "CliqueMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CliqueInvite_token_key" ON "CliqueInvite"("token");

-- CreateIndex
CREATE INDEX "CliqueInvite_cliqueId_idx" ON "CliqueInvite"("cliqueId");

-- CreateIndex
CREATE INDEX "CliqueInvite_token_idx" ON "CliqueInvite"("token");

-- CreateIndex
CREATE INDEX "CliqueRecommendation_recommendationId_idx" ON "CliqueRecommendation"("recommendationId");

-- CreateIndex
CREATE INDEX "CliqueRecommendation_addedById_idx" ON "CliqueRecommendation"("addedById");

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- AddForeignKey
ALTER TABLE "Clique" ADD CONSTRAINT "Clique_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueMember" ADD CONSTRAINT "CliqueMember_cliqueId_fkey" FOREIGN KEY ("cliqueId") REFERENCES "Clique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueMember" ADD CONSTRAINT "CliqueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueInvite" ADD CONSTRAINT "CliqueInvite_cliqueId_fkey" FOREIGN KEY ("cliqueId") REFERENCES "Clique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueInvite" ADD CONSTRAINT "CliqueInvite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueRecommendation" ADD CONSTRAINT "CliqueRecommendation_cliqueId_fkey" FOREIGN KEY ("cliqueId") REFERENCES "Clique"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueRecommendation" ADD CONSTRAINT "CliqueRecommendation_recommendationId_fkey" FOREIGN KEY ("recommendationId") REFERENCES "Recommendation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CliqueRecommendation" ADD CONSTRAINT "CliqueRecommendation_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
