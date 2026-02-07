"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { AddCommentForm } from "@/components/add-comment-form"

/**
 * Props for the CommentsSection component
 */
interface CommentsSectionProps {
  /** The recommendation ID */
  recommendationId: string
  /** Initial comments to display */
  initialComments: any[]
  /** Initial comment count */
  initialCount: number
}

/**
 * Client component for displaying and managing comments section.
 * 
 * Features:
 * - Displays existing comments
 * - Auto-refreshes comments when new one is added
 * - Handles loading and error states
 * - Shows "no comments" placeholder
 * 
 * @param props - Component props
 * @returns Comments section with form
 */
export function CommentsSection({
  recommendationId,
  initialComments,
  initialCount,
}: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)
  const [session, setSession] = useState<any>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => setSession(data))
      .catch(() => setSession(null))
  }, [])

  /**
   * Fetch fresh comments from the API
   */
  const refreshComments = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/recommendations/${recommendationId}`)
      if (response.ok) {
        const data = await response.json()
        const newComments = data.comments || []
        const newCount = data._count?.comments || 0
        setComments(newComments)
        setCount(newCount)
        // Emit event to update sidebar
        window.dispatchEvent(
          new CustomEvent("commentUpdated", {
            detail: { count: newCount },
          })
        )
      }
    } catch (err) {
      console.error("Error refreshing comments:", err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Delete a comment owned by the current user
   */
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) {
      return
    }

    setDeletingId(commentId)
    try {
      const response = await fetch(
        `/api/recommendations/${recommendationId}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      )

      if (response.ok) {
        // Remove comment from local state
        setComments((prev) => prev.filter((c) => c.id !== commentId))
        const newCount = count - 1
        setCount(Math.max(0, newCount))
        // Emit event to update sidebar
        window.dispatchEvent(
          new CustomEvent("commentUpdated", {
            detail: { count: Math.max(0, newCount) },
          })
        )
      } else {
        const data = await response.json()
        alert(data.error || "Failed to delete comment")
      }
    } catch (err) {
      console.error("Error deleting comment:", err)
      alert("Failed to delete comment")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comments ({count})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 group">
              <Avatar className="h-8 w-8">
                <AvatarImage src={comment.user.image || undefined} />
                <AvatarFallback>{comment.user.name?.[0] || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">{comment.user.name || "Anonymous"}</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {comment.content}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </p>
              </div>
              {session?.user?.id === comment.user.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteComment(comment.id)}
                  disabled={deletingId === comment.id}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span className="sr-only">Delete comment</span>
                </Button>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-zinc-500 text-center py-4">No comments yet</p>
        )}
        <AddCommentForm
          recommendationId={recommendationId}
          onCommentAdded={refreshComments}
        />
      </CardContent>
    </Card>
  )
}
