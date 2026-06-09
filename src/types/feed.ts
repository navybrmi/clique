import type { RecommendationFeedItem } from "@/lib/recommendations"

export type HomeFeedItem = {
  id: string
  tags: string[]
  rating: number | null
  imageUrl: string | null
  link: string | null
  entity: RecommendationFeedItem["entity"]
  _count: {
    upvotes: number
    comments: number
  }
  attribution: string | null
  href: string
  upvoteContext?: {
    cliqueId: string
    hasUpvoted: boolean
  }
  /**
   * Display-only like figures for the card. `likeTotal` is the global count
   * across all cliques; `likeSecondary` is the count attributable to the user's
   * own cliques (the "my-cliques" sum on the public feed), or `null` when logged
   * out. Absent when engagement has not been computed for the item.
   */
  engagement?: {
    likeTotal: number
    likeSecondary: number | null
  }
  /**
   * Up to two cliques the recommendation belongs to that the current user is
   * also a member of (largest by member count), each linking to its clique feed.
   */
  cliqueChips?: { id: string; name: string }[]
}
