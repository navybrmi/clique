"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { AddCommentForm } from "@/components/add-comment-form"
import {
  CommentCliquePrompt,
  type PromptClique,
} from "@/components/comment-clique-prompt"

/**
 * Props for the CommentsSection component
 */
interface CommentsSectionProps {
  /** The recommendation ID */
  recommendationId: string
  /** Initial comments to display (the active clique's thread, or empty) */
  initialComments: any[]
  /** Initial comment count for the active clique thread */
  initialCount: number
  /** Authenticated user ID resolved server-side. Used to show delete buttons on own comments. */
  currentUserId?: string | null
  /**
   * The active clique whose thread is shown. Non-null only in a valid clique
   * context (member + reco in clique); used to scope reads and posts.
   */
  cliqueId?: string | null
  /**
   * Whether the user can view/post in a thread here. True only in a valid clique
   * context. When false, a prompt to open the reco in a clique is shown instead.
   */
  canComment: boolean
  /** The user's cliques containing this reco — links shown when canComment is false. */
  userCliques?: PromptClique[]
}

/**
 * Client component for displaying and managing the clique-scoped comments section.
 *
 * Comments are exclusive per (recommendation, clique). When the page has a valid
 * clique context (`canComment`), this renders that clique's thread plus a post
 * form scoped to the clique. Otherwise it renders a prompt to open the reco
 * within one of the user's cliques (or to add it to a clique first).
 *
 * @param props - Component props
 * @returns Comments section with a clique-scoped thread, or a clique prompt
 */
export function CommentsSection({
  recommendationId,
  initialComments,
  initialCount,
  currentUserId,
  cliqueId,
  canComment,
  userCliques = [],
}: CommentsSectionProps) {
  const [comments, setComments] = useState(initialComments)
  const [count, setCount] = useState(initialCount)
  const [, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  /**
   * Fetch the active clique's fresh comment thread from the API.
   */
  const refreshComments = async () => {
    if (!cliqueId) return
    setLoading(true)
    try {
      const response = await fetch(
        `/api/recommendations/${recommendationId}?cliqueId=${cliqueId}`
      )
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

  // No valid clique context: comments are clique-scoped, so show a prompt to
  // open the reco within one of the user's cliques instead of a thread.
  if (!canComment) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <CommentCliquePrompt
            recommendationId={recommendationId}
            userCliques={userCliques}
          />
        </CardContent>
      </Card>
    )
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
              {currentUserId && currentUserId === comment.user.id && (
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
          userId={currentUserId}
          cliqueId={cliqueId}
        />
      </CardContent>
    </Card>
  )
}
