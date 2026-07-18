"use client"

import dynamic from "next/dynamic"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  /** Visual layout for the trigger block. */
  layout?: "hero" | "sidebar" | "mobile-bar"
}

/**
 * Top-level trigger section for creating a new recommendation.
 *
 * Renders the primary "Add recommendation" entry point wired to {@link AddRecommendationDialog}.
 * Handles showing a login-required alert when an unauthenticated user attempts to open the flow.
 *
 * @param props - Component props.
 * @param props.userId - Optional authenticated user ID; forwarded to the dialog to avoid extra session lookups.
 * @returns The add recommendation trigger UI.
 */
export function AddRecommendationTrigger({
  userId,
  currentCliqueId,
  layout = "hero",
}: AddRecommendationTriggerProps) {
  const [showLoginAlert, setShowLoginAlert] = useState(false)
  const router = useRouter()
  const isSidebarLayout = layout === "sidebar"
  const isMobileBarLayout = layout === "mobile-bar"

  return (
    <div
      className={cn(
        "relative",
        isSidebarLayout
          ? "space-y-2"
          : isMobileBarLayout
            ? "flex flex-1"
            : "mt-8 flex min-h-20 flex-col items-center"
      )}
    >
      <div
        className={cn(
          isSidebarLayout
            ? "flex flex-col gap-2"
            : isMobileBarLayout
              ? "flex flex-1"
              : "flex flex-col gap-4 sm:flex-row"
        )}
      >
        <AddRecommendationDialog
          userId={userId}
          currentCliqueId={currentCliqueId}
          trigger={
            isMobileBarLayout ? (
              <button
                type="button"
                className="flex h-full w-full flex-col items-center justify-center gap-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                <Plus className="h-5 w-5" aria-hidden="true" />
                Add
              </button>
            ) : (
              <Button
                type="button"
                size={isSidebarLayout ? "sm" : "lg"}
                className={cn(isSidebarLayout && "w-full justify-start")}
              >
                <Plus className="h-4 w-4" />
                Add Recommendation
              </Button>
            )
          }
          onSuccess={() => router.refresh()}
          showLoginAlert={showLoginAlert}
          onDismissLoginAlert={() => setShowLoginAlert(false)}
          onBlockedOpen={() => setShowLoginAlert(true)}
        />
      </div>
      {showLoginAlert && (
        <div
          className={cn(
            "flex items-center justify-center rounded border border-red-300 bg-red-50 px-4 py-3 text-red-800 shadow-lg",
            isSidebarLayout
              ? "text-sm"
              : isMobileBarLayout
                ? "absolute bottom-full left-1/2 mb-2 w-max min-w-[280px] max-w-[90vw] -translate-x-1/2 text-sm"
                : "absolute left-1/2 top-full mt-2 min-w-[280px] max-w-[400px] -translate-x-1/2"
          )}
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
