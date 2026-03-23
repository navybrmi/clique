import { NextRequest, NextResponse } from "next/server";
import { getHardcodedMovieTags, normalizeTagForComparison } from "@/lib/movie-tags";
import { getHardcodedRestaurantTags } from "@/lib/restaurant-tags";
import { getPromotedTagsForCategory } from "@/lib/tag-service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tags
 *
 * Returns tag suggestions for a given category, combining hardcoded curated tags
 * and community-promoted tags (those that have reached 20+ uses). Duplicates are
 * removed with a case-insensitive comparison, preserving hardcoded casing.
 *
 * Query Parameters:
 * - `categoryName` (required) — category name, e.g. `"MOVIE"` or `"RESTAURANT"`.
 * - `promoted` (optional) — `"true"` returns only promoted community tags;
 *   `"false"` returns only hardcoded tags; omitting returns both combined.
 *
 * @param request - Incoming Next.js request with `categoryName` and optional `promoted` params
 * @returns {Promise<NextResponse>} JSON object with shape `{ categoryName, tags, count }`
 * @throws {400} When `categoryName` query parameter is missing
 * @throws {404} When the specified category does not exist in the database
 * @throws {500} When a database or unexpected error occurs
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryName = searchParams.get("categoryName");
    const promoted = searchParams.get("promoted");

    if (!categoryName) {
      return NextResponse.json(
        { error: "categoryName query parameter is required" },
        { status: 400 }
      );
    }

    // Find category by name
    const category = await prisma.category.findUnique({
      where: { name: categoryName },
    });

    if (!category) {
      return NextResponse.json(
        { error: `Category "${categoryName}" not found` },
        { status: 404 }
      );
    }

    let tags: string[] = [];

    // Determine which tags to return based on promoted filter
    if (promoted === "true") {
      // Only promoted tags
      tags = await getPromotedTagsForCategory(category.id);
    } else if (promoted === "false") {
      // Only hardcoded tags
      if (categoryName === "MOVIE") {
        tags = getHardcodedMovieTags();
      } else if (categoryName === "RESTAURANT") {
        tags = getHardcodedRestaurantTags();
      }
    } else {
      // Return combined: hardcoded + promoted with case-insensitive deduplication
      let hardcodedTags: string[] = [];
      if (categoryName === "MOVIE") {
        hardcodedTags = getHardcodedMovieTags();
      } else if (categoryName === "RESTAURANT") {
        hardcodedTags = getHardcodedRestaurantTags();
      }

      if (hardcodedTags.length > 0) {
        const promotedTags = await getPromotedTagsForCategory(category.id);

        // Deduplicate using case-insensitive comparison
        const tagMap = new Map<string, string>();

        // Add hardcoded tags first (preserve their casing)
        hardcodedTags.forEach(tag => {
          tagMap.set(normalizeTagForComparison(tag), tag);
        });

        // Add promoted tags only if not already present (case-insensitive check)
        promotedTags.forEach(tag => {
          const normalized = normalizeTagForComparison(tag);
          if (!tagMap.has(normalized)) {
            tagMap.set(normalized, tag);
          }
        });

        tags = Array.from(tagMap.values());
      }
    }

    return NextResponse.json({
      categoryName,
      tags,
      count: tags.length,
    });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}
