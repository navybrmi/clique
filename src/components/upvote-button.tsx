"use client"

import { useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/**
 * Inline upvote toggle for recommendation cards in the clique feed.
 *
 * Clicking the button POSTs to the upvote API with the given `cliqueId` (which
 * the API uses to gate the vote on clique membership). Clicking again DELETEs
 * the vote. The component updates its own count and active state optimistically
 * on a successful response, and calls `stopPropagation` so it works inside a
 * card that is itself a link.
 *
 * @param props.recommendationId - ID of the recommendation being voted on.
 * @param props.cliqueId - Clique ID sent to the API for membership gating.
 * @param props.initialCount - Server-rendered upvote count used to initialise state.
 * @param props.initialHasUpvoted - Whether the current user has already upvoted.
 */
interface UpvoteButtonProps {
  recommendationId: string
  cliqueId: string
  initialCount: number
  initialHasUpvoted: boolean
}

export function UpvoteButton({
  recommendationId,
  cliqueId,
  initialCount,
  initialHasUpvoted,
}: UpvoteButtonProps) {
  const [count, setCount] = useState(initialCount)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isLoading) return
    setIsLoading(true)
    try {
      const url = hasUpvoted
        ? `/api/recommendations/${recommendationId}/upvotes`
        : `/api/recommendations/${recommendationId}/upvotes?cliqueId=${cliqueId}`
      const res = await fetch(url, { method: hasUpvoted ? "DELETE" : "POST" })
      if (res.ok) {
        const data = await res.json()
        setCount(data.upvotes)
        setHasUpvoted(!hasUpvoted)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={isLoading}
            className={cn(
              "flex items-center gap-1 transition-colors",
              hasUpvoted
                ? "text-indigo-500"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            aria-label={hasUpvoted ? "Remove upvote" : "Upvote"}
          >
            <ArrowUp className={cn("h-4 w-4", hasUpvoted && "fill-current")} />
            {count}
          </button>
        </TooltipTrigger>
        <TooltipContent>{hasUpvoted ? "Remove upvote" : "Upvote"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
