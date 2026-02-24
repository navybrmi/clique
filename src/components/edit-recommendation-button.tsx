"use client"

import { Button } from "@/components/ui/button"
import { AddRecommendationDialog } from "@/components/add-recommendation-dialog"
import { Pencil } from "lucide-react"
import { useRouter } from "next/navigation"

/**
 * Props for the EditRecommendationButton component
 */
interface EditRecommendationButtonProps {
  /** The recommendation object to edit. Must include id and full entity details */
  recommendation: any
  /** Whether the current user is the owner of this recommendation */
  isOwner: boolean
}

/**
 * Button component for editing existing recommendations.
 *
 * Shows a disabled button for non-owners and an interactive edit dialog for the owner.
 *
 * @param props - Component props
 * @returns An edit button (disabled for non-owners, interactive for owner)
 */
export function EditRecommendationButton({ recommendation, isOwner }: EditRecommendationButtonProps) {
  const router = useRouter()

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
