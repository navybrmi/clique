import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

interface LikeCountsProps {
  /** Total likes across all cliques (including ones the user isn't in). */
  total: number
  /**
   * Likes attributable to the user's cliques. On the public feed this is the
   * "my-cliques" figure. `null` for logged-out users, where only the total shows.
   */
  secondary: number | null
  className?: string
}

/**
 * Display-only like counts for a feed card. Always shows the global total; when
 * `secondary` is provided, also shows the count from the user's own cliques.
 * Not interactive — liking happens within a clique context.
 */
export function LikeCounts({ total, secondary, className }: LikeCountsProps) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        className="flex items-center gap-1"
        aria-label={`${total} likes across all cliques`}
      >
        <ArrowUp className="h-4 w-4" aria-hidden="true" />
        {total}
      </span>
      {secondary !== null && (
        <span
          className="text-xs text-amber-600 dark:text-amber-500"
          aria-label={`${secondary} likes from your cliques`}
        >
          {secondary} in your cliques
        </span>
      )}
    </span>
  )
}
