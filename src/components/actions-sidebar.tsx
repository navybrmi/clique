"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ArrowUp, MessageCircle, Share2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddToCliquesDialog } from "@/components/add-to-cliques-dialog"

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

  const actionBtn = "flex flex-col items-center h-auto py-4 px-5 gap-1.5 rounded-xl text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
  const iconCls = "h-7 w-7"
  const labelCls = "text-[11px] font-semibold tracking-wide"

  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <TooltipProvider delayDuration={400}>
          <div className="flex items-end justify-around">

            {cliqueId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      actionBtn,
                      hasUpvoted && "text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    )}
                    onClick={handleUpvoteClick}
                    disabled={isUpvoteLoading}
                    aria-label={hasUpvoted ? "Remove upvote" : "Upvote"}
                  >
                    <ArrowUp className={cn(iconCls, hasUpvoted && "fill-current")} />
                    <span className={labelCls}>{upvoteCount}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{hasUpvoted ? "Remove upvote" : "Upvote"}</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className={actionBtn}>
                  <MessageCircle className={iconCls} />
                  <span className={labelCls}>{commentCount}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Comments</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" className={actionBtn}>
                  <Share2 className={iconCls} />
                  <span className={labelCls}>Share</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share this recommendation</TooltipContent>
            </Tooltip>

            {currentUserId && (
              <Tooltip>
                <AddToCliquesDialog
                  recommendationId={recommendation.id}
                  recommendationName={recommendation.entity?.name ?? "this recommendation"}
                  trigger={
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className={actionBtn}
                        aria-label="Add to your clique(s)"
                      >
                        <Plus className={iconCls} />
                        <span className={labelCls}>Save</span>
                      </Button>
                    </TooltipTrigger>
                  }
                />
                <TooltipContent>Add to your clique(s)</TooltipContent>
              </Tooltip>
            )}

          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  )
}
