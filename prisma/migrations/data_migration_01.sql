-- Data Migration Script
-- This should be run BEFORE applying the Prisma migration
-- Run from postgres console: psql -h <host> -U <user> -d <db> -f data_migration.sql

-- Disable foreign key constraints temporarily
ALTER TABLE "Recommendation" DISABLE TRIGGER ALL;

-- Create temp tables for backup
CREATE TABLE "Recommendation_backup" AS SELECT * FROM "Recommendation";

-- Create Category records
INSERT INTO "Category" (id, name, "displayName", "description", icon, "isActive", "createdAt", "updatedAt")
VALUES 
  ('cat-restaurant', 'RESTAURANT', 'Restaurant', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-movie', 'MOVIE', 'Movie', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-fashion', 'FASHION', 'Fashion', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-household', 'HOUSEHOLD', 'Household', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('cat-other', 'OTHER', 'Other', NULL, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

-- Create Entity records from Recommendations
INSERT INTO "Entity" (id, name, "categoryId", "createdAt", "updatedAt")
SELECT 
  CONCAT('ent-', r.id),
  COALESCE(r."title", 'Unknown'),
  CASE r."category"::text
    WHEN 'RESTAURANT' THEN 'cat-restaurant'
    WHEN 'MOVIE' THEN 'cat-movie'
    WHEN 'FASHION' THEN 'cat-fashion'
    WHEN 'HOUSEHOLD' THEN 'cat-household'
    ELSE 'cat-other'
  END,
  r."createdAt",
  r."updatedAt"
FROM "Recommendation_backup" r
ON CONFLICT DO NOTHING;

-- Create Restaurant records
INSERT INTO "Restaurant" ("entityId", "cuisine", "location", "priceRange", "hours", "createdAt", "updatedAt")
SELECT CONCAT('ent-', r.id), r."cuisine", r."location", r."priceRange", r."hours", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Recommendation_backup" r
WHERE r."category"::text = 'RESTAURANT' AND (r."cuisine" IS NOT NULL OR r."location" IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Create Movie records
INSERT INTO "Movie" ("entityId", "director", "year", "genre", "duration", "attributes", "createdAt", "updatedAt")
SELECT CONCAT('ent-', r.id), r."director", r."year", r."genre", r."duration", r."movieAttributes", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Recommendation_backup" r
WHERE r."category"::text = 'MOVIE' AND (r."director" IS NOT NULL OR r."year" IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Create Fashion records
INSERT INTO "Fashion" ("entityId", "brand", "price", "size", "color", "createdAt", "updatedAt")
SELECT CONCAT('ent-', r.id), r."brand", r."price", r."size", r."color", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Recommendation_backup" r
WHERE r."category"::text = 'FASHION' AND (r."brand" IS NOT NULL OR r."price" IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Create Household records
INSERT INTO "Household" ("entityId", "productType", "model", "purchaseLink", "createdAt", "updatedAt")
SELECT CONCAT('ent-', r.id), r."productType", r."model", r."purchaseLink", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Recommendation_backup" r
WHERE r."category"::text = 'HOUSEHOLD' AND (r."productType" IS NOT NULL OR r."model" IS NOT NULL)
ON CONFLICT DO NOTHING;

-- Create Other records
INSERT INTO "Other" ("entityId", "customFields", "createdAt", "updatedAt")
SELECT CONCAT('ent-', r.id), NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Recommendation_backup" r
WHERE r."category"::text = 'OTHER'
ON CONFLICT DO NOTHING;

-- Update Recommendation table with tags and entityId
UPDATE "Recommendation" r
SET 
  "tags" = CASE 
    WHEN rb."description" IS NOT NULL AND rb."description" != '' 
    THEN ARRAY[rb."description"] 
    ELSE ARRAY[]::TEXT[] 
  END,
  "entityId" = CONCAT('ent-', rb.id)
FROM "Recommendation_backup" rb
WHERE r.id = rb.id;

-- Re-enable triggers
ALTER TABLE "Recommendation" ENABLE TRIGGER ALL;

COMMIT;
