"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export interface RefreshResult {
  updatedFields: string[]
  entity: any
  imageUrl: string | null
}

/**
 * Props for the RefreshEntityButton component
 */
interface RefreshEntityButtonProps {
  /** The recommendation object. Must include id and userId. */
  recommendation: { id: string; userId: string }
  /**
   * Optional callback invoked with the refreshed data after a successful API call.
   * When provided, the component does NOT call router.refresh() — the parent is
   * responsible for updating displayed data in-place (used in PR 3).
   * When omitted, router.refresh() is called to re-fetch server component data.
   */
  onRefresh?: (result: RefreshResult) => void
}

/**
 * Button component that re-fetches external data (TMDB / Google Places) for a
 * movie or restaurant recommendation and updates it in the database.
 *
 * Features:
 * - Visible to all viewers; active only for the recommendation owner
 * - Grayed out (disabled) for non-owners
 * - Shows a loading spinner while the refresh is in progress
 * - Disabled during loading to prevent double-clicks
 * - Calls onRefresh(result) if provided, otherwise triggers router.refresh()
 * - Shows an error alert on API failure
 */
export function RefreshEntityButton({ recommendation, onRefresh }: RefreshEntityButtonProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const isOwner = !loading && session?.user?.id === recommendation.userId

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}/refresh`, {
        method: "POST",
      })

      if (response.ok) {
        const result: RefreshResult = await response.json()
        if (onRefresh) {
          onRefresh(result)
        } else {
          router.refresh()
        }
      } else {
        const error = await response.json()
        alert(error.error || "Failed to refresh recommendation")
      }
    } catch {
      alert("Failed to refresh recommendation")
    } finally {
      setRefreshing(false)
    }
  }

  if (!isOwner) {
    return (
      <Button variant="outline" className="w-full gap-2" size="lg" disabled>
        <RefreshCw className="h-5 w-5" />
        Refresh
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      className="w-full gap-2"
      size="lg"
      onClick={handleRefresh}
      disabled={refreshing}
    >
      {refreshing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Refreshing...
        </>
      ) : (
        <>
          <RefreshCw className="h-5 w-5" />
          Refresh
        </>
      )}
    </Button>
  )
}
