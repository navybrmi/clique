"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

/**
 * Props for the AddCommentForm component
 */
interface AddCommentFormProps {
  /** The recommendation ID to add a comment to */
  recommendationId: string
  /** Callback function when comment is successfully added */
  onCommentAdded?: () => void
}

/**
 * Form component for adding comments to recommendations.
 * 
 * Features:
 * - Only visible to authenticated users
 * - Text validation (min 1, max 500 characters)
 * - Loading state during submission
 * - Error handling with user feedback
 * - Auto-refresh comments after successful submission
 * 
 * @param props - Component props
 * @returns A comment form for authenticated users, or null if not signed in
 */
export function AddCommentForm({ recommendationId, onCommentAdded }: AddCommentFormProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!comment.trim()) {
      setError("Comment cannot be empty")
      return
    }

    if (comment.length > 500) {
      setError("Comment must be 500 characters or less")
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/recommendations/${recommendationId}/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: comment.trim(),
        }),
      })

      if (response.ok) {
        setComment("")
        onCommentAdded?.()
      } else {
        const data = await response.json()
        setError(data.error || "Failed to add comment")
      }
    } catch (err) {
      console.error("Error adding comment:", err)
      setError("Failed to add comment")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return null
  }

  if (!session?.user) {
    return (
      <div className="pt-4 border-t">
        <p className="text-sm text-zinc-500 text-center">Sign in to add a comment</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="pt-4 border-t space-y-3">
      <Textarea
        placeholder="Add a comment..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        disabled={submitting}
        rows={3}
        className="resize-none"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setComment("")
            setError(null)
          }}
          disabled={submitting || !comment.trim()}
        >
          Clear
        </Button>
        <Button type="submit" disabled={submitting || !comment.trim()}>
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Posting...
            </>
          ) : (
            "Post Comment"
          )}
        </Button>
      </div>
    </form>
  )
}
