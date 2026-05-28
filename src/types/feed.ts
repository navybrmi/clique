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
}
