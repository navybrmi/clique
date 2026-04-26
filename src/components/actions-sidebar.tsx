"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, MessageCircle, Share2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"

/**
 * Renders the recommendation action rail for upvotes, comments, and sharing.
 *
 * In clique contexts (`cliqueId` provided), the upvote control is visible and
 * interactive, with the gate enforced by the `/upvotes` API route. In public
 * contexts (`cliqueId` absent), the upvote control is intentionally hidden so
 * the component does not imply global voting behaviour. The component also
 * refreshes comment counts when a `commentUpdated` browser event is dispatched.
 *
 * @param props.recommendation - Recommendation data with `_count` values used to initialise the UI.
 * @param props.onCommentCountChange - Optional callback invoked after the latest comment count is fetched.
 * @param props.cliqueId - Clique identifier that enables clique-gated upvoting when present.
 * @param props.initialHasUpvoted - Whether the current user has already upvoted in the active clique context.
 */
interface ActionsSidebarProps {
  /** Initial recommendation data with counts */
  recommendation: any
  /** Callback when comment count changes */
  onCommentCountChange?: (count: number) => void
  /**
   * When provided, the upvote button becomes interactive. The API enforces
   * clique membership before persisting the vote. When absent, the upvote
   * button is hidden (public feed context).
   */
  cliqueId?: string | null
  /** Whether the current user has already upvoted this recommendation */
  initialHasUpvoted?: boolean
  /** When provided, shows the "Add to Clique" button for logged-in users. */
  currentUserId?: string | null
}

export function ActionsSidebar({
  recommendation,
  onCommentCountChange,
  cliqueId,
  initialHasUpvoted = false,
  currentUserId,
}: ActionsSidebarProps) {
  const [commentCount, setCommentCount] = useState(recommendation._count.comments)
  const [upvoteCount, setUpvoteCount] = useState(recommendation._count.upvotes)
  const [hasUpvoted, setHasUpvoted] = useState(initialHasUpvoted)
  const [isUpvoteLoading, setIsUpvoteLoading] = useState(false)

  const updateCommentCount = async () => {
    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}`)
      if (response.ok) {
        const data = await response.json()
        const newCount = data._count?.comments || 0
        setCommentCount(newCount)
        onCommentCountChange?.(newCount)
      }
    } catch (err) {
      console.error("Error updating comment count:", err)
    }
  }

  const handleUpvoteClick = async () => {
    if (!cliqueId || isUpvoteLoading) return
    setIsUpvoteLoading(true)
    try {
      const url = hasUpvoted
        ? `/api/recommendations/${recommendation.id}/upvotes`
        : `/api/recommendations/${recommendation.id}/upvotes?cliqueId=${cliqueId}`
      const res = await fetch(url, { method: hasUpvoted ? "DELETE" : "POST" })
      if (res.ok) {
        const data = await res.json()
        setUpvoteCount(data.upvotes)
        setHasUpvoted(!hasUpvoted)
      }
    } finally {
      setIsUpvoteLoading(false)
    }
  }

  useEffect(() => {
    const handleCommentUpdate = (event: Event) => {
      if (event instanceof CustomEvent) {
        updateCommentCount()
      }
    }

    window.addEventListener("commentUpdated", handleCommentUpdate)
    return () => {
      window.removeEventListener("commentUpdated", handleCommentUpdate)
    }
  }, [recommendation.id])

  return (
    <Card>
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center justify-around pt-2">
          {cliqueId && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex flex-col h-auto py-3 px-4 text-amber-500 hover:text-amber-600",
                hasUpvoted && "text-indigo-500 hover:text-indigo-600"
              )}
              onClick={handleUpvoteClick}
              disabled={isUpvoteLoading}
              aria-label={hasUpvoted ? "Remove upvote" : "Upvote"}
            >
              <ArrowUp className={cn("h-7 w-7", hasUpvoted && "fill-current")} />
              <span className="text-xs mt-1 font-medium">{upvoteCount}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="flex flex-col h-auto py-3 px-4 text-amber-500 hover:text-amber-600"
          >
            <MessageCircle className="h-7 w-7" />
            <span className="text-xs mt-1 font-medium">{commentCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="flex flex-col h-auto py-3 px-4 text-amber-500 hover:text-amber-600"
          >
            <Share2 className="h-7 w-7" />
          </Button>
          {currentUserId && (
            <AddToCliquesDialog
              recommendationId={recommendation.id}
              recommendationName={recommendation.entity?.name ?? "this recommendation"}
              trigger={
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex flex-col h-auto py-3 px-4 text-amber-500 hover:text-amber-600"
                  aria-label="Add to your clique(s)"
                >
                  <Plus className="h-7 w-7" />
                </Button>
              }
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
