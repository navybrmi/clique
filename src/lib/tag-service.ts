/**
 * Tag tracking and promotion service
 * Handles tracking tag usage and promoting tags when they reach the threshold
 */

import { prisma } from "@/lib/prisma";
import { isHardcodedMovieTag, normalizeTag } from "@/lib/movie-tags";

const TAG_PROMOTION_THRESHOLD = 20;

/**
 * Track tag usage and handle promotion
 * If a tag is not hardcoded and reaches the promotion threshold, it becomes promoted
 *
 * @param tag - The tag text to track
 * @param categoryId - The category ID this tag belongs to
 * @returns The updated or created CommunityTag record
 * @throws Error if database operation fails
 */
export async function trackTagUsage(tag: string, categoryId: string) {
  const normalizedTag = normalizeTag(tag);

  // Don't track hardcoded tags (they're always available)
  if (isHardcodedMovieTag(normalizedTag)) {
    return null;
  }

  try {
    // Find existing community tag
    let communityTag = await prisma.communityTag.findUnique({
      where: {
        tag_categoryId: {
          tag: normalizedTag,
          categoryId,
        },
      },
    });

    if (communityTag) {
      // Increment usage count
      communityTag = await prisma.communityTag.update({
        where: { id: communityTag.id },
        data: { usageCount: { increment: 1 } },
      });

      // Check if should be promoted
      if (
        communityTag.usageCount >= TAG_PROMOTION_THRESHOLD &&
        !communityTag.isPromoted
      ) {
        communityTag = await prisma.communityTag.update({
          where: { id: communityTag.id },
          data: { isPromoted: true },
        });

        console.log(
          `✨ Tag promoted to precanned: "${normalizedTag}" (usage: ${communityTag.usageCount})`
        );
      }
    } else {
      // Create new community tag
      communityTag = await prisma.communityTag.create({
        data: {
          tag: normalizedTag,
          categoryId,
          usageCount: 1,
          isPromoted: false,
        },
      });
    }

    return communityTag;
  } catch (error) {
    console.error("Error tracking tag usage:", error);
    throw error;
  }
}

/**
 * Track multiple tags from a recommendation
 * Useful when creating or updating recommendations
 *
 * @param tags - Array of tags to track
 * @param categoryId - The category ID
 */
export async function trackMultipleTags(tags: string[], categoryId: string) {
  const results = await Promise.all(
    tags.map((tag) => trackTagUsage(tag, categoryId).catch((err) => {
      console.error(`Failed to track tag "${tag}":`, err);
      return null;
    }))
  );

  return results.filter((r) => r !== null);
}

/**
 * Get all promoted tags for a category
 * These are community tags that have been promoted to precanned status
 *
 * @param categoryId - The category ID to get promoted tags for
 * @returns Array of promoted tag strings
 */
export async function getPromotedTagsForCategory(
  categoryId: string
): Promise<string[]> {
  try {
    const promotedTags = await prisma.communityTag.findMany({
      where: {
        categoryId,
        isPromoted: true,
      },
      select: { tag: true },
      orderBy: { usageCount: "desc" },
    });

    return promotedTags.map((t) => t.tag);
  } catch (error) {
    console.error("Error fetching promoted tags:", error);
    return [];
  }
}

/**
 * Get tag usage statistics (useful for admin dashboard)
 * Returns tags that are close to promotion threshold
 *
 * @param categoryId - The category ID
 * @param limit - Maximum number of results to return
 * @returns Array of tags with usage counts
 */
export async function getTagUsageStats(
  categoryId: string,
  limit: number = 10
) {
  try {
    const stats = await prisma.communityTag.findMany({
      where: { categoryId },
      select: { tag: true, usageCount: true, isPromoted: true, createdAt: true },
      orderBy: { usageCount: "desc" },
      take: limit,
    });

    return stats;
  } catch (error) {
    console.error("Error fetching tag usage stats:", error);
    return [];
  }
}
