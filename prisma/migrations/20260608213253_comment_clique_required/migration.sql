-- Contract phase: drop any legacy null-clique comments (written before PR 3 gated
-- all comment POSTs on a cliqueId), then enforce the NOT NULL constraint.
-- Safe because the API has required cliqueId since the clique-scoped-comments PR;
-- no new null rows can be created.

-- DeleteMany: remove orphaned comments that pre-date clique-scoped enforcement
DELETE FROM "Comment" WHERE "cliqueId" IS NULL;

-- AlterTable: set the column NOT NULL now that all remaining rows have a value
ALTER TABLE "Comment" ALTER COLUMN "cliqueId" SET NOT NULL;
