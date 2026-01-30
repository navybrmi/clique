/**
 * API endpoint to fetch tags for a specific category
 * Returns both hardcoded and promoted community tags
 */

import { NextRequest, NextResponse } from "next/server";
import { getHardcodedMovieTags, normalizeTagForComparison } from "@/lib/movie-tags";
import { getPromotedTagsForCategory } from "@/lib/tag-service";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/tags
 * Query parameters:
 *   - categoryName: (required) The category name (e.g., "MOVIE")
 *   - promoted: (optional) If true, only return promoted tags; if false, only hardcoded
 *
 * Response: { tags: string[] }
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
      }
      // Can add other categories here later
    } else {
      // Return combined: hardcoded + promoted with case-insensitive deduplication
      if (categoryName === "MOVIE") {
        const hardcodedTags = getHardcodedMovieTags();
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
      // Can add other categories here later
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
