"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

const AddRecommendationDialog = dynamic(
  () =>
    import("@/components/add-recommendation-dialog").then(
      (m) => ({ default: m.AddRecommendationDialog })
    ),
  { ssr: false }
)

interface AddRecommendationTriggerProps {
  /** Authenticated user ID resolved server-side. Forwarded to the dialog to skip session fetches. */
  userId?: string | null
}

export function AddRecommendationTrigger({ userId }: AddRecommendationTriggerProps) {
  const [showLoginAlert, setShowLoginAlert] = useState(false)
  const router = useRouter()

  return (
    <div className="mt-8 flex flex-col items-center relative" style={{ minHeight: 80 }}>
      <div className="flex gap-4">
        <AddRecommendationDialog
          userId={userId}
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
