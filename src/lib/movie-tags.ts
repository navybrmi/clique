/**
 * Hardcoded movie tag suggestions
 * These are curated tags that are always available to users
 * Additional tags can be promoted from the community tag system when they reach 20+ uses
 */

export const MOVIE_TAG_SUGGESTIONS: string[] = [
  "Great cinematography",
  "Compelling story",
  "Excellent acting",
  "Outstanding soundtrack",
  "Emotional",
  "Mind-bending",
  "Entertaining",
  "Thought-provoking",
  "Stunning visuals",
  "Great direction",
  "Perfect casting",
  "Great adaptation",
  "Great pacing",
  "Excellent dialogue",
  "Original score",
  "Cinematic art",
  "Action-packed",
  "Suspenseful",
  "Comedy gold",
  "Inspiring",
];

/**
 * Get all hardcoded movie tags as an array of strings
 * @returns Array of movie tag suggestions
 */
export function getHardcodedMovieTags(): string[] {
  return MOVIE_TAG_SUGGESTIONS;
}

/**
 * Check if a tag is a hardcoded tag (case-insensitive)
 * @param tag - The tag to check
 * @returns True if tag is in the hardcoded suggestions
 */
export function isHardcodedMovieTag(tag: string): boolean {
  const normalized = normalizeTagForComparison(tag);
  return getHardcodedMovieTags().some(
    (t) => normalizeTagForComparison(t) === normalized
  );
}

/**
 * Normalize a tag for comparison only
 * Converts to lowercase and trims whitespace for case-insensitive comparison
 * @param tag - The tag to normalize
 * @returns Normalized tag (lowercase, trimmed)
 */
export function normalizeTagForComparison(tag: string): string {
  return tag.toLowerCase().trim();
}
