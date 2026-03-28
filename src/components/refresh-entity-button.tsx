"use client"

import { useState, useEffect, useRef } from "react"
// useEffect is kept for the success-timer cleanup only
import { Button } from "@/components/ui/button"
import { RefreshCw, Loader2, CheckCircle2 } from "lucide-react"
import { REFRESH_EVENT } from "@/components/refreshable-entity-details"

/**
 * Payload returned by `POST /api/recommendations/[id]/refresh` and carried in
 * the `entity-data-refreshed` custom DOM event so that RefreshableEntityDetails
 * can apply targeted in-place updates without a full page reload.
 */
export interface RefreshResult {
  /** Names of the fields that were updated, e.g. `["name", "genre", "imageUrl"]` */
  updatedFields: string[]
  /** Updated entity sub-object containing movie or restaurant data */
  entity: any
  /** New hero image URL, or null when the external API returned no photo */
  imageUrl: string | null
}

/** How long the "Refreshed!" success state stays visible before reverting (ms) */
const SUCCESS_DISPLAY_DURATION = 2000

/**
 * Props for the RefreshEntityButton component
 */
interface RefreshEntityButtonProps {
  /** The recommendation object. Must include id and userId. */
  recommendation: { id: string; userId: string }
  /** Authenticated user ID resolved server-side. */
  currentUserId?: string | null
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
 * - Shows a green "Refreshed!" success state for 2 seconds after success
 * - Shows an error alert on API failure
 */
export function RefreshEntityButton({ recommendation, currentUserId }: RefreshEntityButtonProps) {
  const [refreshing, setRefreshing] = useState(false)
  const [succeeded, setSucceeded] = useState(false)
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (successTimerRef.current !== null) clearTimeout(successTimerRef.current)
    }
  }, [])

  const isOwner = !!currentUserId && currentUserId === recommendation.userId

  /**
   * Calls the refresh API endpoint, dispatches the `entity-data-refreshed` DOM
   * event with the result, and shows a brief success state on the button.
   */
  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const response = await fetch(`/api/recommendations/${recommendation.id}/refresh`, {
        method: "POST",
      })

      if (response.ok) {
        const result: RefreshResult = await response.json()
        document.dispatchEvent(new CustomEvent(REFRESH_EVENT, { detail: result }))
        setSucceeded(true)
        if (successTimerRef.current !== null) clearTimeout(successTimerRef.current)
        successTimerRef.current = setTimeout(() => {
          setSucceeded(false)
          successTimerRef.current = null
        }, SUCCESS_DISPLAY_DURATION)
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
      className={`w-full gap-2 transition-colors duration-300 ${
        succeeded
          ? "border-green-500 text-green-600 hover:text-green-600 hover:bg-green-50 dark:border-green-500 dark:text-green-400"
          : ""
      }`}
      size="lg"
      onClick={handleRefresh}
      disabled={refreshing || succeeded}
    >
      {refreshing ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Refreshing...
        </>
      ) : succeeded ? (
        <>
          <CheckCircle2 className="h-5 w-5" />
          Refreshed!
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
