"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const AddRecommendationDialog = dynamic(
  /* istanbul ignore next */
  () =>
    import("@/components/add-recommendation-dialog").then(
      (m) => ({ default: m.AddRecommendationDialog })
    ),
  { ssr: false }
)

interface AddRecommendationTriggerProps {
  /** Authenticated user ID resolved server-side. Forwarded to the dialog to skip session fetches. */
  userId?: string | null
  /** Active clique context from the current feed URL, if any. */
  currentCliqueId?: string
}

/**
 * Top-level trigger section for creating a new recommendation.
 *
 * Renders the primary "Add recommendation" entry point wired to {@link AddRecommendationDialog}
 * and a secondary "Browse Categories" action. Handles showing a login-required alert when an
 * unauthenticated user attempts to open the add recommendation flow.
 *
 * @param props - Component props.
 * @param props.userId - Optional authenticated user ID; forwarded to the dialog to avoid extra session lookups.
 * @returns The add recommendation trigger UI.
 */
export function AddRecommendationTrigger({
  userId,
  currentCliqueId,
}: AddRecommendationTriggerProps) {
  const [showLoginAlert, setShowLoginAlert] = useState(false)
  const router = useRouter()

  return (
    <div className="mt-8 flex flex-col items-center relative" style={{ minHeight: 80 }}>
      <div className="flex gap-4">
        <AddRecommendationDialog
          userId={userId}
          currentCliqueId={currentCliqueId}
          onSuccess={() => router.refresh()}
          showLoginAlert={showLoginAlert}
          onDismissLoginAlert={() => setShowLoginAlert(false)}
          onBlockedOpen={() => setShowLoginAlert(true)}
        />
        <Button size="lg" variant="outline">
          Browse Categories
        </Button>
      </div>
      {showLoginAlert && (
        <div
          className="flex items-center justify-center rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800 shadow-lg"
          style={{
            position: "absolute",
            left: "50%",
            top: "100%",
            transform: "translateX(-50%)",
            minWidth: 280,
            maxWidth: 400,
            marginTop: 8,
            zIndex: 20,
          }}
        >
          <span className="mx-auto">You must be signed in to add a recommendation.</span>
          <button
            type="button"
            aria-label="Dismiss login alert"
            onClick={() => setShowLoginAlert(false)}
            className="ml-4 p-1 rounded hover:bg-red-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}
