/**
 * Tag tracking and promotion service
 * Handles tracking tag usage and promoting tags when they reach the threshold
 */

import { prisma } from "@/lib/prisma";
import { isHardcodedMovieTag } from "@/lib/movie-tags";
import { isHardcodedRestaurantTag } from "@/lib/restaurant-tags";

const TAG_PROMOTION_THRESHOLD = 20;

/**
 * Track tag usage and handle promotion
 * If a tag is not hardcoded and reaches the promotion threshold, it becomes promoted
 *
 * @param tag - The tag text to track (will be stored in original case)
 * @param categoryId - The category ID this tag belongs to
 * @returns Promise<CommunityTag | null> - The updated or created CommunityTag record, or null for hardcoded tags
 * @throws Error if database operation fails
 */
export async function trackTagUsage(
  tag: string,
  categoryId: string
): Promise<any | null> {
  const trimmedTag = tag.trim();

  // Don't track hardcoded tags (they're always available)
  if (isHardcodedMovieTag(trimmedTag) || isHardcodedRestaurantTag(trimmedTag)) {
    return null;
  }

  try {
    // Atomically create or update community tag to avoid race conditions
    let communityTag = await prisma.communityTag.upsert({
      where: {
        tag_categoryId: {
          tag: trimmedTag,
          categoryId,
        },
      },
      update: {
        usageCount: {
          increment: 1,
        },
      },
      create: {
        tag: trimmedTag,
        categoryId,
        usageCount: 1,
        isPromoted: false,
      },
    });

    // Check if should be promoted after usage count update
    if (
      communityTag.usageCount >= TAG_PROMOTION_THRESHOLD &&
      !communityTag.isPromoted
    ) {
      communityTag = await prisma.communityTag.update({
        where: { id: communityTag.id },
        data: { isPromoted: true },
      });

      console.log(
        '✨ Tag promoted to precanned:',
        trimmedTag,
        `(usage: ${communityTag.usageCount})`
      );
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
 * @returns Promise resolving to array of successfully tracked CommunityTag objects (failed tags filtered out)
 */
export async function trackMultipleTags(tags: string[], categoryId: string) {
  const results = await Promise.all(
    tags.map((tag) => trackTagUsage(tag, categoryId).catch((err) => {
      console.error("Failed to track tag:", tag, err);
      return null;
    }))
  );

  return results.filter((r) => r !== null);
}

/**
 * Decrement tag usage count when a tag is removed from a recommendation
 * If usage count reaches 0, the tag is deleted
 * If usage count drops below threshold, the tag is demoted
 *
 * @param tag - The tag text to decrement (will be matched case-insensitively)
 * @param categoryId - The category ID this tag belongs to
 * @returns Promise<CommunityTag | null> - The updated CommunityTag record, or null if not found or hardcoded
 * @throws Error if database operation fails
 */
export async function decrementTagUsage(
  tag: string,
  categoryId: string
): Promise<any | null> {
  const trimmedTag = tag.trim();

  // Don't track hardcoded tags (they're always available)
  if (isHardcodedMovieTag(trimmedTag) || isHardcodedRestaurantTag(trimmedTag)) {
    return null;
  }

  try {
    // Find the community tag (case-insensitive match)
    const existingTag = await prisma.communityTag.findUnique({
      where: {
        tag_categoryId: {
          tag: trimmedTag,
          categoryId,
        },
      },
    });

    if (!existingTag) {
      return null;
    }

    const newUsageCount = existingTag.usageCount - 1;

    // If usage count reaches 0, delete the tag
    if (newUsageCount <= 0) {
      await prisma.communityTag.delete({
        where: { id: existingTag.id },
      });
      return null;
    }

    // Update usage count and check if should be demoted
    let updatedTag = await prisma.communityTag.update({
      where: { id: existingTag.id },
      data: {
        usageCount: newUsageCount,
      },
    });

    // Demote if usage count drops below threshold
    if (
      newUsageCount < TAG_PROMOTION_THRESHOLD &&
      existingTag.isPromoted
    ) {
      updatedTag = await prisma.communityTag.update({
        where: { id: existingTag.id },
        data: { isPromoted: false },
      });

      console.log(
        '⬇️ Tag demoted from precanned:',
        trimmedTag,
        `(usage: ${newUsageCount})`
      );
    }

    return updatedTag;
  } catch (error) {
    console.error("Error decrementing tag usage:", error);
    throw error;
  }
}

/**
 * Decrement usage count for multiple tags
 * Useful when deleting or updating recommendations
 *
 * @param tags - Array of tags to decrement
 * @param categoryId - The category ID
 */
export async function decrementMultipleTags(tags: string[], categoryId: string) {
  const results = await Promise.all(
    tags.map((tag) => decrementTagUsage(tag, categoryId).catch((err) => {
      console.error(`Failed to decrement tag "${tag}":`, err);
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
