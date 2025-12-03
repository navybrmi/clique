-- AlterTable
ALTER TABLE "Recommendation" ADD COLUMN     "movieAttributes" TEXT[] DEFAULT ARRAY[]::TEXT[];
