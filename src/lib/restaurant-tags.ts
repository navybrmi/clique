/**
 * Hardcoded restaurant tag suggestions
 * These are curated tags that are always available to users
 * Additional tags can be promoted from the community tag system when they reach 20+ uses
 */

import { normalizeTagForComparison } from "@/lib/movie-tags";

export const RESTAURANT_TAG_SUGGESTIONS: string[] = [
  "Great ambiance",
  "Excellent service",
  "Authentic cuisine",
  "Good for dates",
  "Family friendly",
  "Best brunch",
  "Fast delivery",
  "Cozy atmosphere",
  "Outdoor seating",
  "Great cocktails",
  "Affordable prices",
  "Generous portions",
  "Fresh ingredients",
  "Vegan options",
  "Late night spot",
  "Perfect for groups",
  "Quick service",
  "Beautiful presentation",
  "Live music",
  "Hidden gem",
];

/**
 * Get all hardcoded restaurant tags as an array of strings
 * @returns Array of restaurant tag suggestions
 */
export function getHardcodedRestaurantTags(): string[] {
  return RESTAURANT_TAG_SUGGESTIONS;
}

/**
 * Check if a tag is a hardcoded restaurant tag (case-insensitive)
 * @param tag - The tag to check
 * @returns True if tag is in the hardcoded suggestions
 */
export function isHardcodedRestaurantTag(tag: string): boolean {
  const normalized = normalizeTagForComparison(tag);
  return getHardcodedRestaurantTags().some(
    (t) => normalizeTagForComparison(t) === normalized
  );
}
