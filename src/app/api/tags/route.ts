/**
 * API endpoint to fetch tags for a specific category
 * Returns both hardcoded and promoted community tags
 */

import { NextRequest, NextResponse } from "next/server";
import { getHardcodedMovieTags } from "@/lib/movie-tags";
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
      // Return combined: hardcoded + promoted
      if (categoryName === "MOVIE") {
        const hardcodedTags = getHardcodedMovieTags();
        const promotedTags = await getPromotedTagsForCategory(category.id);
        // Combine and deduplicate
        tags = Array.from(new Set([...hardcodedTags, ...promotedTags]));
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
