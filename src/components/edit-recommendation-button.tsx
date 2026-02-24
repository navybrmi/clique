"use client"

import { useState, useEffect } from "react"
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
 * @returns An edit button with dialog, or null if user is not the owner
 */
export function EditRecommendationButton({ recommendation }: EditRecommendationButtonProps) {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const isOwner = !loading && session?.user?.id === recommendation.userId

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
