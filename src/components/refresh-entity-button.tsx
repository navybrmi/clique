"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2 } from "lucide-react"
import { REFRESH_EVENT } from "@/components/refreshable-entity-details"

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
 * - Dispatches a custom `entity-data-refreshed` DOM event with the result so
 *   RefreshableEntityDetails can update in-place without a page reload
 * - Shows an error alert on API failure
 */
export function RefreshEntityButton({ recommendation }: RefreshEntityButtonProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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
        document.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: result }))
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
