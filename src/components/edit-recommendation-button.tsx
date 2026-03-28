"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { AddRecommendationDialog } from "@/components/add-recommendation-dialog"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Props for the EditRecommendationButton component
 */
interface EditRecommendationButtonProps {
  /** The recommendation object to edit. Must include id, userId, and full entity details */
  recommendation: any
  /** Authenticated user ID resolved server-side. */
  currentUserId?: string | null
}

/**
 * Button component for editing existing recommendations.
 * 
 * Only visible to the recommendation owner. Opens a dialog with pre-filled
 * form data for editing recommendation details.
 * 
 * Features:
 * - Owner-only access control
 * - Pre-populated edit form
 * - Auto-refresh after successful edit
 * - Loading state management
 * 
 * @param props - Component props
 * @returns An edit button with dialog for the owner, or a disabled edit button for non-owners
 */
export function EditRecommendationButton({ recommendation, currentUserId }: EditRecommendationButtonProps) {
  const router = useRouter()

  const isOwner = !!currentUserId && currentUserId === recommendation.userId

  if (!isOwner) {
    return (
      <Button variant="outline" className="w-full gap-2" size="lg" disabled>
        <Pencil className="h-5 w-5" />
        Edit
      </Button>
    )
  }

  return (
    <AddRecommendationDialog
      editMode={true}
      recommendationId={recommendation.id}
      initialData={recommendation}
      userId={currentUserId ?? undefined}
      onSuccess={() => {
        router.refresh()
      }}
      trigger={
        <Button variant="outline" className="w-full gap-2" size="lg">
          <Pencil className="h-5 w-5" />
          Edit
        </Button>
      }
    />
  )
}
