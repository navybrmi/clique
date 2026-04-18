"use client"

import { useState } from "react"
import { ArrowUp } from "lucide-react"
import { cn } from "@/lib/utils"

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
  )
}
