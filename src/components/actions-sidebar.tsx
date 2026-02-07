"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowUp, MessageCircle, Share2 } from "lucide-react"

/**
 * Props for the ActionsSidebar component
 */
interface ActionsSidebarProps {
  /** Initial recommendation data with counts */
  recommendation: any
  /** Callback when comment count changes */
  onCommentCountChange?: (count: number) => void
}

/**
 * Client component for the sidebar actions.
 * 
 * Features:
 * - Displays upvote and comment counts
 * - Updates comment count from API when needed
 * - Listens for external comment updates
 * 
 * @param props - Component props
 * @returns Sidebar actions card
 */
export function ActionsSidebar({
  recommendation,
  onCommentCountChange,
}: ActionsSidebarProps) {
  const [commentCount, setCommentCount] = useState(recommendation._count.comments)
  const [upvoteCount, setUpvoteCount] = useState(recommendation._count.upvotes)

  /**
   * Update comment count from API
   */
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

  // Listen for comment updates from window events
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
          <Button variant="ghost" size="icon" className="flex flex-col h-auto py-2">
            <ArrowUp className="h-5 w-5" />
            <span className="text-xs mt-1">{upvoteCount}</span>
          </Button>
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
