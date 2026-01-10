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
 * Check if a tag is a hardcoded tag
 * @param tag - The tag to check
 * @returns True if tag is in the hardcoded suggestions
 */
export function isHardcodedMovieTag(tag: string): boolean {
  const normalizedTag = tag.toLowerCase().trim();
  return getHardcodedMovieTags().some(
    (t) => t.toLowerCase().trim() === normalizedTag
  );
}

/**
 * Normalize a tag for comparison
 * Converts to lowercase and trims whitespace
 * @param tag - The tag to normalize
 * @returns Normalized tag
 */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim();
}
