-- Expand phase: add a nullable cliqueId to Comment so existing rows remain valid.
-- A later migration (comment_clique_required) drops legacy null-clique comments and
-- sets this column NOT NULL once all live comments are clique-scoped.

-- AlterTable
ALTER TABLE "Comment" ADD COLUMN "cliqueId" TEXT;

-- CreateIndex
CREATE INDEX "Comment_recommendationId_cliqueId_idx" ON "Comment"("recommendationId", "cliqueId");

-- CreateIndex
CREATE INDEX "Comment_cliqueId_idx" ON "Comment"("cliqueId");

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_cliqueId_fkey" FOREIGN KEY ("cliqueId") REFERENCES "Clique"("id") ON DELETE CASCADE ON UPDATE CASCADE;
