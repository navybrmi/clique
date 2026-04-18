"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, MessageCircle, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionsSidebarProps {
  /** Initial recommendation data with counts */
  recommendation: any
  /** Callback when comment count changes */
  onCommentCountChange?: (count: number) => void
  /**
   * When provided, the upvote button becomes interactive and votes are
   * scoped to this clique. When absent, the upvote button is hidden
   * (public feed context).
   */
  cliqueId?: string | null
  /** Whether the current user has already upvoted this recommendation */
  initialHasUpvoted?: boolean
}

export function ActionsSidebar({
  recommendation,
  onCommentCountChange,
  cliqueId,
  initialHasUpvoted = false,
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
        <div className="flex items-start justify-around pt-2">
          {cliqueId && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "flex flex-col h-auto py-2",
                hasUpvoted && "text-indigo-500"
              )}
              onClick={handleUpvoteClick}
              disabled={isUpvoteLoading}
              aria-label={hasUpvoted ? "Remove upvote" : "Upvote"}
            >
              <ArrowUp className={cn("h-5 w-5", hasUpvoted && "fill-current")} />
              <span className="text-xs mt-1">{upvoteCount}</span>
            </Button>
          )}
          <Button variant="ghost" size="icon" className="flex flex-col h-auto py-2">
            <MessageCircle className="h-5 w-5" />
            <span className="text-xs mt-1">{commentCount}</span>
          </Button>
          <Button variant="ghost" size="icon" className="py-2">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
