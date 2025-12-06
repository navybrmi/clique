-- Step 0: Drop the old Category enum first
DROP TYPE IF EXISTS "Category" CASCADE;

-- Step 1: Create Category table
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
CREATE INDEX IF NOT EXISTS "Category_name_idx" ON "Category"("name");

-- Step 2: Insert default categories
INSERT INTO "Category" (id, name, "displayName", "description", icon, "isActive", "createdAt", "updatedAt")
VALUES 
  ('cat-restaurant', 'RESTAURANT', 'Restaurant', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-movie', 'MOVIE', 'Movie', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-fashion', 'FASHION', 'Fashion', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-household', 'HOUSEHOLD', 'Household', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-other', 'OTHER', 'Other', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Create Entity table
CREATE TABLE IF NOT EXISTS "Entity" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Entity_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Entity_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Entity_name_idx" ON "Entity"("name");
CREATE INDEX IF NOT EXISTS "Entity_categoryId_idx" ON "Entity"("categoryId");

-- Step 4: Create category-specific tables
CREATE TABLE IF NOT EXISTS "Restaurant" (
    "entityId" TEXT NOT NULL PRIMARY KEY,
    "cuisine" TEXT,
    "location" TEXT,
    "priceRange" TEXT,
    "hours" TEXT,
    "phoneNumber" TEXT,
    "placeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Restaurant_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Restaurant_placeId_idx" ON "Restaurant"("placeId");
CREATE INDEX IF NOT EXISTS "Restaurant_location_idx" ON "Restaurant"("location");

CREATE TABLE IF NOT EXISTS "Movie" (
    "entityId" TEXT NOT NULL PRIMARY KEY,
    "director" TEXT,
    "year" INTEGER,
    "genre" TEXT,
    "duration" TEXT,
    "attributes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tmdbId" TEXT,
    "imdbId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Movie_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Movie_tmdbId_idx" ON "Movie"("tmdbId");
CREATE INDEX IF NOT EXISTS "Movie_imdbId_idx" ON "Movie"("imdbId");

CREATE TABLE IF NOT EXISTS "Fashion" (
    "entityId" TEXT NOT NULL PRIMARY KEY,
    "brand" TEXT,
    "price" TEXT,
    "size" TEXT,
    "color" TEXT,
    "season" TEXT,
    "material" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Fashion_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Household" (
    "entityId" TEXT NOT NULL PRIMARY KEY,
    "productType" TEXT,
    "model" TEXT,
    "purchaseLink" TEXT,
    "warranty" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Household_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Other" (
    "entityId" TEXT NOT NULL PRIMARY KEY,
    "customFields" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Other_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Step 5: Migrate data from Recommendation to Entity and category-specific tables
-- Only if the column still exists (it might have been dropped by DROP CASCADE)
INSERT INTO "Entity" (id, name, "categoryId", "createdAt", "updatedAt")
SELECT 
  CONCAT('ent-', r.id),
  COALESCE(r."title", 'Unknown'),
  'cat-other',
  r."createdAt",
  r."updatedAt"
FROM "Recommendation" r
WHERE NOT EXISTS (SELECT 1 FROM "Entity" WHERE id = CONCAT('ent-', r.id))
ON CONFLICT DO NOTHING;

-- Step 6: Add new columns to Recommendation table
ALTER TABLE "Recommendation" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Recommendation" ADD COLUMN IF NOT EXISTS "entityId" TEXT;

-- Step 7: Migrate tags from description
UPDATE "Recommendation" r
SET 
  "tags" = CASE 
    WHEN r."description" IS NOT NULL AND r."description" != '' 
    THEN ARRAY[r."description"]
    ELSE ARRAY[]::TEXT[]
  END,
  "entityId" = CONCAT('ent-', r.id)
WHERE r."entityId" IS NULL;

-- Step 8: Drop old columns from Recommendation
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "brand" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "category" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "color" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "cuisine" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "description" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "director" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "duration" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "genre" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "hours" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "location" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "model" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "movieAttributes" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "price" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "priceRange" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "productType" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "purchaseLink" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "size" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "title" CASCADE;
ALTER TABLE "Recommendation" DROP COLUMN IF EXISTS "year" CASCADE;

-- Step 9: Add entityId NOT NULL constraint and foreign key
ALTER TABLE "Recommendation" ALTER COLUMN "entityId" SET NOT NULL;
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "Entity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 10: Drop and recreate indexes
DROP INDEX IF EXISTS "Recommendation_category_idx";
CREATE INDEX IF NOT EXISTS "Recommendation_userId_idx" ON "Recommendation"("userId");
CREATE INDEX IF NOT EXISTS "Recommendation_entityId_idx" ON "Recommendation"("entityId");
CREATE INDEX IF NOT EXISTS "Recommendation_createdAt_idx" ON "Recommendation"("createdAt");
