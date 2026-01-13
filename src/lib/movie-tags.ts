/**
 * Hardcoded movie tag suggestions
 * These are curated tags that are always available to users
 * Additional tags can be promoted from the community tag system when they reach 20+ uses
 */

export const MOVIE_TAG_SUGGESTIONS: Record<string, string> = {
  cinematography: "Great cinematography",
  story: "Compelling story",
  acting: "Excellent acting",
  soundtrack: "Outstanding soundtrack",
  emotionalImpact: "Emotional",
  mindBending: "Mind-bending",
  entertaining: "Entertaining",
  thoughtProvoking: "Thought-provoking",
  visuals: "Stunning visuals",
  direction: "Great direction",
  casting: "Perfect casting",
  adaptation: "Great adaptation",
  pacing: "Great pacing",
  dialogue: "Excellent dialogue",
  originalScore: "Original score",
  cinematicArt: "Cinematic art",
  actionPacked: "Action-packed",
  suspenseful: "Suspenseful",
  comedyGold: "Comedy gold",
  inspiring: "Inspiring",
};

/**
 * Get all hardcoded movie tags as an array of strings
 * @returns Array of movie tag suggestions
 */
export function getHardcodedMovieTags(): string[] {
  return Object.values(MOVIE_TAG_SUGGESTIONS);
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
